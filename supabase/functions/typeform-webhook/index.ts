import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, typeform-signature',
};

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

// Only process the real Food Safety quiz form.
// If Typeform sends test/other forms here, we acknowledge with 200 to avoid webhook failures.
const ALLOWED_FORM_IDS = new Set(['fORAE4HR']);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeEmail(email: string | null): string | null {
  const trimmed = email?.trim();
  if (!trimmed) return null;
  if (trimmed.length > 255) return null;
  return EMAIL_REGEX.test(trimmed) ? trimmed : null;
}

function sanitizeChefId(id: string | null): string | null {
  const trimmed = id?.trim();
  if (!trimmed) return null;
  if (trimmed.length > 64) return null;
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}


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
    hidden?: Record<string, string>;
    answers: TypeformAnswer[];
  };
}

// Helper to extract email from various sources in the payload
function extractEmail(payload: TypeformPayload): string | null {
  const { form_response } = payload;
  
  // 1. Check hidden fields (case-insensitive)
  if (form_response.hidden) {
    for (const [key, value] of Object.entries(form_response.hidden)) {
      if (key.toLowerCase().includes('email') && value) {
        console.log(`Found email in hidden field '${key}': ${value}`);
        return value;
      }
    }
  }
  
  // 2. Check for email-type answer
  const emailAnswer = form_response.answers.find(a => a.type === 'email');
  if (emailAnswer?.email) {
    console.log(`Found email in email-type answer: ${emailAnswer.email}`);
    return emailAnswer.email;
  }
  
  // 3. Check text answers for email pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const answer of form_response.answers) {
    if (answer.type === 'text' && answer.text && emailRegex.test(answer.text.trim())) {
      console.log(`Found email in text answer: ${answer.text}`);
      return answer.text.trim();
    }
  }
  
  // 4. Check variables for email
  if (form_response.variables) {
    for (const variable of form_response.variables) {
      if (variable.key.toLowerCase().includes('email') && variable.text) {
        console.log(`Found email in variable '${variable.key}': ${variable.text}`);
        return variable.text;
      }
    }
  }
  
  return null;
}

// Helper to extract chef_id from hidden fields
function extractChefId(payload: TypeformPayload): string | null {
  const { form_response } = payload;
  
  if (form_response.hidden) {
    for (const [key, value] of Object.entries(form_response.hidden)) {
      if ((key.toLowerCase().includes('chef') || key.toLowerCase() === 'id') && value) {
        console.log(`Found chef_id in hidden field '${key}': ${value}`);
        return value;
      }
    }
  }
  
  return null;
}

// Helper to extract quiz score
function extractScore(payload: TypeformPayload): { score: number; maxScore: number } {
  const { form_response } = payload;
  let quizScore = 0;
  let maxScore = 100;
  
  // Check variables first (most reliable for Typeform quizzes)
  if (form_response.variables) {
    const quizScoreVar = form_response.variables.find(
      v => v.key.toLowerCase() === 'quiz_score' || v.key.toLowerCase() === 'score'
    );
    const maxScoreVar = form_response.variables.find(
      v => v.key.toLowerCase() === 'max_score' || v.key.toLowerCase() === 'total'
    );
    const correctVar = form_response.variables.find(
      v => v.key.toLowerCase() === 'correct_answers'
    );
    const totalQuestionsVar = form_response.variables.find(
      v => v.key.toLowerCase() === 'total_scorable_questions'
    );
    
    if (quizScoreVar?.number !== undefined) {
      quizScore = quizScoreVar.number;
    } else if (correctVar?.number !== undefined) {
      quizScore = correctVar.number;
    }
    
    if (maxScoreVar?.number !== undefined) {
      maxScore = maxScoreVar.number;
    } else if (totalQuestionsVar?.number !== undefined) {
      maxScore = totalQuestionsVar.number;
    }
  }
  
  // Fallback to calculated score
  if (form_response.calculated?.score !== undefined && quizScore === 0) {
    quizScore = form_response.calculated.score;
  }
  
  return { score: quizScore, maxScore };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: TypeformPayload = await req.json();

    const formId = payload.form_response?.form_id;
    const eventId = payload.event_id;

    // Minimal logging (avoid dumping full quiz answers / PII)
    console.log('Typeform webhook received', { eventId, formId });

    if (!formId || !ALLOWED_FORM_IDS.has(formId)) {
      return new Response(
        JSON.stringify({ ignored: true, reason: 'unrecognized_form', formId }),
        { status: 200, headers: jsonHeaders }
      );
    }

    const { form_response } = payload;
    const submittedAt = form_response.submitted_at;

    // Extract data using helper functions
    const chefEmail = sanitizeEmail(extractEmail(payload));
    const chefIdFromHidden = sanitizeChefId(extractChefId(payload));
    const { score: quizScore, maxScore } = extractScore(payload);

    // Calculate percentage score
    const scorePercentage = maxScore > 0 ? Math.round((quizScore / maxScore) * 100) : 0;

    console.log('Quiz identifiers extracted', {
      hasEmail: !!chefEmail,
      hasChefId: !!chefIdFromHidden,
      scorePercentage,
    });

    if (!chefEmail && !chefIdFromHidden) {
      // Acknowledge (200) so Typeform doesn't mark the webhook as failing.
      return new Response(
        JSON.stringify({
          ignored: true,
          reason: 'missing_identifier',
          hint: 'Add hidden fields to the form URL: ?email=...&chef_id=... (and create matching hidden fields in Typeform)',
        }),
        { status: 200, headers: jsonHeaders }
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
    let chefProfileId = chefIdFromHidden;
    
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
        console.log(`Found chef profile by email: ${chefProfileId}`);
      }
    }

    if (!chefProfileId) {
      console.error('Could not find chef profile for:', chefEmail || chefIdFromHidden);
      return new Response(
        JSON.stringify({ 
          error: 'Chef profile not found', 
          email: chefEmail,
          hint: 'Make sure the email matches the contact_email in chef_profiles table'
        }),
        { status: 404, headers: jsonHeaders }
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
          { status: 500, headers: jsonHeaders }
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
      }),
      { status: 200, headers: jsonHeaders }
    );

  } catch (error: unknown) {
    console.error('Error processing Typeform webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
