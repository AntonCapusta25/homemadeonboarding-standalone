import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAccountRequest {
  email: string;
  phone?: string;
  chefName?: string;
  businessName?: string;
  pendingProfileId?: string;
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

    const { email, phone, chefName, businessName, pendingProfileId }: CreateAccountRequest = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Auto-creating account for email: ${email}`);

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error checking existing users:", listError);
      throw listError;
    }

    const existingUser = existingUsers.users.find(u => u.email === email);
    
    if (existingUser) {
      // User already exists - check if they have a chef_profile
      console.log(`User already exists: ${email}, checking chef_profile`);
      
      const { data: existingProfile } = await supabaseAdmin
        .from("chef_profiles")
        .select("id")
        .eq("user_id", existingUser.id)
        .maybeSingle();

      // If no chef_profile exists, create one
      if (!existingProfile) {
        console.log(`Creating missing chef_profile for existing user: ${existingUser.id}`);
        
        // Try to get data from pending_profile if available
        let profileData: any = {
          user_id: existingUser.id,
          contact_email: email,
          contact_phone: phone,
          chef_name: chefName,
          business_name: businessName,
          onboarding_completed: false,
        };

        if (pendingProfileId) {
          const { data: pendingProfile } = await supabaseAdmin
            .from("pending_profiles")
            .select("*")
            .eq("id", pendingProfileId)
            .maybeSingle();

          if (pendingProfile) {
            profileData = {
              user_id: existingUser.id,
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
              onboarding_completed: false,
            };
          }
        }

        const { error: profileError } = await supabaseAdmin
          .from("chef_profiles")
          .insert(profileData);

        if (profileError) {
          console.error("Error creating chef_profile for existing user:", profileError);
        } else {
          console.log(`Chef profile created for existing user: ${existingUser.id}`);
        }
      }
      
      // Generate a magic link for the user
      const productionUrl = "https://signup.homemadechefs.com";
      const redirectTo = `${productionUrl}/onboarding`;
      
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo,
        },
      });

      if (linkError) {
        console.error("Error generating link:", linkError);
        throw linkError;
      }

      // Extract the token from the link
      const url = new URL(linkData.properties.action_link);
      const token = url.searchParams.get('token');
      const type = url.searchParams.get('type');

      // Build the magic link URL
      const magicLinkUrl = linkData.properties?.action_link?.replace(
        /https:\/\/[^\/]+/,
        Deno.env.get("SUPABASE_URL") ?? ""
      ) || "";

      // Send custom magic link email using SendGrid
      const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
      if (SENDGRID_API_KEY && magicLinkUrl) {
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Login Link - Homemade</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #FFF8F5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #C65D3B; font-size: 28px; margin: 0 0 8px;">🏠 Homemade Chef</h1>
                <p style="color: #666; font-size: 14px; margin: 0;">Your login link</p>
              </div>
              
              <h2 style="color: #333; font-size: 24px; margin: 0 0 16px; text-align: center;">
                Hi${chefName ? ` ${chefName}` : ""}! 👋
              </h2>
              
              <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Here's your magic link to access your Homemade Chef account. Click the button below to log in and continue your onboarding.
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${magicLinkUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #C65D3B 0%, #E07B5B 100%); color: white; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 50px; text-decoration: none; box-shadow: 0 4px 16px rgba(198, 93, 59, 0.3);">
                  ✨ Log In to Your Account
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
                © ${new Date().getFullYear()} Homemade Chef. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SENDGRID_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }] }],
            from: { email: "chefs@homemademeals.net", name: "Homemade Chef" },
            subject: `Your login link - Homemade 🏠`,
            content: [{ type: "text/html", value: emailHtml }],
            // Disable click tracking so auth links aren't rewritten to url*.homemademeals.net
            tracking_settings: {
              click_tracking: { enable: false, enable_text: false },
              open_tracking: { enable: true },
            },
          }),
        }).then(res => {
          if (!res.ok) console.error("SendGrid error sending magic link email");
          else console.log(`Magic link email sent to: ${email}`);
        }).catch(err => console.error("Failed to send magic link email:", err));
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          isNewUser: false,
          userId: existingUser.id,
          verifyToken: token,
          tokenType: type,
          message: "User already exists, session token generated" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new user with auto-confirm enabled
    console.log(`Creating new user for: ${email}`);
    
    // Generate a temporary password for the user
    const tempPassword = crypto.randomUUID();
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        chef_name: chefName,
        business_name: businessName,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw createError;
    }

    console.log(`User created with ID: ${newUser.user.id}`);

    // Create chef_profile for the new user
    let profileData: any = {
      user_id: newUser.user.id,
      contact_email: email,
      contact_phone: phone,
      chef_name: chefName,
      business_name: businessName,
      onboarding_completed: false,
    };

    // Try to get more data from pending_profile if available
    if (pendingProfileId) {
      const { data: pendingProfile } = await supabaseAdmin
        .from("pending_profiles")
        .select("*")
        .eq("id", pendingProfileId)
        .maybeSingle();

      if (pendingProfile) {
        profileData = {
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
          onboarding_completed: false,
        };
      }
    }

    const { error: profileError } = await supabaseAdmin
      .from("chef_profiles")
      .insert(profileData);

    if (profileError) {
      console.error("Error creating chef_profile:", profileError);
      // Don't fail the whole operation, just log the error
    } else {
      console.log(`Chef profile created for new user: ${newUser.user.id}`);
    }

    // Generate a magic link for auto-login
    const productionUrl = "https://signup.homemadechefs.com";
    const redirectTo = `${productionUrl}/onboarding`;
    
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo,
      },
    });

    if (linkError) {
      console.error("Error generating link:", linkError);
      throw linkError;
    }

    // Extract the token from the link
    const url = new URL(linkData.properties.action_link);
    const token = url.searchParams.get('token');
    const type = url.searchParams.get('type');

    // Build the magic link URL
    const magicLinkUrl = linkData.properties?.action_link?.replace(
      /https:\/\/[^\/]+/,
      Deno.env.get("SUPABASE_URL") ?? ""
    ) || "";

    // Send custom magic link email using SendGrid
    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    if (SENDGRID_API_KEY && magicLinkUrl) {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Homemade!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #FFF8F5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #C65D3B; font-size: 28px; margin: 0 0 8px;">🏠 Homemade Chef</h1>
                <p style="color: #666; font-size: 14px; margin: 0;">Welcome aboard!</p>
              </div>
              
              <h2 style="color: #333; font-size: 24px; margin: 0 0 16px; text-align: center;">
                Hi${chefName ? ` ${chefName}` : ""}! 🎉
              </h2>
              
              <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Your Homemade Chef account has been created! Save this email - you can use the button below anytime to log back in and continue where you left off.
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${magicLinkUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #C65D3B 0%, #E07B5B 100%); color: white; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 50px; text-decoration: none; box-shadow: 0 4px 16px rgba(198, 93, 59, 0.3);">
                  ✨ Log In to Your Account
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
                  This link will expire in 24 hours. You can always request a new one by entering your email in the app.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FFF8F5; padding: 20px 40px; border-radius: 0 0 16px 16px;">
              <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
                © ${new Date().getFullYear()} Homemade Chef. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }] }],
            from: { email: "chefs@homemademeals.net", name: "Homemade Chef" },
            subject: `Welcome to Homemade! Here's your login link 🏠`,
            content: [{ type: "text/html", value: emailHtml }],
            // Disable click tracking so auth links aren't rewritten to url*.homemademeals.net
            tracking_settings: {
              click_tracking: { enable: false, enable_text: false },
              open_tracking: { enable: true },
            },
          }),
      }).then(res => {
        if (!res.ok) console.error("SendGrid error sending welcome email");
        else console.log(`Welcome email with magic link sent to: ${email}`);
      }).catch(err => console.error("Failed to send welcome email:", err));
    }

    console.log(`Account auto-created successfully for: ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        isNewUser: true,
        userId: newUser.user.id,
        verifyToken: token,
        tokenType: type,
        message: "Account created and verified" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in auto-create-account:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
