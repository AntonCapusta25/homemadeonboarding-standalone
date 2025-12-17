import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Background prompt mappings
const BACKGROUND_PROMPTS: Record<string, string> = {
  cozy_wooden_table:
    "A rustic wooden table with warm tones and a minimalist food setup. The soft window light highlights the food, creating a cozy, inviting feel perfect for homey and comforting meals.",
  high_contrast_studio:
    "A dramatic studio setting with high-contrast lighting and a dark background. The softbox creates deep shadows, emphasizing intricate details and textures in the food, giving it an editorial, modern look.",
  bright_and_airy:
    "A fresh and open setup with soft natural daylight coming from a north-facing window. The neutral textured surface and minimal props give it a clean, light, and refreshing vibe, ideal for showcasing simple, fresh dishes.",
  neutral_modern_look:
    "A sleek, neutral grey backdrop with clean studio lighting, creating a polished and modern atmosphere. The food takes center stage in an editorial style, with minimal distractions and a sharp focus on details.",
  luxury_marble_surface:
    "A chic white marble surface with subtle grey veins, accented by soft side light from natural sources. The clean, bright setup exudes luxury and elegance, perfect for high-end or refined dishes.",
  rustic_wooden_charm:
    "A warm, earthy background featuring a dark wooden table with visible grain. Directional lighting enhances the natural beauty of the wood and fresh herbs, giving the scene a rustic, homey charm with a touch of sophistication.",
  moody_concrete_background:
    "A moody, urban look with a rough concrete surface and deep shadows created by softbox lighting. This setup highlights the food's textures and creates a contemporary, edgy atmosphere.",
  fresh_pastel_vibes:
    "A light, soft pastel-painted background that evokes freshness and springtime vibes. The soft natural light and minimal props create a relaxed, approachable, and inviting feel—perfect for colorful and vibrant dishes.",
  earthy_slate_surface:
    "A natural, earthy slate stone slab serves as the backdrop, with directional lighting from the side to highlight the textures of the dish. The dark, grounded tone enhances the food's colors and creates an elegant, sophisticated look.",
  bold_black_backdrop:
    "A dramatic matte black acrylic background, with sharp, high-contrast studio lighting to accentuate the food's shape and texture. This setup gives a modern, minimalist look with bold emphasis on the dish, ideal for high-contrast, edgy food presentations.",
};

// Ambience prompt mappings
const AMBIENCE_PROMPTS: Record<string, string> = {
  soft_window_light:
    "Lighting: Soft window light from the left side with white reflector bounce on the right. Lens: 85mm f/1.4. Shot Details: 45-degree angle, shallow depth of field (f/1.4), sharp focus on dish and garnish. Style: Minimalist food styling",
  studio_lighting_100mm:
    "Lighting: Studio lighting with large softbox at 45 degrees. Lens: 100mm f/2.8 (macro). Shot Details: Extreme close-up, focused on texture and surface details",
  natural_daylight:
    "Lighting: Soft diffused natural daylight from a north-facing window. Lens: 50mm f/2.2. Shot Details: Top-down view, neutral textured surface",
  studio_light_100mm:
    "Lighting: Clean studio light setup using Aputure 600D with dome softbox. Lens: 100mm f/2.8. Shot Details: Key light from top left, fill light on the right",
  natural_side_light:
    "Lighting: Soft natural side light through sheer curtains. Lens: 50mm f/1.8. Shot Details: Elegant plating with minimal props",
  warm_directional_light:
    "Lighting: Warm directional lighting from the left. Lens: 85mm f/1.4",
  moody_softbox:
    "Lighting: Softbox lighting with deep shadows. Lens: 100mm f/2.8 (macro). Shot Details: High detail on surface reflections and textures",
  natural_light:
    "Lighting: Soft natural light with minimal shadows. Lens: 50mm f/2.0. Shot Details: Styled with garnishes and accompaniments",
  directional_light:
    "Lighting: Directional light from the right, slight vignette effect. Lens: 100mm f/2.8 (macro)",
  dramatic_studio_light:
    "Lighting: Dramatic studio lighting with edge highlights. Lens: 85mm f/1.4. Shot Details: High-contrast lighting",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const recraftApiKey = Deno.env.get("RECRAFT_API_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!recraftApiKey) {
      throw new Error("RECRAFT_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { chef_profile_id, menu_id, ambience, background } = await req.json();

    if (!chef_profile_id && !menu_id) {
      throw new Error("Either chef_profile_id or menu_id is required");
    }

    // Default settings
    const selectedAmbience = ambience || "soft_window_light";
    const selectedBackground = background || "cozy_wooden_table";

    console.log(`Starting image generation with ambience: ${selectedAmbience}, background: ${selectedBackground}`);

    // Fetch dishes from database
    let dishes: any[] = [];
    let targetMenuId = menu_id;

    if (chef_profile_id && !menu_id) {
      // Get active menu for chef
      const { data: menu, error: menuError } = await supabase
        .from("menus")
        .select("id")
        .eq("chef_profile_id", chef_profile_id)
        .eq("is_active", true)
        .maybeSingle();

      if (menuError) throw menuError;
      if (!menu) throw new Error("No active menu found for this chef");
      targetMenuId = menu.id;
    }

    const { data: dishesData, error: dishesError } = await supabase
      .from("dishes")
      .select("*")
      .eq("menu_id", targetMenuId)
      .order("sort_order", { ascending: true });

    if (dishesError) throw dishesError;
    dishes = dishesData || [];

    if (dishes.length === 0) {
      throw new Error("No dishes found in the menu");
    }

    console.log(`Found ${dishes.length} dishes to generate images for`);

    const results: any[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < dishes.length; i++) {
      const dish = dishes[i];
      console.log(`Processing dish ${i + 1}/${dishes.length}: ${dish.name}`);

      try {
        // Generate optimized prompt
        const optimizedPrompt = await generateOptimizedPrompt(
          { name: dish.name, description: dish.description || "" },
          selectedAmbience,
          selectedBackground,
          openaiApiKey
        );
        console.log(`Generated prompt for ${dish.name}`);

        // Generate image with Recraft
        const imageUrl = await generateImageWithRecraft(optimizedPrompt, dish.name, recraftApiKey);
        console.log(`✅ Recraft image generated for ${dish.name}`);

        // Download and upload to Supabase storage
        const storedUrl = await uploadToStorage(supabase, imageUrl, dish.id);
        console.log(`✅ Image stored in Supabase: ${storedUrl}`);

        // Update dish with image URL
        const { error: updateError } = await supabase
          .from("dishes")
          .update({ image_url: storedUrl })
          .eq("id", dish.id);

        if (updateError) {
          console.error(`Failed to update dish ${dish.id}:`, updateError);
        }

        results.push({
          dish_id: dish.id,
          dish_name: dish.name,
          image_url: storedUrl,
          status: "success",
        });
        successCount++;
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error processing ${dish.name}:`, errMsg);
        results.push({
          dish_id: dish.id,
          dish_name: dish.name,
          status: "error",
          error: errMsg,
        });
        errorCount++;
      }
    }

    console.log(`🎉 Image generation completed! Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        menu_id: targetMenuId,
        total_dishes: dishes.length,
        success_count: successCount,
        error_count: errorCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Error in generate-menu-images:", errMsg);
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateOptimizedPrompt(
  dish: { name: string; description: string },
  ambienceKey: string,
  backgroundKey: string,
  openaiApiKey?: string
): Promise<string> {
  const backgroundPrompt = BACKGROUND_PROMPTS[backgroundKey] || BACKGROUND_PROMPTS.cozy_wooden_table;
  const ambiencePrompt = AMBIENCE_PROMPTS[ambienceKey] || AMBIENCE_PROMPTS.soft_window_light;

  // If no OpenAI key, use a good fallback prompt
  if (!openaiApiKey) {
    return `Professional food photography of ${dish.name}. ${dish.description}. ${backgroundPrompt} ${ambiencePrompt}. Restaurant quality, high resolution, appetizing presentation, detailed textures, vibrant colors. No text, no labels, no writing.`;
  }

  const systemMessage = `You are an expert food photography prompt engineer. Create a detailed, optimized prompt for an AI image generation model to create a professional restaurant-quality photo of a dish. The prompt should be professional, specific, and focused on achieving stunning food photography.

Guidelines:
- Combine the provided background and ambience settings seamlessly
- Include specific technical photography details
- Emphasize food styling and presentation quality
- Make the prompt concise but comprehensive (under 800 characters)
- Focus on professional food photography aesthetics
- DO NOT include any text, labels, or writing in the image`;

  const userMessage = `Create an optimized prompt for generating a professional food photograph of "${dish.name}".

Dish Description: ${dish.description}

Background Setting: ${backgroundPrompt}

Ambience/Technical Settings: ${ambiencePrompt}

Create a single, cohesive prompt that will produce a stunning, professional food photograph. Keep it under 800 characters and ensure no text appears in the image.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API Error: ${response.status} - ${errorText}`);
      throw new Error(`OpenAI API Error: ${response.status}`);
    }

    const result = await response.json();
    if (result.choices?.[0]?.message?.content) {
      return result.choices[0].message.content.trim();
    }
    throw new Error("Invalid OpenAI response structure");
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("OpenAI API error, using fallback:", errMsg);
    return `Professional food photography of ${dish.name}. ${dish.description}. ${backgroundPrompt} ${ambiencePrompt}. Restaurant quality, high resolution, appetizing presentation, detailed textures, vibrant colors. No text, no labels, no writing.`;
  }
}

async function generateImageWithRecraft(
  prompt: string,
  dishName: string,
  apiKey: string
): Promise<string> {
  let cleanPrompt = prompt.trim();
  if (!cleanPrompt || cleanPrompt.length === 0) {
    cleanPrompt = "Professional food photography, restaurant quality, high resolution, well lit, appetizing presentation";
  }
  if (cleanPrompt.length > 1000) {
    cleanPrompt = cleanPrompt.substring(0, 997) + "...";
  }

  const MAX_RETRIES = 3;
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`Recraft API attempt ${attempt} of ${MAX_RETRIES} for ${dishName}`);

    try {
      const requestBody = {
        prompt: cleanPrompt,
        style: "realistic_image",
        model: "recraftv3",
        response_format: "url",
        size: "1024x1024",
        n: 1,
        negative_prompt: `${dishName}, text, writing, labels, words, letters, menu text, price tags`,
      };

      const response = await fetch("https://external.api.recraft.ai/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Recraft response status:", response.status);

      if (response.ok) {
        const result = await response.json();
        if (result.data?.[0]?.url) {
          console.log(`✅ Recraft API success for ${dishName}`);
          return result.data[0].url;
        } else {
          lastError = `Unexpected Recraft API response structure: ${JSON.stringify(result)}`;
          console.error(lastError);
        }
      } else if (response.status >= 500) {
        const errorText = await response.text();
        lastError = `Recraft API server error: ${response.status} - ${errorText}`;
        console.error(lastError);
        if (attempt < MAX_RETRIES) {
          console.log(`Retrying in ${2000 * attempt}ms...`);
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        }
      } else if (response.status === 429) {
        const errorText = await response.text();
        lastError = `Recraft API rate limited: ${errorText}`;
        console.error(lastError);
        if (attempt < MAX_RETRIES) {
          console.log(`Rate limited, retrying in ${5000 * attempt}ms...`);
          await new Promise((resolve) => setTimeout(resolve, 5000 * attempt));
        }
      } else {
        const errorText = await response.text();
        lastError = `Recraft API client error: ${response.status} - ${errorText}`;
        console.error(lastError);
        break;
      }
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error(`Attempt ${attempt} failed:`, lastError);
      if (attempt < MAX_RETRIES) {
        console.log(`Network error, retrying in ${2000 * attempt}ms...`);
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  throw new Error(`Recraft API failed after ${MAX_RETRIES} attempts. Last error: ${lastError}`);
}

async function uploadToStorage(
  supabase: any,
  imageUrl: string,
  dishId: string
): Promise<string> {
  // Download image from Recraft
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const imageBlob = await response.blob();
  const fileName = `${dishId}-${Date.now()}.webp`;

  // Upload to Supabase storage
  const { data, error } = await supabase.storage
    .from("menu-images")
    .upload(fileName, imageBlob, {
      contentType: "image/webp",
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: publicUrl } = supabase.storage.from("menu-images").getPublicUrl(fileName);

  return publicUrl.publicUrl;
}
