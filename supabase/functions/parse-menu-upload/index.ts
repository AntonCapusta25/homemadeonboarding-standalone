import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface ParsedDish {
  name: string;
  description: string;
  price: number;
  category: string;
  is_upsell: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, file_type, chef_name, cuisines } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'No content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Parsing menu content (${file_type}), length: ${content.length}`);

    // Use AI to parse and structure the menu content
    const systemPrompt = `You are a menu parser. Extract dish information from the provided content and return a structured JSON array.

Each dish should have:
- name: string (the dish name)
- description: string (brief description, max 100 chars)
- price: number (price in euros, extract from content or estimate 8-20 range)
- category: string (one of: "Main Dishes", "Starters", "Sides", "Drinks", "Desserts")
- is_upsell: boolean (true for drinks, desserts, and small extras)

Chef context: ${chef_name || 'Unknown chef'}
Cuisines: ${(cuisines || []).join(', ') || 'Various'}

Rules:
1. Extract ALL dishes from the content
2. If price is not specified, estimate based on dish type (mains: €12-18, starters: €6-10, drinks: €3-5, desserts: €5-8)
3. Categorize items appropriately
4. Keep descriptions concise
5. Return ONLY valid JSON array, no markdown or explanation`;

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
          { role: 'user', content: `Parse this menu content:\n\n${content}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse menu with AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    console.log('AI response:', aiContent.slice(0, 500));

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = aiContent;
    const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Try to parse the JSON
    let dishes: ParsedDish[] = [];
    try {
      dishes = JSON.parse(jsonStr);
      if (!Array.isArray(dishes)) {
        dishes = [dishes];
      }
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, 'Raw:', jsonStr.slice(0, 200));
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI response as JSON' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and clean dishes
    const validDishes = dishes.filter(d => d.name && typeof d.name === 'string').map((d, idx) => ({
      name: String(d.name).trim(),
      description: String(d.description || '').trim().slice(0, 200),
      price: typeof d.price === 'number' ? d.price : parseFloat(d.price) || 12,
      category: d.category || 'Main Dishes',
      is_upsell: d.is_upsell === true,
      sort_order: idx,
    }));

    console.log(`Parsed ${validDishes.length} dishes`);

    return new Response(
      JSON.stringify({ success: true, dishes: validDishes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Parse menu error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
