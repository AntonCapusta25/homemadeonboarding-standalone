import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Chef {
  id: string;
  business_name?: string;
  chef_name?: string;
  address?: string;
  city?: string;
  contact_email?: string;
  contact_phone?: string;
  cuisines?: string[];
  service_type?: string;
}

interface SetupRequest {
  chef: Chef;
  ambience?: string;
  background_style?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const hyperzodApiKey = Deno.env.get('HYPERZOD_API_KEY');
  const recraftApiKey = Deno.env.get('RECRAFT_API_KEY');

  try {
    const { chef, ambience = 'soft_window_light', background_style = 'cozy_wooden_table' }: SetupRequest = await req.json();

    if (!chef?.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Chef data with id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[run-merchant-setup] Starting setup for chef ${chef.id}`);

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('merchant_setup_jobs')
      .insert({
        chef_profile_id: chef.id,
        status: 'running',
        current_step: 'initializing',
        ambience,
        background_style,
      })
      .select()
      .single();

    if (jobError) {
      console.error('[run-merchant-setup] Failed to create job:', jobError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create job record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jobId = job.id;
    console.log(`[run-merchant-setup] Created job ${jobId}`);

    // Helper to update job status
    const updateJob = async (updates: Record<string, any>) => {
      const { error } = await supabase
        .from('merchant_setup_jobs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', jobId);
      if (error) console.error('[run-merchant-setup] Job update error:', error);
    };

    // Run the setup in background
    const runSetup = async () => {
      try {
        // Step 1: Create merchant
        await updateJob({ current_step: 'creating_merchant' });
        console.log(`[run-merchant-setup] Step 1: Creating merchant...`);

        const TENANT_ID = '67de2dd5d0cf03a9a79b8c72';
        const BASE_URL = 'https://api.hyperzod.dev';

        // Build merchant payload
        const extractPostalCode = (address?: string): string => {
          if (!address) return '0000XX';
          const match = address.match(/\b(\d{4}\s?[A-Za-z]{2})\b/);
          return match ? match[1].replace(/\s/g, '').toUpperCase() : '0000XX';
        };

        const mapServiceType = (serviceType?: string): string => {
          switch (serviceType) {
            case 'delivery': return 'delivery';
            case 'pickup': return 'pickup';
            case 'both': return 'delivery_and_pickup';
            default: return 'delivery_and_pickup';
          }
        };

        const merchantPayload = {
          tenant_id: TENANT_ID,
          name: chef.business_name || chef.chef_name || 'Unnamed Restaurant',
          email: chef.contact_email || `chef-${chef.id.slice(0, 8)}@homemade.nl`,
          phone_number: chef.contact_phone || '+31600000000',
          password: `HomeMade${Date.now()}!`,
          address: {
            line_1: chef.address || 'Address TBD',
            line_2: '',
            city: chef.city || 'Amsterdam',
            state: 'Noord-Holland',
            country: 'Netherlands',
            country_code: 'NL',
            zip_code: extractPostalCode(chef.address),
            latitude: 52.3676,
            longitude: 4.9041,
          },
          commission: 15,
          is_active: true,
          configuration: {
            minimum_order_amount: 15,
            service_type: mapServiceType(chef.service_type),
            schedule: {
              monday: { open: '10:00', close: '21:00', is_closed: false },
              tuesday: { open: '10:00', close: '21:00', is_closed: false },
              wednesday: { open: '10:00', close: '21:00', is_closed: false },
              thursday: { open: '10:00', close: '21:00', is_closed: false },
              friday: { open: '10:00', close: '21:00', is_closed: false },
              saturday: { open: '11:00', close: '22:00', is_closed: false },
              sunday: { open: '11:00', close: '20:00', is_closed: false },
            },
          },
        };

        const createResponse = await fetch(`${BASE_URL}/admin/v1/merchant/create`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hyperzodApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(merchantPayload),
        });

        const createData = await createResponse.json();

        if (!createResponse.ok || !createData?.data?.id) {
          throw new Error(createData?.message || 'Failed to create merchant in Hyperzod');
        }

        const merchantId = createData.data.id;
        console.log(`[run-merchant-setup] Merchant created: ${merchantId}`);

        // Save merchant ID to chef profile
        await supabase
          .from('chef_profiles')
          .update({ hyperzod_merchant_id: merchantId })
          .eq('id', chef.id);

        await updateJob({ merchant_id: merchantId, current_step: 'merchant_created' });

        // Step 2: Get menu and dishes
        await updateJob({ current_step: 'fetching_menu' });
        console.log(`[run-merchant-setup] Step 2: Fetching menu...`);

        const { data: menuData } = await supabase
          .from('menus')
          .select('id, summary')
          .eq('chef_profile_id', chef.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!menuData) {
          console.log(`[run-merchant-setup] No menu found, completing without images/import`);
          await updateJob({
            status: 'completed',
            current_step: 'completed',
            completed_at: new Date().toISOString(),
          });
          return;
        }

        const { data: dishes } = await supabase
          .from('dishes')
          .select('id, name, description, price, category, is_upsell, image_url')
          .eq('menu_id', menuData.id)
          .order('sort_order', { ascending: true });

        if (!dishes || dishes.length === 0) {
          console.log(`[run-merchant-setup] No dishes found, completing`);
          await updateJob({
            status: 'completed',
            current_step: 'completed',
            completed_at: new Date().toISOString(),
          });
          return;
        }

        // Step 3: Generate images
        await updateJob({ current_step: 'generating_images' });
        console.log(`[run-merchant-setup] Step 3: Generating ${dishes.length} images...`);

        let imagesGenerated = 0;
        const dishesWithoutImages = dishes.filter(d => !d.image_url);

        for (const dish of dishesWithoutImages) {
          try {
            const cuisineStyle = (chef.cuisines || []).slice(0, 2).join(' and ') || 'homemade';
            const prompt = `Professional food photography of ${dish.name}. ${dish.description || ''} ${cuisineStyle} cuisine. ${ambience}. ${background_style}. Appetizing, high-end restaurant presentation.`;

            const response = await fetch('https://external.api.recraft.ai/v1/images/generations', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${recraftApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                prompt,
                style: 'realistic_image',
                model: 'recraftv3',
                size: '1024x1024',
              }),
            });

            if (!response.ok) {
              console.error(`[run-merchant-setup] Image gen failed for ${dish.name}`);
              continue;
            }

            const imageData = await response.json();
            const imageUrl = imageData?.data?.[0]?.url;

            if (imageUrl) {
              // Download and upload to storage
              const imgResponse = await fetch(imageUrl);
              const imgBlob = await imgResponse.blob();
              const fileName = `${menuData.id}/${dish.id}.jpg`;

              const { error: uploadError } = await supabase.storage
                .from('menu-images')
                .upload(fileName, imgBlob, { contentType: 'image/jpeg', upsert: true });

              if (!uploadError) {
                const { data: publicUrl } = supabase.storage
                  .from('menu-images')
                  .getPublicUrl(fileName);

                await supabase
                  .from('dishes')
                  .update({ image_url: publicUrl.publicUrl })
                  .eq('id', dish.id);

                imagesGenerated++;
                await updateJob({ images_generated: imagesGenerated });
              }
            }
          } catch (imgErr) {
            console.error(`[run-merchant-setup] Error generating image for ${dish.name}:`, imgErr);
          }
        }

        console.log(`[run-merchant-setup] Generated ${imagesGenerated} images`);

        // Step 4: Import to Hyperzod
        await updateJob({ current_step: 'importing_menu' });
        console.log(`[run-merchant-setup] Step 4: Importing menu to Hyperzod...`);

        // Refresh dishes to get new image URLs
        const { data: updatedDishes } = await supabase
          .from('dishes')
          .select('id, name, description, price, category, is_upsell, image_url')
          .eq('menu_id', menuData.id)
          .order('sort_order', { ascending: true });

        // Get or create categories in Hyperzod
        const getOrCreateCategory = async (categoryName: string): Promise<string | null> => {
          try {
            // Try to find existing category
            const listRes = await fetch(
              `${BASE_URL}/admin/v1/product-category/list?merchant_id=${merchantId}&tenant_id=${TENANT_ID}`,
              { headers: { 'Authorization': `Bearer ${hyperzodApiKey}` } }
            );
            const listData = await listRes.json();
            const existing = listData?.data?.find((c: any) => 
              c.name?.toLowerCase() === categoryName.toLowerCase()
            );
            if (existing) return existing.id;

            // Create new
            const createRes = await fetch(`${BASE_URL}/admin/v1/product-category/create`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${hyperzodApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                tenant_id: TENANT_ID,
                merchant_id: merchantId,
                name: categoryName,
                is_active: true,
              }),
            });
            const createData = await createRes.json();
            return createData?.data?.id || null;
          } catch {
            return null;
          }
        };

        const mainCategoryId = await getOrCreateCategory('Main Dishes');
        const extrasCategoryId = await getOrCreateCategory('Extras');

        let dishesImported = 0;
        for (const dish of (updatedDishes || [])) {
          try {
            const isExtra = dish.is_upsell || ['drinks', 'desserts', 'extras', 'sides'].includes((dish.category || '').toLowerCase());
            const categoryId = isExtra ? extrasCategoryId : mainCategoryId;

            const productPayload = {
              tenant_id: TENANT_ID,
              merchant_id: merchantId,
              product_category_id: categoryId,
              name: dish.name.slice(0, 100),
              description: (dish.description || '').slice(0, 500),
              price: Math.round((dish.price || 10) * 100),
              is_active: true,
              is_featured: false,
            };

            const res = await fetch(`${BASE_URL}/admin/v1/product/create`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${hyperzodApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(productPayload),
            });

            if (res.ok) {
              dishesImported++;
              await updateJob({ dishes_imported: dishesImported });
            }
          } catch (dishErr) {
            console.error(`[run-merchant-setup] Error importing ${dish.name}:`, dishErr);
          }
        }

        console.log(`[run-merchant-setup] Imported ${dishesImported} dishes`);

        // Complete
        await updateJob({
          status: 'completed',
          current_step: 'completed',
          completed_at: new Date().toISOString(),
        });

        console.log(`[run-merchant-setup] Job ${jobId} completed successfully`);
      } catch (error: any) {
        console.error(`[run-merchant-setup] Job ${jobId} failed:`, error);
        await updateJob({
          status: 'failed',
          current_step: 'error',
          error_message: error?.message || 'Unknown error',
        });
      }
    };

    // Run in background using Deno's queueMicrotask for async execution
    // The function returns immediately while runSetup continues
    (async () => {
      await runSetup();
    })();

    // Return immediately with job ID
    return new Response(
      JSON.stringify({ 
        success: true, 
        job_id: jobId,
        message: 'Merchant setup started in background'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[run-merchant-setup] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
