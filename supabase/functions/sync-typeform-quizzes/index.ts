import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const typeformApiKey = Deno.env.get('TYPEFORM_API_KEY');

    if (!typeformApiKey) {
      return new Response(
        JSON.stringify({ error: 'TYPEFORM_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const formId = 'fORAE4HR';

    console.log(`Auto-syncing Typeform responses from form: ${formId}`);

    // Fetch responses from Typeform API
    const typeformResponse = await fetch(
      `https://api.typeform.com/forms/${formId}/responses?page_size=100`,
      {
        headers: { 'Authorization': `Bearer ${typeformApiKey}` },
      }
    );

    if (!typeformResponse.ok) {
      const errorText = await typeformResponse.text();
      console.error(`Typeform API error: ${typeformResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Typeform API error: ${typeformResponse.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const typeformData = await typeformResponse.json();
    console.log(`Fetched ${typeformData.items?.length || 0} responses`);

    // Get all chef profiles
    const { data: chefProfiles } = await supabase
      .from('chef_profiles')
      .select('id, chef_name, business_name, contact_email');

    // Get existing verifications
    const { data: verifications } = await supabase
      .from('chef_verification')
      .select('chef_profile_id, food_safety_quiz_completed');

    const linkedChefIds = new Set(
      (verifications || [])
        .filter(v => v.food_safety_quiz_completed)
        .map(v => v.chef_profile_id)
    );

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const newlyLinked: string[] = [];

    for (const item of typeformData.items || []) {
      // Extract email
      let email: string | null = null;
      
      if (item.hidden) {
        for (const value of Object.values(item.hidden)) {
          if (typeof value === 'string' && emailRegex.test(value)) {
            email = value.toLowerCase();
            break;
          }
        }
      }
      
      if (!email && item.answers) {
        for (const answer of item.answers) {
          if (answer.type === 'email' && answer.email) {
            email = answer.email.toLowerCase();
            break;
          }
          if (answer.type === 'text' && answer.text && emailRegex.test(answer.text)) {
            email = answer.text.toLowerCase();
            break;
          }
        }
      }

      if (!email) continue;

      // Find matching chef
      const chef = (chefProfiles || []).find(
        c => c.contact_email?.toLowerCase() === email
      );

      if (!chef || linkedChefIds.has(chef.id)) continue;

      // Extract score
      let quizScore: number | null = null;
      let maxScore: number | null = null;

      if (item.variables) {
        for (const variable of item.variables) {
          const key = variable.key?.toLowerCase();
          if (key === 'quiz_score' || key === 'score') {
            quizScore = variable.number ?? null;
          } else if (key === 'max_score' || key === 'maxscore') {
            maxScore = variable.number ?? null;
          }
        }
      }

      if (quizScore === null || maxScore === null || maxScore === 0) continue;

      const scorePercentage = Math.round((quizScore / maxScore) * 100);

      // Check if verification record exists
      const { data: existingVerification } = await supabase
        .from('chef_verification')
        .select('id')
        .eq('chef_profile_id', chef.id)
        .maybeSingle();

      const verificationData = {
        food_safety_quiz_completed: true,
        food_safety_quiz_score: scorePercentage,
        food_safety_quiz_passed: scorePercentage >= 80,
        food_safety_quiz_completed_at: item.submitted_at || new Date().toISOString(),
      };

      if (existingVerification) {
        await supabase
          .from('chef_verification')
          .update(verificationData)
          .eq('chef_profile_id', chef.id);
      } else {
        await supabase
          .from('chef_verification')
          .insert({ chef_profile_id: chef.id, ...verificationData });
      }

      linkedChefIds.add(chef.id);
      newlyLinked.push(chef.business_name || chef.chef_name || email);
      console.log(`Auto-linked quiz to ${chef.business_name || chef.chef_name}: ${scorePercentage}%`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        newlyLinked,
        count: newlyLinked.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
