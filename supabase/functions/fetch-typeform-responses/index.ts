import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TypeformResponse {
  responseId: string;
  email: string | null;
  score: number | null;
  maxScore: number | null;
  scorePercentage: number | null;
  passed: boolean | null;
  submittedAt: string;
  matchedChef: {
    id: string;
    name: string;
  } | null;
  alreadyLinked: boolean;
}

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
    const formId = 'fORAE4HR'; // Food safety quiz form ID

    console.log(`Fetching all responses from Typeform form: ${formId}`);

    // Fetch responses from Typeform API
    const typeformResponse = await fetch(
      `https://api.typeform.com/forms/${formId}/responses?page_size=100`,
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
    console.log(`Fetched ${typeformData.items?.length || 0} responses`);

    // Get all chef profiles for matching
    const { data: chefProfiles } = await supabase
      .from('chef_profiles')
      .select('id, chef_name, business_name, contact_email');

    // Get all existing verifications to check which are already linked
    const { data: verifications } = await supabase
      .from('chef_verification')
      .select('chef_profile_id, food_safety_quiz_completed, food_safety_quiz_score');

    const verificationMap = new Map(
      (verifications || []).map(v => [v.chef_profile_id, v])
    );

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const responses: TypeformResponse[] = [];

    for (const item of typeformData.items || []) {
      // Extract email
      let email: string | null = null;
      
      // Check hidden fields
      if (item.hidden) {
        for (const [key, value] of Object.entries(item.hidden)) {
          if (typeof value === 'string' && emailRegex.test(value)) {
            email = value.toLowerCase();
            break;
          }
        }
      }
      
      // Check answers
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

      let scorePercentage: number | null = null;
      if (quizScore !== null && maxScore !== null && maxScore > 0) {
        scorePercentage = Math.round((quizScore / maxScore) * 100);
      }

      // Find matching chef
      let matchedChef: { id: string; name: string } | null = null;
      let alreadyLinked = false;

      if (email) {
        const chef = (chefProfiles || []).find(
          c => c.contact_email?.toLowerCase() === email
        );
        if (chef) {
          matchedChef = {
            id: chef.id,
            name: chef.business_name || chef.chef_name || 'Unknown',
          };
          
          // Check if already linked
          const verification = verificationMap.get(chef.id);
          if (verification?.food_safety_quiz_completed) {
            alreadyLinked = true;
          }
        }
      }

      responses.push({
        responseId: item.response_id,
        email,
        score: quizScore,
        maxScore,
        scorePercentage,
        passed: scorePercentage !== null ? scorePercentage >= 80 : null,
        submittedAt: item.submitted_at,
        matchedChef,
        alreadyLinked,
      });
    }

    // Sort by submitted date descending
    responses.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    return new Response(
      JSON.stringify({ 
        responses,
        total: responses.length,
        matched: responses.filter(r => r.matchedChef).length,
        linked: responses.filter(r => r.alreadyLinked).length,
        unlinked: responses.filter(r => r.matchedChef && !r.alreadyLinked).length,
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
