import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KitchenAnalysis {
  overallScore: number;
  status: 'pass' | 'conditional' | 'fail';
  categories: {
    hygieneReadiness: { score: number; feedback: string };
    crossContaminationControl: { score: number; feedback: string };
    fridgeSafety: { score: number; feedback: string };
    cleaningSystemReadiness: { score: number; feedback: string };
    storageDiscipline: { score: number; feedback: string };
    packingAreaReadiness: { score: number; feedback: string };
  };
  issues: Array<{
    severity: 'critical' | 'moderate' | 'minor';
    description: string;
    fix: string;
  }>;
  zoneRecommendations: {
    rawPrepZone: string;
    readyToEatZone: string;
    packingZone: string;
    cleanToolsZone: string;
    workflow: string;
  };
  fridgeOrganization: {
    topShelf: string;
    middleShelf: string;
    bottomShelf: string;
    drawers: string;
    door: string;
    weeklyRoutine: string;
  };
  efficiencyTips: string[];
  checklist: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { kitchenPhoto1Url, kitchenPhoto2Url, fridgePhotoUrl, chefProfileId } = await req.json();

    if (!kitchenPhoto1Url || !kitchenPhoto2Url || !fridgePhotoUrl) {
      return new Response(
        JSON.stringify({ error: 'All three photos are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('[analyze-kitchen] Starting analysis for chef:', chefProfileId);

    const systemPrompt = `You are an expert food safety inspector specializing in home kitchen assessments for food delivery businesses. Your job is to analyze kitchen photos and provide a fair, supportive, and actionable assessment.

You must analyze the photos for:
1. Hygiene readiness - handwashing setup, soap, hygienic drying
2. Cross-contamination control - separation between raw and ready-to-eat areas
3. Fridge safety - raw meat placement, overcrowding, uncovered foods, organization
4. Cleaning system readiness - cleanable surfaces, organization
5. Storage discipline - proper food storage, chemicals away from food
6. Packing area readiness - dedicated space for packing orders

Be supportive and constructive. Your goal is to help chefs pass, not catch them out.

IMPORTANT: You MUST respond with ONLY valid JSON matching this exact structure (no markdown, no code blocks, just raw JSON):

{
  "overallScore": <number 0-100>,
  "status": "<pass|conditional|fail>",
  "categories": {
    "hygieneReadiness": { "score": <number 0-100>, "feedback": "<string>" },
    "crossContaminationControl": { "score": <number 0-100>, "feedback": "<string>" },
    "fridgeSafety": { "score": <number 0-100>, "feedback": "<string>" },
    "cleaningSystemReadiness": { "score": <number 0-100>, "feedback": "<string>" },
    "storageDiscipline": { "score": <number 0-100>, "feedback": "<string>" },
    "packingAreaReadiness": { "score": <number 0-100>, "feedback": "<string>" }
  },
  "issues": [
    { "severity": "<critical|moderate|minor>", "description": "<string>", "fix": "<string>" }
  ],
  "zoneRecommendations": {
    "rawPrepZone": "<recommendation for raw prep zone>",
    "readyToEatZone": "<recommendation for ready-to-eat zone>",
    "packingZone": "<recommendation for packing zone>",
    "cleanToolsZone": "<recommendation for clean tools zone>",
    "workflow": "<recommended workflow to prevent contamination>"
  },
  "fridgeOrganization": {
    "topShelf": "<what should go on top shelf>",
    "middleShelf": "<what should go on middle shelf>",
    "bottomShelf": "<what should go on bottom shelf - typically raw meat>",
    "drawers": "<what should go in drawers>",
    "door": "<what should go in door>",
    "weeklyRoutine": "<quick weekly fridge reset routine>"
  },
  "efficiencyTips": ["<tip1>", "<tip2>", ...],
  "checklist": ["<fix1>", "<fix2>", ...]
}

Scoring guide:
- Pass (70-100): Kitchen meets minimum safety standards
- Conditional (50-69): Safe enough to proceed after fixing specific items
- Fail (0-49): Critical issues that must be solved before joining`;

    const userPrompt = `Please analyze these three photos of a home chef's kitchen and provide a comprehensive food safety assessment:

Photo 1 (Kitchen wide shot - main cooking and prep area): First image
Photo 2 (Kitchen wide shot - different angle showing sink, counters, storage, trash): Second image  
Photo 3 (Inside of fridge - main shelves): Third image

Analyze all aspects of food safety and provide:
1. An overall score (0-100) and pass/conditional/fail status
2. Scores for each category
3. List of issues found with severity and fixes
4. Zone setup recommendations
5. Fridge organization recommendations
6. Efficiency tips
7. A checklist of things to fix to pass

Remember to be supportive and constructive. Focus on helping the chef succeed.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: kitchenPhoto1Url } },
              { type: 'image_url', image_url: { url: kitchenPhoto2Url } },
              { type: 'image_url', image_url: { url: fridgePhotoUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[analyze-kitchen] AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('[analyze-kitchen] Raw AI response:', content.substring(0, 500));

    // Parse the JSON response
    let analysis: KitchenAnalysis;
    try {
      // Remove any markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      analysis = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error('[analyze-kitchen] JSON parse error:', parseError);
      console.error('[analyze-kitchen] Content was:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Save results to database if chefProfileId provided
    if (chefProfileId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: updateError } = await supabase
        .from('chef_verification')
        .update({
          kitchen_photo_1_url: kitchenPhoto1Url,
          kitchen_photo_2_url: kitchenPhoto2Url,
          fridge_photo_url: fridgePhotoUrl,
          kitchen_score: analysis.overallScore,
          kitchen_status: analysis.status,
          kitchen_analysis: analysis,
          kitchen_verified_at: new Date().toISOString(),
        })
        .eq('chef_profile_id', chefProfileId);

      if (updateError) {
        console.error('[analyze-kitchen] Database update error:', updateError);
      } else {
        console.log('[analyze-kitchen] Results saved to database');
      }
    }

    console.log('[analyze-kitchen] Analysis complete. Score:', analysis.overallScore, 'Status:', analysis.status);

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[analyze-kitchen] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
