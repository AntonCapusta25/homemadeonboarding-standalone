import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-forwarded-for",
};

interface SendVerificationRequest {
  email: string;
  redirectTo?: string;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_EMAIL = 3; // Max 3 requests per email per minute
const MAX_REQUESTS_PER_IP = 10; // Max 10 requests per IP per minute

// In-memory rate limit stores (reset on function cold start)
const emailRateLimits = new Map<string, { count: number; resetAt: number }>();
const ipRateLimits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string, store: Map<string, { count: number; resetAt: number }>, maxRequests: number): boolean {
  const now = Date.now();
  const record = store.get(key);
  
  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  if (record.count >= maxRequests) {
    return true;
  }
  
  record.count++;
  return false;
}

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
         req.headers.get("x-real-ip") ||
         "unknown";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = getClientIp(req);
    
    // Check IP rate limit first
    if (isRateLimited(clientIp, ipRateLimits, MAX_REQUESTS_PER_IP)) {
      console.warn(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
      );
    }

    const { email, redirectTo }: SendVerificationRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    // Check email-specific rate limit
    if (isRateLimited(normalizedEmail, emailRateLimits, MAX_REQUESTS_PER_EMAIL)) {
      console.warn(`Rate limit exceeded for email: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ error: "Too many verification requests for this email. Please check your inbox or try again in a minute." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`Checking for existing profile with email: ${normalizedEmail}`);

    // Check if this email exists in pending_profiles or chef_profiles
    const { data: pendingProfile } = await supabaseAdmin
      .from("pending_profiles")
      .select("id, chef_name, business_name")
      .eq("email", normalizedEmail)
      .maybeSingle();

    const { data: chefProfile } = await supabaseAdmin
      .from("chef_profiles")
      .select("id, chef_name, business_name, user_id")
      .eq("contact_email", normalizedEmail)
      .maybeSingle();

    if (!pendingProfile && !chefProfile) {
      return new Response(
        JSON.stringify({ found: false, message: "No existing profile found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chefName = pendingProfile?.chef_name || chefProfile?.chef_name || "";
    const businessName = pendingProfile?.business_name || chefProfile?.business_name || "";

    console.log(`Found existing profile for: ${normalizedEmail}, sending verification link`);

    // Check if user already exists in auth (use direct lookup to avoid pagination issues)
    let existingUser: { email?: string | null } | null = null;

    try {
      // @ts-ignore - available in supabase-js v2
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(normalizedEmail);
      if (userError) {
        console.warn("getUserByEmail error:", userError);
      }
      existingUser = (userData as any)?.user ?? null;
    } catch (e) {
      console.warn("getUserByEmail not available, falling back to listUsers")
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      existingUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail) ?? null;
    }

    let magicLinkUrl: string;
    const productionUrl = "https://chef-craft-flow.lovable.app";
    const finalRedirectTo = redirectTo || `${productionUrl}/onboarding?verified=true`;

    if (existingUser) {
      // Generate magic link for existing user
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: normalizedEmail,
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
      // No auth user exists - just return found status without creating account
      // The account will be created when they complete onboarding via auto-create-account
      console.log(`Profile found but no auth user for: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ 
          found: true, 
          sent: false, 
          noAuthUser: true,
          message: "Profile found but no account yet. Continue onboarding to create your account." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
          personalizations: [{ to: [{ email: normalizedEmail }] }],
          from: { email: "chefs@homemademeals.net", name: "Homemade Chef" },
          subject: `Verify your email to continue - Homemade 🔐`,
          content: [{ type: "text/html", value: emailHtml }],
        }),
      });

      if (!sendgridResponse.ok) {
        const sendgridText = await sendgridResponse.text();
        console.error("SendGrid error:", sendgridText);
        return new Response(
          JSON.stringify({
            found: true,
            sent: false,
            error: "Failed to send email. Please try again.",
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Verification email sent successfully to: ${normalizedEmail}`);

      return new Response(
        JSON.stringify({
          found: true,
          sent: true,
          message: "Verification link sent to your email",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If SendGrid isn't configured, return a clear error so we don't silently "succeed"
    return new Response(
      JSON.stringify({
        found: true,
        sent: false,
        error: "Email service is not configured",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-verification-link:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
