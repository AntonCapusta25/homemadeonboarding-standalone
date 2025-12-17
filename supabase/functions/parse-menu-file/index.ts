import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedDish {
  name: string;
  description: string | null;
  price: number;
  category: string;
  is_upsell: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, filename, isBase64 } = await req.json();

    if (!content) {
      return new Response(JSON.stringify({ success: false, error: "No content provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a menu parser. Extract dishes from the provided menu and return them as a JSON array.

Each dish should have:
- name: The dish name (string)
- description: A brief description (string or null)
- price: The price as a number (e.g., 12.50)
- category: One of "Main Dishes", "Drinks", "Desserts", "Extras", "Appetizers", "Sides", "Soups", "Salads"
- is_upsell: Boolean - true for drinks, desserts, and extras/sides; false for main dishes

Important rules:
- Always return a valid JSON array
- Extract prices as numbers (strip currency symbols like €, $, etc.)
- If price is missing, estimate a reasonable price based on the dish type
- Categorize dishes appropriately based on their names/descriptions
- Set is_upsell=true for drinks, desserts, sides, extras
- Clean up formatting and remove any artifacts from the source format

Return ONLY the JSON array, no other text.`;

    let userPrompt: string;
    let messages: any[];

    if (isBase64) {
      // Handle image input with vision API
      const base64Data = content.split(",")[1]; // Remove data:image/...;base64, prefix
      const mimeType = content.match(/data:(image\/[^;]+);/)?.[1] || "image/jpeg";

      userPrompt = `Parse this menu image and extract all dishes as JSON. The image shows a restaurant menu.`;

      messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`,
              },
            },
          ],
        },
      ];
    } else {
      // Handle text input
      userPrompt = `Parse this menu content and extract all dishes as JSON:

Filename: ${filename || "menu"}

Content:
${content}`;

      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp",
        messages,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ success: false, error: "AI service error", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const messageContent = aiResponse.choices?.[0]?.message?.content || "";

    console.log("AI Response:", JSON.stringify(aiResponse, null, 2));
    console.log("Message content:", messageContent);

    if (!messageContent || messageContent.trim() === "") {
      console.error("Empty AI response received");
      return new Response(
        JSON.stringify({
          success: false,
          error: "AI returned empty response. The menu might be too complex or unclear.",
          details: "Try uploading a clearer image or a different format.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
      console.error("Failed to parse AI response:", messageContent);
      console.error("Parse error:", parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to parse menu data. AI response was not valid JSON.",
          raw: messageContent.substring(0, 500), // Limit to first 500 chars
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate and clean dishes
    const cleanedDishes = dishes.map((dish: any, index: number) => ({
      name: String(dish.name || `Dish ${index + 1}`).trim(),
      description: dish.description ? String(dish.description).trim() : null,
      price: Number(dish.price) || 10.0,
      category: dish.category || "Main Dishes",
      is_upsell: Boolean(dish.is_upsell),
    }));

    return new Response(JSON.stringify({ success: true, dishes: cleanedDishes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Parse menu error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
