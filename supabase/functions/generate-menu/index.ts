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

    const systemPrompt = `You are a creative food branding genius who invents UNIQUE, CATCHY dish names for home chef businesses in the Netherlands.

CRITICAL - CREATE INVENTED BRAND NAMES:
You MUST create original, made-up names like real brands do. Examples of the style we want:
- "Koneo" - short, punchy, memorable
- "Zafira Bowl" - exotic sounding
- "Velora Curry" - invented elegant name
- "Nimboo Delight" - playful invented word
- "Solara Plate" - sounds premium
- "Azura Feast" - unique and catchy

NAMING RULES - MANDATORY:
1. INVENT new words - combine syllables creatively (Ko-neo, Za-fi-ra, Ve-lo-ra)
2. Mix in chef name or city CREATIVELY: "${chefName?.split(' ')[0] || 'Chef'}'s Koneo", "${city} Zafira"
3. NEVER use generic words like "Special", "Homestyle", "Classic", "Traditional"
4. Each name must be UNIQUE and BRANDABLE - something you'd trademark
5. Use 1-3 words max per dish name
6. Add relevant emoji after the name

PRICING (secondary priority):
- Home chef prices 25-40% below restaurants
- All prices in EUR
- Consider ${city} market`;

    // Strong randomization
    const randomWords = ['Kora', 'Zeno', 'Vela', 'Nuri', 'Sola', 'Azul', 'Mira', 'Taro', 'Luna', 'Rizo'];
    const randomPick = randomWords[Math.floor(Math.random() * randomWords.length)];
    const timestamp = Date.now().toString(36);

    const userPrompt = `Create a menu with INVENTED, BRANDABLE dish names for:

Chef: ${chefName || 'Home Chef'}
City: ${city}, Netherlands  
Cuisines: ${cuisines?.join(', ') || 'Mixed'}
Dish Types: ${dishTypes?.join(', ') || 'Various'}

CRITICAL INSTRUCTION: Invent UNIQUE names like these examples (but create NEW ones):
- "${randomPick} Bowl" 
- "${chefName?.split(' ')[0] || 'Chef'}'s ${randomPick}"
- "${city} Velora"

DO NOT use: "Chef's Special", "Homestyle", "Classic", "Traditional", "Signature" - these are BANNED.

Generation ID: ${timestamp} (make this menu completely different from any other)

Create exactly:
- 5-6 main dishes with INVENTED brandable names + emoji
- 3-4 upsells with creative names

JSON format ONLY:
{
  "dishes": [
    {
      "name": "Invented Name 🍲",
      "description": "Appetizing 10-15 word description",
      "price": 12.50,
      "estimatedCost": 4.00,
      "margin": 68,
      "category": "main",
      "restaurantPrice": 18.00
    }
  ],
  "upsells": [
    { "name": "Creative Drink Name", "price": 2.50, "type": "drink" }
  ],
  "avgMargin": 65,
  "summary": "One sentence about this unique menu"
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
  const cityShort = city?.split(' ')[0] || 'Local';
  
  // Randomize fallback names too
  const nameOptions = [
    [`Koneo Bowl 🍲`, `Zafira Curry 🍛`, `Velora Plate 🥗`, `Nimboo Noodles 🍜`, `Solara Wrap 🌯`],
    [`Azura Feast 🍲`, `Miraan Spice 🍛`, `Taroko Grill 🥗`, `Lunara Stir 🍜`, `Rizova Roll 🌯`],
    [`${cityShort} Kora 🍲`, `Zenith Curry 🍛`, `Vela Garden 🥗`, `Nuri Wok 🍜`, `Sola Pocket 🌯`]
  ];
  const selectedNames = nameOptions[Math.floor(Math.random() * nameOptions.length)];
  
  return {
    dishes: [
      {
        name: selectedNames[0],
        description: "Signature bowl with fresh local ingredients and aromatic herbs",
        price: 11.50,
        estimatedCost: 3.80,
        margin: 67,
        category: "main",
        restaurantPrice: 16.00
      },
      {
        name: selectedNames[1],
        description: "Rich aromatic curry with fragrant basmati rice",
        price: 10.50,
        estimatedCost: 3.20,
        margin: 70,
        category: "main",
        restaurantPrice: 15.00
      },
      {
        name: selectedNames[2],
        description: "Grilled protein with rainbow seasonal vegetables",
        price: 12.00,
        estimatedCost: 4.50,
        margin: 63,
        category: "main",
        restaurantPrice: 17.00
      },
      {
        name: selectedNames[3],
        description: "Wok-tossed noodles with house secret sauce",
        price: 9.50,
        estimatedCost: 2.80,
        margin: 71,
        category: "main",
        restaurantPrice: 14.00
      },
      {
        name: selectedNames[4],
        description: "Handcrafted wrap bursting with bold flavors",
        price: 8.50,
        estimatedCost: 2.50,
        margin: 71,
        category: "main",
        restaurantPrice: 12.00
      }
    ],
    upsells: [
      { name: "Zesti Fizz", price: 2.00, type: "drink" },
      { name: "Fresca Juice", price: 3.50, type: "drink" },
      { name: "Cloudy Rice", price: 2.50, type: "side" },
      { name: "Dolci Dream", price: 4.00, type: "dessert" }
    ],
    avgMargin: 68,
    summary: `Unique ${cuisineType} creations crafted with love in ${city}`
  };
}
