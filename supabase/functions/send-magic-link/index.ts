import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendMagicLinkRequest {
  email: string;
  chefName: string;
  businessName: string;
  magicLinkUrl: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    if (!SENDGRID_API_KEY) {
      throw new Error("SENDGRID_API_KEY is not configured");
    }

    const { email, chefName, businessName, magicLinkUrl }: SendMagicLinkRequest = await req.json();

    if (!email || !magicLinkUrl) {
      return new Response(
        JSON.stringify({ error: "Email and magicLinkUrl are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending magic link email to: ${email}`);

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
        from: { email: "noreply@homemade-chef.com", name: "Home-Made-Chef" },
        subject: `Welcome to Home-Made-Chef${businessName ? ` - ${businessName}` : ''} 🍳`,
        content: [
          { type: "text/html", value: emailHtml }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SendGrid error:", response.status, errorText);
      throw new Error(`SendGrid error: ${response.status}`);
    }

    console.log(`Magic link email sent successfully to: ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error sending magic link email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
