import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Finding packaging suppliers near ${city}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that finds food packaging suppliers in the Netherlands. 
Return a JSON array of 5-6 suppliers with name, type (Wholesale/Retail/Online), and url. 
Focus on places that sell food containers, takeaway packaging, and similar supplies.
Include both large chains (Makro, Sligro, Hanos) and local options near the specified city.
Only respond with valid JSON array, no markdown.`
          },
          {
            role: 'user',
            content: `Find food packaging and container suppliers near ${city}, Netherlands. Include large wholesale stores and local toko/asian supermarkets that sell packaging.`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'return_suppliers',
              description: 'Return list of packaging suppliers',
              parameters: {
                type: 'object',
                properties: {
                  suppliers: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        type: { type: 'string' },
                        url: { type: 'string' }
                      },
                      required: ['name', 'type']
                    }
                  }
                },
                required: ['suppliers']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'return_suppliers' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Failed to get suppliers from AI');
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      console.log('Found suppliers:', parsed.suppliers?.length);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fallback
    return new Response(JSON.stringify({
      suppliers: [
        { name: 'Makro', type: 'Wholesale', url: 'https://www.makro.nl' },
        { name: 'Sligro', type: 'Wholesale', url: 'https://www.sligro.nl' },
        { name: 'Hanos', type: 'Wholesale', url: 'https://www.hanos.nl' },
        { name: 'Albert Heijn XL', type: 'Retail', url: 'https://www.ah.nl' },
        { name: 'Action', type: 'Retail', url: 'https://www.action.com' },
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error finding suppliers:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      suppliers: [
        { name: 'Makro', type: 'Wholesale', url: 'https://www.makro.nl' },
        { name: 'Sligro', type: 'Wholesale', url: 'https://www.sligro.nl' },
        { name: 'Hanos', type: 'Wholesale', url: 'https://www.hanos.nl' },
      ]
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
