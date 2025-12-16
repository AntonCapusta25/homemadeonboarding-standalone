import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendVerificationRequest {
  email: string;
  redirectTo?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirectTo }: SendVerificationRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`Checking for existing profile with email: ${email}`);

    // Check if this email exists in pending_profiles or chef_profiles
    const { data: pendingProfile } = await supabaseAdmin
      .from("pending_profiles")
      .select("id, chef_name, business_name")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    const { data: chefProfile } = await supabaseAdmin
      .from("chef_profiles")
      .select("id, chef_name, business_name, user_id")
      .eq("contact_email", email.toLowerCase().trim())
      .maybeSingle();

    if (!pendingProfile && !chefProfile) {
      return new Response(
        JSON.stringify({ found: false, message: "No existing profile found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chefName = pendingProfile?.chef_name || chefProfile?.chef_name || "";
    const businessName = pendingProfile?.business_name || chefProfile?.business_name || "";

    console.log(`Found existing profile for: ${email}, sending verification link`);

    // Check if user already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase().trim()
    );

    let magicLinkUrl: string;
    const productionUrl = "https://chef-craft-flow.lovable.app";
    const finalRedirectTo = redirectTo || `${productionUrl}/onboarding?verified=true`;

    if (existingUser) {
      // Generate magic link for existing user
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: email.toLowerCase().trim(),
        options: {
          redirectTo: finalRedirectTo,
        },
      });

      if (linkError) {
        console.error("Error generating magic link:", linkError);
        return new Response(
          JSON.stringify({ error: "Failed to generate verification link" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build the magic link URL with production domain
      const tokenHash = linkData.properties?.hashed_token;
      magicLinkUrl = `${productionUrl}/auth/v1/verify?token=${tokenHash}&type=magiclink&redirect_to=${encodeURIComponent(finalRedirectTo)}`;
      
      // Actually use the action_link but replace domain
      magicLinkUrl = linkData.properties?.action_link?.replace(
        /https:\/\/[^\/]+/,
        Deno.env.get("SUPABASE_URL") ?? ""
      ) || magicLinkUrl;
    } else {
      // Create user and generate magic link
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        email_confirm: false,
      });

      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create user account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate magic link for new user
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: email.toLowerCase().trim(),
        options: {
          redirectTo: finalRedirectTo,
        },
      });

      if (linkError) {
        console.error("Error generating magic link:", linkError);
        return new Response(
          JSON.stringify({ error: "Failed to generate verification link" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      magicLinkUrl = linkData.properties?.action_link?.replace(
        /https:\/\/[^\/]+/,
        Deno.env.get("SUPABASE_URL") ?? ""
      ) || "";
    }

    // Send the magic link email using SendGrid
    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    
    if (SENDGRID_API_KEY) {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Homemade</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #FFF8F5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #C65D3B; font-size: 28px; margin: 0 0 8px;">🔐 Homemade Chef</h1>
                <p style="color: #666; font-size: 14px; margin: 0;">Verify your identity</p>
              </div>
              
              <h2 style="color: #333; font-size: 24px; margin: 0 0 16px; text-align: center;">
                Welcome back${chefName ? `, ${chefName}` : ""}! 👋
              </h2>
              
              <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                We found your existing profile${businessName ? ` for <strong>${businessName}</strong>` : ""}. 
                For security, please verify your email to continue where you left off.
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${magicLinkUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #C65D3B 0%, #E07B5B 100%); color: white; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 50px; text-decoration: none; box-shadow: 0 4px 16px rgba(198, 93, 59, 0.3);">
                  ✨ Verify & Continue
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

      const sendgridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: email.toLowerCase().trim() }] }],
          from: { email: "chefs@homemademeals.net", name: "Homemade Chef" },
          subject: `Verify your email to continue - Homemade 🔐`,
          content: [{ type: "text/html", value: emailHtml }],
        }),
      });

      if (!sendgridResponse.ok) {
        console.error("SendGrid error:", await sendgridResponse.text());
      } else {
        console.log(`Verification email sent successfully to: ${email}`);
      }
    }

    return new Response(
      JSON.stringify({
        found: true,
        sent: true,
        message: "Verification link sent to your email",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-verification-link:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
