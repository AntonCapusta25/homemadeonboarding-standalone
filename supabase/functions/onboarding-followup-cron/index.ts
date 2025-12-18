import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Define onboarding tasks with their display names
const ONBOARDING_TASKS = [
  { key: 'city', name: 'City', check: (p: any) => !!p.city },
  { key: 'cuisines', name: 'Cuisines', check: (p: any) => (p.cuisines?.length || 0) > 0 },
  { key: 'contact', name: 'Contact Info', check: (p: any) => !!p.contact_email && !!p.contact_phone },
  { key: 'address', name: 'Address', check: (p: any) => !!p.address },
  { key: 'business_name', name: 'Business Name', check: (p: any) => !!p.business_name },
  { key: 'logo', name: 'Logo', check: (p: any) => !!p.logo_url },
  { key: 'service_type', name: 'Service Type', check: (p: any) => !!p.service_type && p.service_type !== 'unsure' },
  { key: 'availability', name: 'Availability', check: (p: any) => (p.availability?.length || 0) > 0 },
  { key: 'dish_types', name: 'Dish Types', check: (p: any) => (p.dish_types?.length || 0) > 0 },
  { key: 'food_safety', name: 'Food Safety', check: (p: any) => !!p.food_safety_status },
  { key: 'kvk', name: 'KVK Status', check: (p: any) => !!p.kvk_status },
  { key: 'plan', name: 'Plan', check: (p: any) => !!p.plan },
];

function getIncompleteTasks(profile: any): string[] {
  return ONBOARDING_TASKS
    .filter(task => !task.check(profile))
    .map(task => task.name);
}

function calculateProgress(profile: any): number {
  const completed = ONBOARDING_TASKS.filter(task => task.check(profile)).length;
  return Math.round((completed / ONBOARDING_TASKS.length) * 100);
}

async function generateMagicLink(supabase: any, email: string): Promise<string | null> {
  const productionUrl = "https://signup.homemadechefs.com";
  
  try {
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email,
      options: {
        redirectTo: `${productionUrl}/onboarding`,
      },
    });

    if (linkError) {
      console.error("Error generating magic link:", linkError);
      return null;
    }

    return linkData.properties?.action_link || null;
  } catch (error) {
    console.error("Error generating magic link:", error);
    return null;
  }
}

function generateEmailHtml(
  chefName: string, 
  businessName: string | null, 
  incompleteTasks: string[], 
  progress: number,
  magicLinkUrl: string
): string {
  const taskListHtml = incompleteTasks
    .map(task => `<li style="margin: 8px 0; color: #555;">${task}</li>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Homemade Profile</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #FFF8F5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #C65D3B; font-size: 28px; margin: 0 0 8px;">🍳 Homemade Chef</h1>
                <p style="color: #666; font-size: 14px; margin: 0;">Your culinary journey awaits!</p>
              </div>
              
              <h2 style="color: #333; font-size: 24px; margin: 0 0 16px; text-align: center;">
                Hi ${chefName}! 👋
              </h2>
              
              <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ${businessName ? `We noticed you haven't finished setting up <strong>${businessName}</strong> yet.` : "We noticed you haven't finished setting up your chef profile yet."} 
                You're <strong>${progress}%</strong> of the way there!
              </p>
              
              <!-- Progress Bar -->
              <div style="background: #f0f0f0; border-radius: 10px; height: 20px; margin: 20px 0; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #C65D3B 0%, #E07B5B 100%); height: 100%; width: ${progress}%; border-radius: 10px;"></div>
              </div>
              
              <div style="background: #fff7ed; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #fed7aa;">
                <h3 style="margin: 0 0 12px; color: #c2410c; font-size: 16px;">📋 Remaining Steps:</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  ${taskListHtml}
                </ul>
              </div>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${magicLinkUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #C65D3B 0%, #E07B5B 100%); color: white; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 50px; text-decoration: none; box-shadow: 0 4px 16px rgba(198, 93, 59, 0.3);">
                  ✨ Complete Your Profile
                </a>
              </div>
              
              <p style="color: #888; font-size: 14px; line-height: 1.6; margin: 20px 0; text-align: center;">
                Or copy and paste this link into your browser:
              </p>
              <p style="background-color: #f5f5f5; padding: 12px 16px; border-radius: 8px; font-size: 11px; word-break: break-all; color: #666;">
                ${magicLinkUrl}
              </p>
              
              <div style="background: #f0fdf4; padding: 16px; border-radius: 12px; margin: 24px 0; border: 1px solid #bbf7d0;">
                <h4 style="margin: 0 0 8px; color: #166534; font-size: 14px;">💡 Why Complete Your Profile?</h4>
                <ul style="margin: 0; padding-left: 18px; color: #555; font-size: 14px;">
                  <li>Start earning money from your home kitchen</li>
                  <li>Get discovered by hungry customers nearby</li>
                  <li>Join our growing community of home chefs</li>
                </ul>
              </div>
              
              <div style="border-top: 1px solid #eee; margin-top: 32px; padding-top: 24px;">
                <p style="color: #888; font-size: 13px; line-height: 1.5; margin: 0; text-align: center;">
                  This link will expire in 1 hour. Need help? Reply to this email or contact us anytime!
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FFF8F5; padding: 20px 40px; border-radius: 0 0 16px 16px;">
              <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
                © ${new Date().getFullYear()} Homemade Chef. All rights reserved.
                <br>
                <a href="https://wa.me/3197010208809" style="color: #C65D3B; text-decoration: none;">WhatsApp: +31 97010208809</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get the cutoff date - only send to profiles not reminded in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    console.log("Starting weekly onboarding follow-up check...");

    let sentCount = 0;
    let skippedCount = 0;

    // 1. Check chef_profiles with incomplete onboarding
    const { data: chefProfiles, error: chefError } = await supabase
      .from('chef_profiles')
      .select('*')
      .eq('onboarding_completed', false)
      .not('contact_email', 'is', null)
      .or(`onboarding_reminder_sent_at.is.null,onboarding_reminder_sent_at.lt.${sevenDaysAgo.toISOString()}`);

    if (chefError) {
      console.error('Error fetching chef profiles:', chefError);
      throw chefError;
    }

    console.log(`Found ${chefProfiles?.length || 0} incomplete chef profiles`);

    for (const profile of chefProfiles || []) {
      const incompleteTasks = getIncompleteTasks(profile);
      const progress = calculateProgress(profile);

      // Skip if nearly complete (>= 90%)
      if (progress >= 90) {
        console.log(`Skipping ${profile.contact_email} - ${progress}% complete`);
        skippedCount++;
        continue;
      }

      const email = profile.contact_email;
      const chefName = profile.chef_name || profile.business_name || 'Chef';
      const businessName = profile.business_name;

      // Generate magic link
      const magicLinkUrl = await generateMagicLink(supabase, email);
      if (!magicLinkUrl) {
        console.log(`Skipping ${email} - could not generate magic link`);
        skippedCount++;
        continue;
      }

      const emailHtml = generateEmailHtml(chefName, businessName, incompleteTasks, progress, magicLinkUrl);

      try {
        const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SENDGRID_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }] }],
            from: { email: "chefs@homemademeals.net", name: "Homemade Chef" },
            subject: `You're ${progress}% done! Complete your chef profile 🍳`,
            content: [{ type: "text/html", value: emailHtml }],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`SendGrid error for ${email}:`, errorText);
          continue;
        }

        // Update reminder sent timestamp
        await supabase
          .from('chef_profiles')
          .update({ onboarding_reminder_sent_at: new Date().toISOString() })
          .eq('id', profile.id);

        console.log(`Sent onboarding reminder to ${email} (${progress}% complete, ${incompleteTasks.length} tasks remaining)`);
        sentCount++;
      } catch (emailError) {
        console.error(`Error sending email to ${email}:`, emailError);
      }
    }

    // 2. Check pending_profiles (users who haven't created accounts yet)
    const { data: pendingProfiles, error: pendingError } = await supabase
      .from('pending_profiles')
      .select('*')
      .not('email', 'is', null)
      .or(`onboarding_reminder_sent_at.is.null,onboarding_reminder_sent_at.lt.${sevenDaysAgo.toISOString()}`);

    if (pendingError) {
      console.error('Error fetching pending profiles:', pendingError);
    } else {
      console.log(`Found ${pendingProfiles?.length || 0} pending profiles`);

      for (const profile of pendingProfiles || []) {
        // Map pending_profile fields to chef_profile format for task checking
        const mappedProfile = {
          city: profile.city,
          cuisines: profile.cuisines,
          contact_email: profile.email,
          contact_phone: profile.phone,
          address: profile.address,
          business_name: profile.business_name,
          logo_url: profile.logo_url,
          service_type: profile.service_type,
          availability: profile.availability,
          dish_types: profile.dish_types,
          food_safety_status: profile.food_safety_status,
          kvk_status: profile.kvk_status,
          plan: profile.plan,
        };

        const incompleteTasks = getIncompleteTasks(mappedProfile);
        const progress = calculateProgress(mappedProfile);

        // Skip if nearly complete or no progress at all
        if (progress >= 90 || progress === 0) {
          skippedCount++;
          continue;
        }

        const email = profile.email;
        const chefName = profile.chef_name || profile.business_name || 'Chef';
        const businessName = profile.business_name;

        // For pending profiles, we need to check if user exists in auth
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

        let magicLinkUrl: string | null = null;

        if (existingUser) {
          magicLinkUrl = await generateMagicLink(supabase, email);
        } else {
          // Create user first, then generate link
          const { error: createError } = await supabase.auth.admin.createUser({
            email: email,
            email_confirm: false,
          });

          if (!createError) {
            magicLinkUrl = await generateMagicLink(supabase, email);
          } else {
            console.log(`Could not create user for ${email}:`, createError);
          }
        }

        if (!magicLinkUrl) {
          console.log(`Skipping pending ${email} - could not generate magic link`);
          skippedCount++;
          continue;
        }

        const emailHtml = generateEmailHtml(chefName, businessName, incompleteTasks, progress, magicLinkUrl);

        try {
          const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${SENDGRID_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              personalizations: [{ to: [{ email }] }],
              from: { email: "chefs@homemademeals.net", name: "Homemade Chef" },
              subject: `You're ${progress}% done! Complete your chef profile 🍳`,
              content: [{ type: "text/html", value: emailHtml }],
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`SendGrid error for pending ${email}:`, errorText);
            continue;
          }

          // Update reminder sent timestamp
          await supabase
            .from('pending_profiles')
            .update({ onboarding_reminder_sent_at: new Date().toISOString() })
            .eq('id', profile.id);

          console.log(`Sent onboarding reminder to pending ${email} (${progress}% complete)`);
          sentCount++;
        } catch (emailError) {
          console.error(`Error sending email to pending ${email}:`, emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${sentCount} onboarding reminder emails, skipped ${skippedCount}` 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in onboarding-followup-cron:", error);
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
