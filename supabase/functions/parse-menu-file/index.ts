import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedDish {
  name: string;
  description: string | null;
  price: number;
  category: string;
  is_upsell: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, filename } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'No content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a menu parser. Extract dishes from the provided menu content and return them as a JSON array.

Each dish should have:
- name: The dish name (string)
- description: A brief description (string or null)
- price: The price as a number (e.g., 12.50)
- category: One of "Main Dishes", "Drinks", "Desserts", "Extras", "Appetizers", "Sides", "Soups", "Salads"
- is_upsell: Boolean - true for drinks, desserts, and extras/sides; false for main dishes

Important rules:
- Always return a valid JSON array
- Extract prices as numbers (strip currency symbols)
- If price is missing, estimate a reasonable price
- Categorize dishes appropriately based on their names/descriptions
- Set is_upsell=true for drinks, desserts, sides, extras
- Clean up formatting and remove any artifacts from the source format

Return ONLY the JSON array, no other text.`;

    const userPrompt = `Parse this menu content and extract all dishes as JSON:

Filename: ${filename || 'menu'}

Content:
${content}`;

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
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const messageContent = aiResponse.choices?.[0]?.message?.content || '';

    // Extract JSON from the response
    let dishes: ParsedDish[] = [];
    try {
      // Try to parse the content as JSON directly
      const jsonMatch = messageContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        dishes = JSON.parse(jsonMatch[0]);
      } else {
        dishes = JSON.parse(messageContent);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', messageContent);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse menu data', raw: messageContent }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and clean dishes
    const cleanedDishes = dishes.map((dish: any, index: number) => ({
      name: String(dish.name || `Dish ${index + 1}`).trim(),
      description: dish.description ? String(dish.description).trim() : null,
      price: Number(dish.price) || 10.00,
      category: dish.category || 'Main Dishes',
      is_upsell: Boolean(dish.is_upsell),
    }));

    return new Response(
      JSON.stringify({ success: true, dishes: cleanedDishes }),
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
