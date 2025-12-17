import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Clean background prompt mappings - focused on surface and setting only
const BACKGROUND_PROMPTS: Record<string, string> = {
  cozy_wooden_table:
    "Dark oak wooden table surface with visible natural grain. Simple, clean composition with the dish as the sole focus.",
  clean_marble:
    "White Carrara marble surface with subtle grey veining. Bright, clean, and luxurious setting.",
  rustic_kitchen:
    "Weathered farmhouse wooden surface with a neutral linen napkin. Warm, homey atmosphere.",
  modern_minimal:
    "Sleek matte grey concrete surface. Contemporary, clean lines with minimal styling.",
  outdoor_garden:
    "Natural stone surface with soft outdoor daylight. Fresh, organic garden atmosphere.",
  neutral_studio:
    "Neutral grey seamless backdrop. Professional studio setting with clean edges.",
  dark_moody:
    "Dark slate surface with dramatic shadows. Rich, sophisticated mood.",
  light_airy:
    "White painted wood surface with bright, diffused lighting. Fresh and inviting.",
};

// Clean ambience/lighting prompt mappings - technical photography focus
const AMBIENCE_PROMPTS: Record<string, string> = {
  soft_window_light:
    "Soft diffused natural window light from the left. Gentle shadows, warm tones. 85mm lens, f/2.8, shallow depth of field.",
  warm_golden_hour:
    "Warm golden hour lighting with soft orange tones. Cozy, inviting atmosphere. 50mm lens, f/1.8.",
  bright_studio:
    "Bright, even studio lighting with softbox from above. Clean, commercial look. 100mm macro lens, f/4.",
  moody_dramatic:
    "Single directional light source creating deep shadows. High contrast, dramatic mood. 85mm lens, f/2.",
  natural_daylight:
    "Soft overcast natural daylight. Even, flattering light with minimal shadows. 50mm lens, f/2.2.",
  overhead_soft:
    "Soft overhead lighting with white bounce cards. Flat lay style, even illumination. Top-down shot.",
  side_rim:
    "Side lighting with rim highlights. Emphasizes texture and steam. 100mm lens, f/2.8.",
  backlit_glow:
    "Backlit setup with soft fill from front. Creates a glowing, ethereal quality. 85mm lens, f/1.4.",
};

// Cuisine-specific styling prompts
const CUISINE_PROMPTS: Record<string, string> = {
  italian: "Mediterranean styling with olive oil drizzle, fresh basil, rustic ceramic plate.",
  indian: "Vibrant colors, brass or copper serving bowl, aromatic spices visible, naan or rice accompaniment.",
  pakistani: "Rich earthy tones, traditional serving style, aromatic presentation with fresh herbs.",
  chinese: "Elegant plating on white porcelain, chopsticks nearby, precise garnish arrangement.",
  japanese: "Minimalist presentation, clean lines, zen aesthetic, beautiful negative space.",
  thai: "Fresh herbs garnish, vibrant colors, traditional bowl or banana leaf element.",
  mexican: "Bold colors, lime wedge, fresh cilantro, rustic earthenware.",
  french: "Elegant plating, refined sauce work, delicate garnish, fine dining presentation.",
  american: "Generous portions, comfort food styling, casual elegant presentation.",
  mediterranean: "Fresh vegetables, olive oil sheen, herbs, bright and healthy aesthetic.",
  dutch: "Simple, hearty presentation, traditional comfort food styling.",
  turkish: "Warm spices visible, copper or brass elements, generous herbs.",
  greek: "Fresh, bright colors, feta crumbles, olive oil, Mediterranean herbs.",
  spanish: "Tapas-style presentation, saffron tones, rustic ceramic.",
  vietnamese: "Fresh herbs, light and fresh presentation, subtle elegance.",
  korean: "Banchan-style arrangement, fermented elements, vibrant colors.",
  ethiopian: "Injera presentation, communal style, rich spice colors.",
  moroccan: "Tagine presentation, warm spices, dried fruits, ornate serving.",
  caribbean: "Tropical colors, vibrant presentation, fresh fruit garnish.",
  lebanese: "Mezze-style, fresh parsley, hummus swirl, pita elements.",
  persian: "Saffron rice, jeweled presentation, elegant garnishes.",
  indonesian: "Banana leaf elements, sambal on side, tropical presentation.",
  african: "Earthy tones, traditional serving style, rich colors.",
  fusion: "Modern creative plating, artistic presentation, contemporary style.",
  homemade: "Comforting home-style presentation, generous portions, inviting warmth.",
  default: "Professional restaurant plating, appetizing presentation, balanced composition.",
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

    const { chef_profile_id, menu_id, ambience, background, cuisines } = await req.json();

    if (!chef_profile_id && !menu_id) {
      throw new Error("Either chef_profile_id or menu_id is required");
    }

    // Default settings
    const selectedAmbience = ambience || "soft_window_light";
    const selectedBackground = background || "cozy_wooden_table";
    const cuisineList: string[] = cuisines || [];

    console.log(`Starting image generation with ambience: ${selectedAmbience}, background: ${selectedBackground}, cuisines: ${cuisineList.join(", ")}`);

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
          cuisineList,
          openaiApiKey
        );
        console.log(`Generated prompt for ${dish.name}`);

        // Generate image with Recraft
        const imageUrl = await generateImageWithRecraft(optimizedPrompt, recraftApiKey);
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

function getCuisinePrompt(cuisines: string[]): string {
  if (!cuisines || cuisines.length === 0) {
    return CUISINE_PROMPTS.default;
  }
  
  // Get prompts for all matching cuisines
  const prompts: string[] = [];
  for (const cuisine of cuisines) {
    const key = cuisine.toLowerCase().replace(/\s+/g, "");
    if (CUISINE_PROMPTS[key]) {
      prompts.push(CUISINE_PROMPTS[key]);
    }
  }
  
  // Return first matching or default
  return prompts.length > 0 ? prompts[0] : CUISINE_PROMPTS.default;
}

async function generateOptimizedPrompt(
  dish: { name: string; description: string },
  ambienceKey: string,
  backgroundKey: string,
  cuisines: string[],
  openaiApiKey?: string
): Promise<string> {
  const backgroundPrompt = BACKGROUND_PROMPTS[backgroundKey] || BACKGROUND_PROMPTS.cozy_wooden_table;
  const ambiencePrompt = AMBIENCE_PROMPTS[ambienceKey] || AMBIENCE_PROMPTS.soft_window_light;
  const cuisinePrompt = getCuisinePrompt(cuisines);

  const basePrompt = `Professional food photography of "${dish.name}". ${dish.description ? dish.description + "." : ""} ${backgroundPrompt} ${ambiencePrompt} ${cuisinePrompt} High resolution, appetizing, sharp focus on food. ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO LABELS, NO WATERMARKS.`;

  // If no OpenAI key, use the base prompt
  if (!openaiApiKey) {
    return basePrompt;
  }

  const systemMessage = `You are an expert food photography prompt engineer. Create a concise, optimized prompt for AI image generation of a professional restaurant-quality food photo.

CRITICAL RULES:
- Output ONLY the prompt, no explanations
- Keep under 600 characters
- Focus on: dish appearance, plating, lighting, composition
- NEVER include any request for text, words, labels, or writing
- End with: "No text, no words, no labels, no watermarks."
- Do not add random objects or decorations not related to the dish
- Keep the composition simple and focused on the food`;

  const userMessage = `Create a food photography prompt for: "${dish.name}"
Description: ${dish.description || "A delicious dish"}
Background: ${backgroundPrompt}
Lighting: ${ambiencePrompt}
Cuisine style: ${cuisinePrompt}`;

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
        max_tokens: 250,
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API Error: ${response.status} - ${errorText}`);
      throw new Error(`OpenAI API Error: ${response.status}`);
    }

    const result = await response.json();
    if (result.choices?.[0]?.message?.content) {
      let prompt = result.choices[0].message.content.trim();
      // Ensure no-text instruction is always present
      if (!prompt.toLowerCase().includes("no text")) {
        prompt += " No text, no words, no labels, no watermarks.";
      }
      return prompt;
    }
    throw new Error("Invalid OpenAI response structure");
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("OpenAI API error, using fallback:", errMsg);
    return basePrompt;
  }
}

async function generateImageWithRecraft(
  prompt: string,
  apiKey: string
): Promise<string> {
  let cleanPrompt = prompt.trim();
  if (!cleanPrompt || cleanPrompt.length === 0) {
    cleanPrompt = "Professional food photography, restaurant quality, high resolution, well lit, appetizing presentation. No text, no labels.";
  }
  if (cleanPrompt.length > 1000) {
    cleanPrompt = cleanPrompt.substring(0, 997) + "...";
  }

  const MAX_RETRIES = 3;
  let lastError = "";

  // Strong negative prompt to prevent text and random objects
  const negativePrompt = "text, words, letters, writing, labels, menu, price, watermark, logo, signature, caption, title, numbers, typography, font, handwriting, stamp, badge, sticker, banner, random objects, clutter, mess, unrelated items, decorations, toys, figurines, people, hands, faces";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`Recraft API attempt ${attempt} of ${MAX_RETRIES}`);

    try {
      const requestBody = {
        prompt: cleanPrompt,
        style: "realistic_image",
        model: "recraftv3",
        response_format: "url",
        size: "1024x1024",
        n: 1,
        negative_prompt: negativePrompt,
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
          console.log(`✅ Recraft API success`);
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
