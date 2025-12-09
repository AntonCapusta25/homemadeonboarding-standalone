import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  type: 'abandonment' | 'welcome' | 'new_signup';
  chefName: string;
  email: string;
  phone?: string;
  city?: string;
  businessName?: string;
  cuisines?: string[];
  plan?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: NotificationEmailRequest = await req.json();
    const { type, chefName, email, phone, city, businessName, cuisines, plan } = request;

    let subject = "";
    let htmlContent = "";
    let toEmail = "";

    if (type === 'abandonment') {
      // Send to admin about abandoned onboarding
      toEmail = "chefs@homemade-meals.net";
      subject = `⚠️ URGENT: ${chefName} did not finish onboarding`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e74c3c;">⚠️ Onboarding Abandoned</h1>
          <p style="font-size: 16px; color: #333;">
            <strong>${chefName}</strong> has stopped their onboarding process.
          </p>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Contact Details:</h3>
            <p><strong>Name:</strong> ${chefName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            <p><strong>City:</strong> ${city || 'Not provided'}</p>
          </div>
          <p style="color: #e74c3c; font-weight: bold; font-size: 18px;">
            Please call them as soon as possible!
          </p>
        </div>
      `;
    } else if (type === 'welcome') {
      // Send welcome email to the chef
      toEmail = email;
      subject = `Welcome to Homemade! 🎉`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f97316;">Welcome to Homemade, ${chefName}! 🎉</h1>
          <p style="font-size: 16px; color: #333;">
            Congratulations on completing your chef profile! We're thrilled to have you join the Homemade platform.
          </p>
          <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fed7aa;">
            <h3 style="margin-top: 0; color: #c2410c;">What's Next?</h3>
            <ul style="color: #333;">
              <li>Complete your verification steps to speed up approval</li>
              <li>Review and customize your menu</li>
              <li>Complete the food safety training</li>
              <li>Upload your ID for verification</li>
            </ul>
          </div>
          <p style="font-size: 16px; color: #333;">
            Our team will review your profile soon. In the meantime, complete the verification steps to get approved faster!
          </p>
          <p style="color: #666;">
            Best regards,<br>
            The Homemade Team
          </p>
        </div>
      `;
    } else if (type === 'new_signup') {
      // Send to admin about new chef signup
      toEmail = "chefs@homemade-meals.net";
      subject = `🎉 New Chef Signup: ${businessName || chefName}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #22c55e;">🎉 New Chef Signed Up!</h1>
          <p style="font-size: 16px; color: #333;">
            A new chef has completed their profile and is waiting for approval.
          </p>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
            <h3 style="margin-top: 0; color: #166534;">Chef Details:</h3>
            <p><strong>Name:</strong> ${chefName}</p>
            <p><strong>Business Name:</strong> ${businessName || 'Not set'}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            <p><strong>City:</strong> ${city || 'Not provided'}</p>
            <p><strong>Cuisines:</strong> ${cuisines?.join(', ') || 'Not specified'}</p>
            <p><strong>Selected Plan:</strong> ${plan || 'Starter'}</p>
          </div>
          <p style="font-size: 16px; color: #333;">
            Please review their profile and reach out to complete their verification.
          </p>
        </div>
      `;
    }

    if (!toEmail) {
      throw new Error('Invalid notification type');
    }

    console.log(`Sending ${type} email to: ${toEmail}`);

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: toEmail }] }],
        from: { email: "info@homemademeals.net", name: "Homemade" },
        subject,
        content: [{ type: "text/html", value: htmlContent }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SendGrid error:", errorText);
      throw new Error(`SendGrid API error: ${response.status}`);
    }

    console.log(`${type} email sent successfully to ${toEmail}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
