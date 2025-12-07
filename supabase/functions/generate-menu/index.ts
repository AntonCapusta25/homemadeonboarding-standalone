import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { city, cuisines, dishTypes, serviceType, restaurantName, chefName } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating menu for:', { city, cuisines, dishTypes, restaurantName });

    const systemPrompt = `You are a culinary business consultant specializing in home chef businesses in the Netherlands. 
You help home chefs create profitable menus with competitive pricing.

CRITICAL RULES:
1. Home chef prices should be 25-40% LOWER than restaurant prices
2. Ingredient costs are typically 25-35% of selling price for home chefs (lower overhead)
3. All prices in EUR, formatted as numbers (e.g., 12.50)
4. Consider local ingredient availability in ${city}
5. Dishes should be feasible in a home kitchen
6. Include popular upsell items (drinks, sides, desserts) that pair well with main dishes`;

    const userPrompt = `Create a profitable menu for a home chef business:

Restaurant: ${restaurantName || 'Home Chef Kitchen'}
Chef: ${chefName || 'Home Chef'}
Location: ${city}, Netherlands
Cuisines: ${cuisines?.join(', ') || 'Mixed'}
Dish Types: ${dishTypes?.join(', ') || 'Various'}
Service: ${serviceType || 'delivery and pickup'}

Generate a menu with:
1. 5-6 main dishes that are practical for a home kitchen
2. 3-4 upsell items (drinks like cola/fanta, sides, or small desserts)

For EACH dish include:
- Name (appealing, can include emoji)
- Short description (max 15 words)
- Selling price (home chef competitive, 25-40% below restaurant prices)
- Estimated ingredient cost per portion
- Category (main/side/drink/dessert)

Also calculate:
- Average profit margin across all items
- Comparison: typical restaurant price for similar items

Respond ONLY with valid JSON in this exact format:
{
  "dishes": [
    {
      "name": "Dish Name",
      "description": "Short appetizing description",
      "price": 12.50,
      "estimatedCost": 4.00,
      "margin": 68,
      "category": "main",
      "restaurantPrice": 18.00
    }
  ],
  "upsells": [
    {
      "name": "Cola",
      "price": 2.00,
      "type": "drink"
    }
  ],
  "avgMargin": 65,
  "summary": "Brief 1-sentence menu summary"
}`;

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
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response:', content);

    // Parse JSON from the response (handle markdown code blocks)
    let menuData;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;
      menuData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Return a fallback menu
      menuData = generateFallbackMenu(cuisines, city);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      menu: menuData,
      generatedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error generating menu:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage,
      menu: generateFallbackMenu(['Mixed'], 'Netherlands')
    }), {
      status: 200, // Return 200 with fallback so UI still works
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateFallbackMenu(cuisines: string[], city: string) {
  const cuisineType = cuisines?.[0] || 'Mixed';
  
  return {
    dishes: [
      {
        name: "Chef's Special Bowl 🍲",
        description: "Signature dish with fresh local ingredients",
        price: 11.50,
        estimatedCost: 3.80,
        margin: 67,
        category: "main",
        restaurantPrice: 16.00
      },
      {
        name: "Home-style Curry 🍛",
        description: "Aromatic curry with basmati rice",
        price: 10.50,
        estimatedCost: 3.20,
        margin: 70,
        category: "main",
        restaurantPrice: 15.00
      },
      {
        name: "Grilled Protein Plate 🥗",
        description: "Grilled meat or tofu with seasonal veggies",
        price: 12.00,
        estimatedCost: 4.50,
        margin: 63,
        category: "main",
        restaurantPrice: 17.00
      },
      {
        name: "Comfort Noodles 🍜",
        description: "Wok-fried noodles with vegetables",
        price: 9.50,
        estimatedCost: 2.80,
        margin: 71,
        category: "main",
        restaurantPrice: 14.00
      },
      {
        name: "Wrap of the Day 🌯",
        description: "Fresh wrap with chef's daily selection",
        price: 8.50,
        estimatedCost: 2.50,
        margin: 71,
        category: "main",
        restaurantPrice: 12.00
      }
    ],
    upsells: [
      { name: "Cola / Fanta", price: 2.00, type: "drink" },
      { name: "Fresh Juice", price: 3.50, type: "drink" },
      { name: "Extra Rice", price: 2.50, type: "side" },
      { name: "Homemade Dessert", price: 4.00, type: "dessert" }
    ],
    avgMargin: 68,
    summary: `Delicious ${cuisineType} cuisine prepared fresh in ${city}`
  };
}
