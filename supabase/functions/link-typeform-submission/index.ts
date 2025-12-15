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

    const { submissionToken, chefProfileId, formId } = await req.json();

    if (!submissionToken || !chefProfileId) {
      return new Response(
        JSON.stringify({ error: 'Missing submissionToken or chefProfileId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the food safety quiz form ID by default
    const targetFormId = formId || 'fORAE4HR';

    console.log(`Fetching Typeform submission: ${submissionToken} from form: ${targetFormId}`);

    // Fetch submission from Typeform API
    const typeformResponse = await fetch(
      `https://api.typeform.com/forms/${targetFormId}/responses?included_response_ids=${submissionToken}`,
      {
        headers: {
          'Authorization': `Bearer ${typeformApiKey}`,
        },
      }
    );

    if (!typeformResponse.ok) {
      const errorText = await typeformResponse.text();
      console.error(`Typeform API error: ${typeformResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Failed to fetch from Typeform: ${typeformResponse.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const typeformData = await typeformResponse.json();
    console.log(`Typeform response items: ${typeformData.items?.length || 0}`);

    if (!typeformData.items || typeformData.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Submission not found in Typeform' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const submission = typeformData.items[0];
    
    // Extract quiz score from variables
    let quizScore: number | null = null;
    let maxScore: number | null = null;

    if (submission.variables) {
      for (const variable of submission.variables) {
        const key = variable.key?.toLowerCase();
        if (key === 'quiz_score' || key === 'score') {
          quizScore = variable.number ?? null;
        } else if (key === 'max_score' || key === 'maxscore') {
          maxScore = variable.number ?? null;
        }
      }
    }

    // Calculate percentage
    let scorePercentage: number | null = null;
    if (quizScore !== null && maxScore !== null && maxScore > 0) {
      scorePercentage = Math.round((quizScore / maxScore) * 100);
    }

    console.log(`Extracted score: ${quizScore}/${maxScore} = ${scorePercentage}%`);

    if (scorePercentage === null) {
      return new Response(
        JSON.stringify({ 
          error: 'Could not extract quiz score from submission',
          variables: submission.variables 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if chef_verification record exists
    const { data: existingVerification } = await supabase
      .from('chef_verification')
      .select('id')
      .eq('chef_profile_id', chefProfileId)
      .maybeSingle();

    const verificationData = {
      food_safety_quiz_completed: true,
      food_safety_quiz_score: scorePercentage,
      food_safety_quiz_passed: scorePercentage >= 80,
      food_safety_quiz_completed_at: submission.submitted_at || new Date().toISOString(),
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

    console.log(`Successfully linked submission to chef: ${chefProfileId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        score: scorePercentage,
        passed: scorePercentage >= 80,
        submittedAt: submission.submitted_at
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
