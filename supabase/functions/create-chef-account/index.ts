import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAccountRequest {
  email: string;
  pendingProfileId: string;
  redirectTo: string;
}

async function sendMagicLinkEmail(
  email: string,
  chefName: string,
  businessName: string,
  magicLinkUrl: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<void> {
  const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
  
  if (!SENDGRID_API_KEY) {
    console.log("SendGrid not configured, falling back to Supabase email");
    return;
  }

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Home-Made-Chef</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #FFF8F5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #C65D3B; font-size: 28px; margin: 0 0 8px;">🍳 Home-Made-Chef</h1>
                <p style="color: #666; font-size: 14px; margin: 0;">Start your culinary journey</p>
              </div>
              
              <h2 style="color: #333; font-size: 24px; margin: 0 0 16px; text-align: center;">
                Welcome${chefName ? `, ${chefName}` : ''}! 🎉
              </h2>
              
              <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ${businessName ? `Your restaurant <strong>${businessName}</strong> is almost ready!` : 'Your account is almost ready!'} 
                Click the button below to verify your email and access your dashboard.
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${magicLinkUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #C65D3B 0%, #E07B5B 100%); color: white; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 50px; text-decoration: none; box-shadow: 0 4px 16px rgba(198, 93, 59, 0.3);">
                  ✨ Access Your Dashboard
                </a>
              </div>
              
              <p style="color: #888; font-size: 14px; line-height: 1.6; margin: 0 0 20px; text-align: center;">
                Or copy and paste this link into your browser:
              </p>
              <p style="background-color: #f5f5f5; padding: 12px 16px; border-radius: 8px; font-size: 12px; word-break: break-all; color: #666;">
                ${magicLinkUrl}
              </p>
              
              <div style="border-top: 1px solid #eee; margin-top: 32px; padding-top: 24px;">
                <p style="color: #888; font-size: 13px; line-height: 1.5; margin: 0; text-align: center;">
                  This link will expire in 24 hours. If you didn't request this email, you can safely ignore it.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FFF8F5; padding: 20px 40px; border-radius: 0 0 16px 16px;">
              <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
                © ${new Date().getFullYear()} Home-Made-Chef. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: "info@homemademeals.net", name: "Home-Made-Chef" },
      subject: `Welcome to Home-Made-Chef${businessName ? ` - ${businessName}` : ''} 🍳`,
      content: [{ type: "text/html", value: emailHtml }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("SendGrid error:", response.status, errorText);
    throw new Error(`SendGrid error: ${response.status}`);
  }

  console.log(`Magic link email sent via SendGrid to: ${email}`);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, pendingProfileId, redirectTo }: CreateAccountRequest = await req.json();
    
    if (!email || !pendingProfileId) {
      return new Response(
        JSON.stringify({ error: "Email and pendingProfileId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing account creation for email: ${email}`);

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error checking existing users:", listError);
      throw listError;
    }

    const existingUser = existingUsers.users.find(u => u.email === email);
    
    // Fetch pending profile data (needed for email personalization)
    const { data: pendingProfile, error: profileError } = await supabaseAdmin
      .from("pending_profiles")
      .select("*")
      .eq("id", pendingProfileId)
      .single();

    if (profileError || !pendingProfile) {
      console.error("Error fetching pending profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Pending profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (existingUser) {
      // User exists - generate magic link for login
      console.log(`User exists, generating login magic link for: ${email}`);
      
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: 'https://chef-craft-flow.lovable.app/summary',
        },
      });

      if (linkError) {
        console.error("Error generating magic link:", linkError);
        throw linkError;
      }

      // Replace preview URL with production URL in magic link
      const productionUrl = 'https://chef-craft-flow.lovable.app';
      let magicLinkUrl = linkData.properties.action_link;
      magicLinkUrl = magicLinkUrl.replace(/https:\/\/[a-z0-9-]+\.lovable\.app/gi, productionUrl);
      magicLinkUrl = magicLinkUrl.replace(/https:\/\/[a-z0-9-]+\.lovableproject\.com/gi, productionUrl);

      console.log(`Generated magic link redirecting to: ${productionUrl}`);

      // Send via SendGrid
      try {
        await sendMagicLinkEmail(
          email,
          pendingProfile.chef_name || '',
          pendingProfile.business_name || '',
          magicLinkUrl,
          supabaseUrl,
          serviceRoleKey
        );
      } catch (sendError) {
        console.error("SendGrid failed, falling back to Supabase:", sendError);
        // Fallback to Supabase OTP
        await supabaseAdmin.auth.signInWithOtp({
          email: email,
          options: { emailRedirectTo: redirectTo },
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          isNewUser: false,
          message: "Magic link sent to existing user" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new user
    console.log(`Creating new user for: ${email}`);
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      email_confirm: false,
      user_metadata: {
        chef_name: pendingProfile.chef_name,
        business_name: pendingProfile.business_name,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw createError;
    }

    console.log(`User created with ID: ${newUser.user.id}`);

    // Create chef profile linked to the new user
    const { error: chefProfileError } = await supabaseAdmin
      .from("chef_profiles")
      .insert({
        user_id: newUser.user.id,
        contact_email: pendingProfile.email,
        contact_phone: pendingProfile.phone,
        chef_name: pendingProfile.chef_name,
        business_name: pendingProfile.business_name,
        city: pendingProfile.city,
        address: pendingProfile.address,
        cuisines: pendingProfile.cuisines,
        dish_types: pendingProfile.dish_types,
        availability: pendingProfile.availability,
        service_type: pendingProfile.service_type,
        food_safety_status: pendingProfile.food_safety_status,
        kvk_status: pendingProfile.kvk_status,
        plan: pendingProfile.plan,
        logo_url: pendingProfile.logo_url,
        onboarding_completed: true,
      });

    if (chefProfileError) {
      console.error("Error creating chef profile:", chefProfileError);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw chefProfileError;
    }

    // Generate magic link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: 'https://chef-craft-flow.lovable.app/summary',
      },
    });

    if (linkError) {
      console.error("Error generating magic link:", linkError);
      throw linkError;
    }

    // Replace preview URL with production URL in magic link
    const productionUrl = 'https://chef-craft-flow.lovable.app';
    let magicLinkUrl = linkData.properties.action_link;
    // Replace any lovable preview/project URLs with production URL
    magicLinkUrl = magicLinkUrl.replace(/https:\/\/[a-z0-9-]+\.lovable\.app/gi, productionUrl);
    magicLinkUrl = magicLinkUrl.replace(/https:\/\/[a-z0-9-]+\.lovableproject\.com/gi, productionUrl);

    console.log(`Generated magic link redirecting to: ${productionUrl}`);

    // Send via SendGrid
    try {
      await sendMagicLinkEmail(
        email,
        pendingProfile.chef_name || '',
        pendingProfile.business_name || '',
        magicLinkUrl,
        supabaseUrl,
        serviceRoleKey
      );
    } catch (sendError) {
      console.error("SendGrid failed, falling back to Supabase:", sendError);
      // Fallback to Supabase OTP
      await supabaseAdmin.auth.signInWithOtp({
        email: email,
        options: { emailRedirectTo: redirectTo },
      });
    }

    // Delete the pending profile
    await supabaseAdmin
      .from("pending_profiles")
      .delete()
      .eq("id", pendingProfileId);

    console.log(`Account creation complete for: ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        isNewUser: true,
        message: "Account created and magic link sent" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in create-chef-account:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
