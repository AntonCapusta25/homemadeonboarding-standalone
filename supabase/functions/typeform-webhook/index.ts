import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, typeform-signature',
};

interface TypeformVariable {
  key: string;
  type: string;
  number?: number;
  text?: string;
}

interface TypeformAnswer {
  field: {
    id: string;
    ref: string;
    type: string;
  };
  type: string;
  text?: string;
  email?: string;
  number?: number;
  boolean?: boolean;
  choice?: {
    label: string;
  };
  choices?: {
    labels: string[];
  };
}

interface TypeformPayload {
  event_id: string;
  event_type: string;
  form_response: {
    form_id: string;
    token: string;
    landed_at: string;
    submitted_at: string;
    calculated?: {
      score: number;
    };
    variables?: TypeformVariable[];
    hidden?: {
      email?: string;
      chef_id?: string;
    };
    answers: TypeformAnswer[];
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: TypeformPayload = await req.json();
    console.log('Received Typeform webhook:', JSON.stringify(payload, null, 2));

    const { form_response } = payload;
    const submittedAt = form_response.submitted_at;
    
    // Extract score from variables (Typeform quiz format)
    let quizScore = 0;
    let maxScore = 100;
    
    if (form_response.variables) {
      const quizScoreVar = form_response.variables.find(v => v.key === 'Quiz_score' || v.key === 'quiz_score');
      const maxScoreVar = form_response.variables.find(v => v.key === 'Max_score' || v.key === 'max_score');
      
      if (quizScoreVar?.number !== undefined) {
        quizScore = quizScoreVar.number;
      }
      if (maxScoreVar?.number !== undefined) {
        maxScore = maxScoreVar.number;
      }
    }
    
    // Fallback to calculated score if available
    if (form_response.calculated?.score !== undefined && quizScore === 0) {
      quizScore = form_response.calculated.score;
    }
    
    // Calculate percentage score
    const scorePercentage = maxScore > 0 ? Math.round((quizScore / maxScore) * 100) : 0;
    
    // Get email from hidden fields or answers
    let chefEmail = form_response.hidden?.email;
    let chefId = form_response.hidden?.chef_id;

    // If not in hidden fields, look for email in answers
    if (!chefEmail) {
      const emailAnswer = form_response.answers.find(a => a.type === 'email');
      if (emailAnswer?.email) {
        chefEmail = emailAnswer.email;
      }
    }

    console.log(`Quiz completed - Email: ${chefEmail}, Chef ID: ${chefId}, Raw Score: ${quizScore}/${maxScore}, Percentage: ${scorePercentage}%`);

    if (!chefEmail && !chefId) {
      console.error('No email or chef_id found in webhook payload');
      return new Response(
        JSON.stringify({ error: 'No email or chef_id found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine passing score (70%)
    const PASSING_THRESHOLD = 70;
    const passed = scorePercentage >= PASSING_THRESHOLD;

    // Find the chef profile
    let chefProfileId = chefId;
    
    if (!chefProfileId && chefEmail) {
      const { data: chefProfile, error: profileError } = await supabase
        .from('chef_profiles')
        .select('id')
        .eq('contact_email', chefEmail)
        .maybeSingle();

      if (profileError) {
        console.error('Error finding chef profile:', profileError);
      }
      
      if (chefProfile) {
        chefProfileId = chefProfile.id;
      }
    }

    if (!chefProfileId) {
      console.error('Could not find chef profile for:', chefEmail || chefId);
      return new Response(
        JSON.stringify({ error: 'Chef profile not found', email: chefEmail }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update chef_verification with quiz results
    const { error: updateError } = await supabase
      .from('chef_verification')
      .update({
        food_safety_quiz_completed: true,
        food_safety_quiz_score: scorePercentage,
        food_safety_quiz_passed: passed,
        food_safety_quiz_completed_at: submittedAt,
        food_safety_viewed: true,
      })
      .eq('chef_profile_id', chefProfileId);

    if (updateError) {
      console.error('Error updating chef_verification:', updateError);
      
      // Try to insert if record doesn't exist
      const { error: insertError } = await supabase
        .from('chef_verification')
        .insert({
          chef_profile_id: chefProfileId,
          food_safety_quiz_completed: true,
          food_safety_quiz_score: scorePercentage,
          food_safety_quiz_passed: passed,
          food_safety_quiz_completed_at: submittedAt,
          food_safety_viewed: true,
        });

      if (insertError) {
        console.error('Error inserting chef_verification:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save quiz results' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Quiz results saved for chef ${chefProfileId}: Score ${scorePercentage}% (${quizScore}/${maxScore}), Passed: ${passed}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        chefProfileId,
        rawScore: quizScore,
        maxScore,
        scorePercentage,
        passed,
        message: `Quiz results recorded. Score: ${scorePercentage}% (${quizScore}/${maxScore}), ${passed ? 'PASSED' : 'FAILED'}` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error processing Typeform webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
