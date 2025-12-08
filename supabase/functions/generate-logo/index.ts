import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { restaurantName, cuisines, chefName } = await req.json();
    
    console.log('Generating logo for:', { restaurantName, cuisines, chefName });
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const cuisineStr = cuisines?.slice(0, 2).join(' and ') || 'homemade food';
    
    const prompt = `Create a professional, modern restaurant logo for "${restaurantName}". 
The restaurant specializes in ${cuisineStr} cuisine${chefName ? `, run by chef ${chefName}` : ''}.
The logo should be:
- Clean and simple
- Warm, inviting colors (terracotta, orange, warm browns)
- Include subtle food or chef-related elements
- Professional enough for a food delivery app
- Square format with rounded corners
- High contrast, readable at small sizes
Style: Modern minimalist logo design, vector-like quality, warm color palette`;

    console.log('Sending prompt to OpenAI GPT Image 1:', prompt);

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'high',
        output_format: 'png',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');
    
    // GPT Image 1 returns base64 data
    const imageBase64 = data.data?.[0]?.b64_json;
    
    if (!imageBase64) {
      console.error('No image in response:', JSON.stringify(data));
      throw new Error('No image generated');
    }

    // Return as data URL
    const logoUrl = `data:image/png;base64,${imageBase64}`;

    return new Response(
      JSON.stringify({ logoUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating logo:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate logo' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
