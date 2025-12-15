import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Find chefs who skipped food safety 3+ days ago and haven't been sent a followup
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: verifications, error: fetchError } = await supabase
      .from('chef_verification')
      .select(`
        id,
        chef_profile_id,
        food_safety_skipped_at,
        food_safety_followup_sent,
        food_safety_viewed,
        chef_profiles!inner (
          id,
          contact_email,
          chef_name,
          business_name
        )
      `)
      .not('food_safety_skipped_at', 'is', null)
      .eq('food_safety_followup_sent', false)
      .eq('food_safety_viewed', false)
      .lt('food_safety_skipped_at', threeDaysAgo.toISOString());

    if (fetchError) {
      console.error('Error fetching verifications:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${verifications?.length || 0} chefs needing food safety follow-up`);

    let sentCount = 0;
    for (const verification of verifications || []) {
      const chefProfile = (verification as any).chef_profiles;
      const email = chefProfile?.contact_email;
      const chefName = chefProfile?.chef_name || chefProfile?.business_name || 'Chef';

      if (!email) {
        console.log(`Skipping verification ${verification.id} - no email found`);
        continue;
      }

      // Send follow-up email
      const subject = `Reminder: Complete your Food Safety Training to get approved! ⏰`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f97316;">Hi ${chefName}! 👋</h1>
          <p style="font-size: 16px; color: #333;">
            This is a friendly reminder that your food safety training is still waiting to be completed.
          </p>
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcd34d;">
            <h3 style="margin-top: 0; color: #92400e;">⚠️ Action Required</h3>
            <p style="color: #333; margin-bottom: 0;">
              Complete your food safety training to get approved and start earning on Homemade!
            </p>
          </div>
          <p style="font-size: 16px; color: #333;">
            The training only takes about 30 minutes. Watch 3 short videos and complete a simple quiz.
          </p>
          <p style="font-size: 16px; color: #333;">
            Need help? Reply to this email or contact us anytime!
          </p>
          <p style="color: #666;">
            Best regards,<br>
            The Homemade Team
          </p>
        </div>
      `;

      try {
        const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SENDGRID_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }] }],
            from: { email: "chefs@homemademeals.net", name: "Homemade" },
            subject,
            content: [{ type: "text/html", value: htmlContent }],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`SendGrid error for ${email}:`, errorText);
          continue;
        }

        // Mark as sent
        await supabase
          .from('chef_verification')
          .update({ food_safety_followup_sent: true })
          .eq('id', verification.id);

        console.log(`Sent 3-day follow-up to ${email}`);
        sentCount++;
      } catch (emailError) {
        console.error(`Error sending email to ${email}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${sentCount} food safety follow-up emails` 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in food-safety-followup-cron:", error);
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
