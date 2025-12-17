import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HYPERZOD_API_KEY = Deno.env.get("HYPERZOD_API_KEY");
const RECRAFT_API_KEY = Deno.env.get("RECRAFT_API_KEY");
const TENANT_ID = "3331";
const HYPERZOD_BASE_URL = "https://api.hyperzod.app";
const RECRAFT_API_URL = "https://external.api.recraft.ai/v1/images/generations";

interface JobParams {
  chef_profile_id: string;
  chef: any;
  menu_id?: string;
  ambience?: string;
  background?: string;
  cuisines?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { chef_profile_id, chef, menu_id, ambience, background, cuisines }: JobParams = await req.json();

    if (!chef_profile_id || !chef) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing chef_profile_id or chef data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('merchant_setup_jobs')
      .insert({
        chef_profile_id,
        status: 'processing',
        current_step: 'Creating merchant...',
        ambience: ambience || 'warm',
        background_style: background || 'rustic_wood',
      })
      .select()
      .single();

    if (jobError) {
      console.error('Failed to create job:', jobError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create job record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Job ${job.id} created for chef ${chef_profile_id}`);

    // Process synchronously (no background work)
    await processJob(supabase, job.id, chef, menu_id, ambience, background, cuisines);

    const { data: finalJob } = await supabase
      .from('merchant_setup_jobs')
      .select('status, current_step, merchant_id, images_generated, dishes_imported, error_message')
      .eq('id', job.id)
      .single();

    const ok = finalJob?.status === 'completed';

    return new Response(
      JSON.stringify({
        success: ok,
        job_id: job.id,
        status: finalJob?.status || null,
        current_step: finalJob?.current_step || null,
        merchant_id: finalJob?.merchant_id || null,
        images_generated: finalJob?.images_generated || 0,
        dishes_imported: finalJob?.dishes_imported || 0,
        error: ok ? null : (finalJob?.error_message || 'Setup failed'),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error starting job:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processJob(
  supabase: any,
  jobId: string,
  chef: any,
  menuId?: string,
  ambience?: string,
  background?: string,
  cuisines?: string[]
) {
  const updateJob = async (updates: any) => {
    await supabase.from('merchant_setup_jobs').update(updates).eq('id', jobId);
  };

  try {
    // Step 1: Create Hyperzod merchant
    console.log(`[Job ${jobId}] Creating merchant...`);
    await updateJob({ current_step: 'Creating merchant...' });

    const merchantResult = await createHyperzodMerchant(chef);
    
    if (!merchantResult.success) {
      throw new Error(`Merchant creation failed: ${merchantResult.error}`);
    }

    const merchantId = merchantResult.merchant_id;
    await updateJob({ merchant_id: merchantId, current_step: 'Merchant created' });
    
    // Save merchant ID to chef profile
    await supabase
      .from('chef_profiles')
      .update({ hyperzod_merchant_id: merchantId })
      .eq('id', chef.id);

    console.log(`[Job ${jobId}] Merchant created: ${merchantId}`);

    // Step 2: Get menu and generate images
    let dishes: any[] = [];
    if (menuId) {
      await updateJob({ current_step: 'Fetching menu...' });
      
      const { data: dishesData } = await supabase
        .from('dishes')
        .select('id, name, description, price, category, is_upsell, image_url')
        .eq('menu_id', menuId)
        .order('sort_order', { ascending: true });

      dishes = dishesData || [];
      console.log(`[Job ${jobId}] Found ${dishes.length} dishes`);

      if (dishes.length > 0) {
        // Generate images
        await updateJob({ current_step: 'Generating images...' });
        let imagesGenerated = 0;

        for (let i = 0; i < dishes.length; i++) {
          const dish = dishes[i];
          await updateJob({ current_step: `Generating image ${i + 1}/${dishes.length}...` });

          try {
            const imageUrl = await generateDishImage(dish, ambience, background, cuisines);
            if (imageUrl) {
              await supabase
                .from('dishes')
                .update({ image_url: imageUrl })
                .eq('id', dish.id);
              
              dish.image_url = imageUrl;
              imagesGenerated++;
              await updateJob({ images_generated: imagesGenerated });
            }
          } catch (imgErr) {
            console.error(`[Job ${jobId}] Image generation failed for ${dish.name}:`, imgErr);
          }
        }

        console.log(`[Job ${jobId}] Generated ${imagesGenerated} images`);
      }
    }

    // Step 3: Import menu to Hyperzod
    if (dishes.length > 0) {
      await updateJob({ current_step: 'Importing to Hyperzod...' });
      
      const importResult = await importMenuToHyperzod(merchantId, dishes);
      await updateJob({ dishes_imported: importResult.successful_count });
      
      console.log(`[Job ${jobId}] Imported ${importResult.successful_count} dishes`);
    }

    // Complete
    await updateJob({
      status: 'completed',
      current_step: 'Complete!',
      completed_at: new Date().toISOString(),
    });

    console.log(`[Job ${jobId}] Completed successfully`);

  } catch (err: any) {
    console.error(`[Job ${jobId}] Failed:`, err);
    await updateJob({
      status: 'failed',
      error_message: err.message,
      current_step: 'Failed',
    });
  }
}

async function createHyperzodMerchant(chef: any) {
  const planCommissions: Record<string, number> = {
    starter: 10,
    growth: 12,
    pro: 14,
  };

  const payload = {
    name: chef.business_name || chef.chef_name || 'Home Chef',
    phone: chef.contact_phone || '',
    email: chef.contact_email || '',
    address: chef.address || '',
    city: chef.city || '',
    country: 'NL',
    postal_code: '',
    merchant_commission: planCommissions[chef.plan || 'starter'] || 10,
    tax_method: 'inclusive',
    status: 1,
  };

  const response = await fetch(`${HYPERZOD_BASE_URL}/admin/v1/merchant/create`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-tenant': TENANT_ID,
      'x-api-key': HYPERZOD_API_KEY || '',
    },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  console.log('Hyperzod merchant status:', response.status);
  console.log('Hyperzod merchant response:', rawText.substring(0, 1000));

  let data: any = null;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { raw: rawText };
  }

  if (!response.ok) {
    return { success: false, error: data?.message || data?.error || `HTTP ${response.status}` };
  }

  const merchantId = data?.data?._id || data?.data?.merchant_id;
  if (!merchantId) {
    return { success: false, error: data?.message || 'Merchant created but no merchant_id returned' };
  }

  return { success: true, merchant_id: merchantId };
}

async function generateDishImage(
  dish: any,
  ambience?: string,
  background?: string,
  cuisines?: string[]
) {
  const cuisineStr = cuisines?.length ? cuisines.join(', ') : 'international';
  const bgDesc = getBackgroundDescription(background || 'rustic_wood');
  const ambienceDesc = getAmbienceDescription(ambience || 'warm');

  const prompt = `Professional food photography of ${dish.name}${dish.description ? `: ${dish.description}` : ''}. ${cuisineStr} cuisine style. ${bgDesc}. ${ambienceDesc}. Appetizing presentation, no text, no labels, no watermarks. Ultra high quality food photo.`;

  const response = await fetch(RECRAFT_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RECRAFT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      model: 'recraftv3',
      style: 'realistic_image',
      size: '1024x1024',
      n: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Recraft API error: ${response.status}`);
  }

  const data = await response.json();
  const imageUrl = data.data?.[0]?.url;

  if (!imageUrl) {
    throw new Error('No image URL in response');
  }

  // Download and upload to Supabase
  const imageResponse = await fetch(imageUrl);
  const imageBlob = await imageResponse.blob();
  const imageBuffer = new Uint8Array(await imageBlob.arrayBuffer());

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const fileName = `${dish.id}-${Date.now()}.webp`;
  const { error: uploadError } = await supabase.storage
    .from('menu-images')
    .upload(fileName, imageBuffer, { contentType: 'image/webp', upsert: true });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: publicUrl } = supabase.storage.from('menu-images').getPublicUrl(fileName);
  return publicUrl.publicUrl;
}

async function importMenuToHyperzod(merchantId: string, dishes: any[]) {
  // Create categories
  const mainCategoryId = await createCategory(merchantId, 'Main Dishes');
  const extrasCategoryId = await createCategory(merchantId, 'Extras');

  let successfulCount = 0;

  for (const dish of dishes) {
    try {
      const categoryId = dish.is_upsell ? extrasCategoryId : mainCategoryId;
      const cleanName = dish.name.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();

      const productPayload: any = {
        name: cleanName,
        description: dish.description || '',
        category_id: categoryId,
        product_pricing: {
          type: 'flat',
          price_sell: Number(dish.price).toFixed(2),
        },
        status: 'ACTIVE',
        inventory: 100,
      };

      if (dish.image_url) {
        productPayload.product_images = [{ file_url: dish.image_url, is_cover: true }];
      }

      const response = await fetch(`${HYPERZOD_BASE_URL}/merchant/v1/product/create`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-tenant': TENANT_ID,
          'x-api-key': HYPERZOD_API_KEY || '',
          'x-merchant': merchantId,
        },
        body: JSON.stringify(productPayload),
      });

      if (response.ok) {
        successfulCount++;
      }
    } catch (err) {
      console.error(`Failed to import ${dish.name}:`, err);
    }
  }

  return { successful_count: successfulCount };
}

async function createCategory(merchantId: string, name: string) {
  const response = await fetch(`${HYPERZOD_BASE_URL}/merchant/v1/category/create`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-tenant': TENANT_ID,
      'x-api-key': HYPERZOD_API_KEY || '',
      'x-merchant': merchantId,
    },
    body: JSON.stringify({ name, status: true }),
  });

  const data = await response.json();
  return data.data?._id || data.data?.category_id;
}

function getBackgroundDescription(bg: string) {
  const descriptions: Record<string, string> = {
    rustic_wood: 'On a rustic wooden table with natural wood grain texture',
    marble: 'On an elegant white marble surface with subtle veining',
    slate: 'On a dark slate board with matte texture',
    linen: 'On a natural linen tablecloth with soft fabric texture',
    ceramic: 'On a ceramic plate with artisan pottery styling',
  };
  return descriptions[bg] || descriptions.rustic_wood;
}

function getAmbienceDescription(amb: string) {
  const descriptions: Record<string, string> = {
    warm: 'Warm golden lighting, cozy atmosphere',
    bright: 'Bright natural daylight, clean and fresh',
    moody: 'Dramatic dark and moody lighting with deep shadows',
    natural: 'Soft natural window light, homestyle feel',
  };
  return descriptions[amb] || descriptions.warm;
}
