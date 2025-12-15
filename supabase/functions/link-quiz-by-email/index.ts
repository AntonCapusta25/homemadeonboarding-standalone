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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { chefProfileId, score, passed, submittedAt } = await req.json();

    if (!chefProfileId || score === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing chefProfileId or score' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Linking quiz to chef: ${chefProfileId}, score: ${score}%`);

    // Check if chef_verification record exists
    const { data: existingVerification } = await supabase
      .from('chef_verification')
      .select('id')
      .eq('chef_profile_id', chefProfileId)
      .maybeSingle();

    const verificationData = {
      food_safety_quiz_completed: true,
      food_safety_quiz_score: score,
      food_safety_quiz_passed: passed ?? score >= 80,
      food_safety_quiz_completed_at: submittedAt || new Date().toISOString(),
    };

    if (existingVerification) {
      const { error: updateError } = await supabase
        .from('chef_verification')
        .update(verificationData)
        .eq('chef_profile_id', chefProfileId);

      if (updateError) {
        console.error('Update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update verification record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      const { error: insertError } = await supabase
        .from('chef_verification')
        .insert({
          chef_profile_id: chefProfileId,
          ...verificationData,
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create verification record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Successfully linked quiz to chef: ${chefProfileId}`);

    return new Response(
      JSON.stringify({ success: true }),
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
