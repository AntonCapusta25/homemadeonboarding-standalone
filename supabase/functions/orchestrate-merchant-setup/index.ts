import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SetupRequest {
  chef_profile_id: string;
  chef: any;
  menu_id?: string;
  ambience?: string;
  background?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json() as SetupRequest;
    const { chef_profile_id, chef, menu_id, ambience, background } = body;

    if (!chef_profile_id || !chef) {
      return new Response(
        JSON.stringify({ success: false, error: "chef_profile_id and chef are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create initial job record
    const { data: job, error: jobError } = await supabase
      .from("merchant_setup_jobs")
      .insert({
        chef_profile_id,
        status: "pending",
        current_step: "initializing",
        progress_message: "Starting merchant setup...",
      })
      .select()
      .single();

    if (jobError) {
      console.error("Failed to create job record:", jobError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create job record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Created job ${job.id} for chef ${chef_profile_id}`);

    // Start background task
    EdgeRuntime.waitUntil(
      runMerchantSetup(supabase, job.id, chef_profile_id, chef, menu_id, ambience, background)
    );

    // Return immediately
    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        message: "Merchant setup started in background",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Background task function
async function runMerchantSetup(
  supabase: any,
  jobId: string,
  chefProfileId: string,
  chef: any,
  menuId?: string,
  ambience?: string,
  background?: string
) {
  const updateJob = async (updates: any) => {
    const { error } = await supabase
      .from("merchant_setup_jobs")
      .update(updates)
      .eq("id", jobId);
    
    if (error) {
      console.error(`Failed to update job ${jobId}:`, error);
    }
  };

  try {
    await updateJob({ status: "running" });

    // Step 1: Create Merchant
    console.log(`[Job ${jobId}] Step 1: Creating merchant...`);
    await updateJob({
      current_step: "create_merchant",
      progress_message: "Creating merchant in Hyperzod...",
    });

    const createMerchantResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/create-hyperzod-merchant`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ chef }),
      }
    );

    const merchantData = await createMerchantResponse.json();

    if (!createMerchantResponse.ok || !merchantData?.success) {
      throw new Error(
        `Merchant creation failed: ${merchantData?.error || createMerchantResponse.statusText}`
      );
    }

    const merchantId = merchantData.merchant_id;
    console.log(`[Job ${jobId}] ✅ Merchant created: ${merchantId}`);

    await updateJob({
      merchant_id: merchantId,
      progress_message: `Merchant created (ID: ${merchantId.slice(0, 12)}...)`,
    });

    // Save merchant ID to chef profile
    await supabase
      .from("chef_profiles")
      .update({ hyperzod_merchant_id: merchantId })
      .eq("id", chefProfileId);

    // Step 2: Generate Images (if menu exists)
    let hasMenu = false;
    let targetMenuId = menuId;

    if (!targetMenuId) {
      const { data: menu } = await supabase
        .from("menus")
        .select("id")
        .eq("chef_profile_id", chefProfileId)
        .eq("is_active", true)
        .maybeSingle();
      
      targetMenuId = menu?.id;
    }

    if (targetMenuId) {
      const { data: dishes } = await supabase
        .from("dishes")
        .select("id")
        .eq("menu_id", targetMenuId)
        .limit(1);
      
      hasMenu = dishes && dishes.length > 0;
    }

    if (hasMenu && targetMenuId) {
      console.log(`[Job ${jobId}] Step 2: Generating images...`);
      await updateJob({
        current_step: "generate_images",
        progress_message: "Generating menu images...",
      });

      const generateImagesResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-menu-images`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            menu_id: targetMenuId,
            ambience: ambience || "soft_window_light",
            background: background || "cozy_wooden_table",
            cuisines: chef.cuisines || [],
          }),
        }
      );

      const imagesData = await generateImagesResponse.json();

      if (!generateImagesResponse.ok) {
        console.error(`[Job ${jobId}] ⚠️ Image generation failed:`, imagesData);
        await updateJob({
          progress_message: `Images failed (continuing): ${imagesData?.error || "Unknown error"}`,
        });
      } else {
        console.log(`[Job ${jobId}] ✅ Images generated: ${imagesData.success_count || 0}`);
        await updateJob({
          progress_message: `${imagesData.success_count || 0} images generated`,
        });
      }

      // Step 3: Import to Hyperzod
      console.log(`[Job ${jobId}] Step 3: Importing menu...`);
      await updateJob({
        current_step: "import_menu",
        progress_message: "Importing menu to Hyperzod...",
      });

      // Fetch updated dishes with image URLs
      const { data: updatedDishes } = await supabase
        .from("dishes")
        .select("id, name, description, price, category, is_upsell, image_url")
        .eq("menu_id", targetMenuId)
        .order("sort_order", { ascending: true });

      const importResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/import-menu-to-hyperzod`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            merchant_id: merchantId,
            dishes: updatedDishes || [],
          }),
        }
      );

      const importData = await importResponse.json();

      if (!importResponse.ok || !importData?.success) {
        throw new Error(
          `Menu import failed: ${importData?.error || importResponse.statusText}`
        );
      }

      console.log(`[Job ${jobId}] ✅ Menu imported: ${importData.successful_count} dishes`);

      await updateJob({
        status: "completed",
        current_step: "completed",
        progress_message: `Complete! Merchant created, ${imagesData?.success_count || 0} images, ${importData.successful_count} dishes imported`,
        completed_at: new Date().toISOString(),
      });
    } else {
      // No menu to process
      console.log(`[Job ${jobId}] ℹ️ No menu found, skipping images and import`);
      await updateJob({
        status: "completed",
        current_step: "completed",
        progress_message: "Merchant created (no menu to import)",
        completed_at: new Date().toISOString(),
      });
    }

    console.log(`[Job ${jobId}] 🎉 Setup completed successfully`);
  } catch (error: any) {
    console.error(`[Job ${jobId}] ❌ Error:`, error);
    
    const errorDetails = {
      message: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    };

    await updateJob({
      status: "failed",
      error_message: error?.message || String(error),
      error_details: errorDetails,
      completed_at: new Date().toISOString(),
    });
  }
}

// Error handler for unhandled rejections
addEventListener("unhandledrejection", (event) => {
  console.error("❌ Unhandled rejection:", event.reason);
  event.preventDefault();
});
