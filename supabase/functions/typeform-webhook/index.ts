import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, typeform-signature',
};

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
    calculated: {
      score: number;
    };
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

    // Extract data from the payload
    const { form_response } = payload;
    const score = form_response.calculated?.score || 0;
    const submittedAt = form_response.submitted_at;
    
    // Get email from hidden fields or answers
    let chefEmail = form_response.hidden?.email;
    let chefId = form_response.hidden?.chef_id;

    // If not in hidden fields, look for email in answers
    if (!chefEmail) {
      const emailAnswer = form_response.answers.find(a => a.type === 'email');
      if (emailAnswer) {
        chefEmail = emailAnswer.email;
      }
    }

    console.log(`Quiz completed - Email: ${chefEmail}, Chef ID: ${chefId}, Score: ${score}`);

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

    // Determine passing score (e.g., 70%)
    const PASSING_SCORE = 70;
    const passed = score >= PASSING_SCORE;

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
        JSON.stringify({ error: 'Chef profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update chef_verification with quiz results
    const { error: updateError } = await supabase
      .from('chef_verification')
      .update({
        food_safety_quiz_completed: true,
        food_safety_quiz_score: score,
        food_safety_quiz_passed: passed,
        food_safety_quiz_completed_at: submittedAt,
        food_safety_viewed: true, // Also mark as viewed
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
          food_safety_quiz_score: score,
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

    console.log(`Quiz results saved for chef ${chefProfileId}: Score ${score}%, Passed: ${passed}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        chefProfileId,
        score,
        passed,
        message: `Quiz results recorded. Score: ${score}%, ${passed ? 'PASSED' : 'FAILED'}` 
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
