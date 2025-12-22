import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HYPERZOD_API_KEY = Deno.env.get("HYPERZOD_API_KEY");
const TENANT_ID = "3331";
const BASE_URL = "https://api.hyperzod.app";
const PRODUCT_CREATE_URL = `${BASE_URL}/merchant/v1/catalog/product/create`;
const PRODUCT_UPDATE_URL = `${BASE_URL}/merchant/v1/catalog/product/update`;

function removeEmojis(str: string): string {
  return str.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu, '').trim();
}

// Get or create category
async function getOrCreateCategory(merchantId: string, categoryName: string): Promise<string | null> {
  const listResponse = await fetch(`${BASE_URL}/merchant/v1/catalog/product-category/list?merchant_id=${merchantId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-TENANT": TENANT_ID,
      "X-API-KEY": HYPERZOD_API_KEY!,
    },
  });

  if (listResponse.ok) {
    const listData = await listResponse.json();
    const categories = listData?.data?.data || listData?.data || [];
    const existing = categories.find(
      (c: any) => c.name === categoryName || c.language_translation?.some((t: any) => t.value === categoryName),
    );
    if (existing) {
      console.log(`[TEST] Found existing category: ${existing._id || existing.category_id}`);
      return existing._id || existing.category_id;
    }
  }

  const createResponse = await fetch(`${BASE_URL}/merchant/v1/catalog/product-category/create`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-TENANT": TENANT_ID,
      "X-API-KEY": HYPERZOD_API_KEY!,
    },
    body: JSON.stringify({
      merchant_id: merchantId,
      description: "",
      view_type: "card",
      image: "",
      sort_order: 0,
      status: 1,
      language_translation: [{ key: "name", locale: "en", value: categoryName }],
    }),
  });

  const createData = await createResponse.json();
  if (createResponse.ok && createData?.data) {
    return createData.data._id || createData.data.category_id;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!HYPERZOD_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "Missing HYPERZOD_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const merchant_id = body?.merchant_id;

    if (!merchant_id) {
      return new Response(JSON.stringify({ success: false, error: "merchant_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[TEST] Testing 2-step import for merchant ${merchant_id}`);

    // Create categories
    const mainCategoryId = await getOrCreateCategory(merchant_id, "Main Dishes");
    const extrasCategoryId = await getOrCreateCategory(merchant_id, "Extras");

    console.log(`[TEST] Categories - Main: ${mainCategoryId}, Extras: ${extrasCategoryId}`);

    const results: any[] = [];

    // ============================================
    // STEP 1: Create a main product WITHOUT options
    // ============================================
    const timestamp = Date.now();
    const createPayload = {
      merchant_id,
      sku: `TEST-MAIN-${timestamp}`,
      language_translation: [
        { key: "name", locale: "en", value: "Test Main Dish" },
        { key: "description", locale: "en", value: "A test main dish - will add options via update" },
      ],
      product_pricing: {
        type: "flat",
        price_buy: 0,
        price_sell: 12.99,
        price_sell_compare: null,
        profit: 12.99,
        margin: 100,
        is_tax_chargaeble: false,
        tax: 0,
      },
      has_product_options: false,
      product_options: [],
      product_category: [mainCategoryId],
      product_tags: ["main", "test"],
      product_labels: [],
      status: true,
      is_quantity_enabled: false,
      is_inventory_enabled: false,
      product_inventory: 0,
      is_featured: false,
      sort_order: 0,
      product_quantity: { min_quantity: 0, max_quantity: 0 },
      product_images: [],
    };

    console.log(`[TEST] STEP 1: Creating product WITHOUT options...`);
    console.log(`[TEST] Create payload:`, JSON.stringify(createPayload, null, 2));

    const createResponse = await fetch(PRODUCT_CREATE_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-TENANT": TENANT_ID,
        "X-API-KEY": HYPERZOD_API_KEY!,
      },
      body: JSON.stringify(createPayload),
    });

    const createText = await createResponse.text();
    console.log(`[TEST] Create response status: ${createResponse.status}`);
    console.log(`[TEST] Create response body: ${createText}`);

    let productId = null;
    if (createResponse.ok) {
      const createData = JSON.parse(createText);
      productId = createData?.data?.product_id || createData?.data?._id;
      results.push({
        step: 1,
        action: "create_product",
        success: true,
        product_id: productId,
        response: createData,
      });
      console.log(`[TEST] ✓ Product created with ID: ${productId}`);
    } else {
      results.push({
        step: 1,
        action: "create_product",
        success: false,
        status: createResponse.status,
        error: createText,
        payload_sent: createPayload,
      });
      console.log(`[TEST] ✗ Product creation failed`);
    }

    // ============================================
    // STEP 2: Update product to add options (if created)
    // ============================================
    if (productId) {
      // Based on Hyperzod Update docs - NO type field, just selection_type, view_type, options
      const productOptions = [{
        language_translation: [{ key: "option_name", value: "Extras", locale: "en" }],
        selection_type: "multiple",
        enable_range: true,
        min_quantity: 0,
        max_quantity: 2,
        is_required: false,
        view_type: "list",
        options: [
          {
            language_translation: [{ key: "name", value: "Extra Cheese", locale: "en" }],
            name: "Extra Cheese",
            price_buy: 0,
            price_sell: 1.50,
            image_url: null,
            is_description_enabled: false,
            description: "",
            is_quantity_enabled: false,
            quantity: 0,
          },
          {
            language_translation: [{ key: "name", value: "Extra Sauce", locale: "en" }],
            name: "Extra Sauce",
            price_buy: 0,
            price_sell: 0.75,
            image_url: null,
            is_description_enabled: false,
            description: "",
            is_quantity_enabled: false,
            quantity: 0,
          },
        ],
      }];

      const updatePayload = {
        id: productId,
        merchant_id,
        sku: `TEST-MAIN-${timestamp}`,
        has_product_options: true,
        product_options: productOptions,
      };

      console.log(`[TEST] STEP 2: Updating product to add options...`);
      console.log(`[TEST] Update payload:`, JSON.stringify(updatePayload, null, 2));

      const updateResponse = await fetch(PRODUCT_UPDATE_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-TENANT": TENANT_ID,
          "X-API-KEY": HYPERZOD_API_KEY!,
        },
        body: JSON.stringify(updatePayload),
      });

      const updateText = await updateResponse.text();
      console.log(`[TEST] Update response status: ${updateResponse.status}`);
      console.log(`[TEST] Update response body: ${updateText}`);

      if (updateResponse.ok) {
        const updateData = JSON.parse(updateText);
        results.push({
          step: 2,
          action: "update_add_options",
          success: true,
          product_id: productId,
          response: updateData,
        });
        console.log(`[TEST] ✓ Options added to product successfully!`);
      } else {
        results.push({
          step: 2,
          action: "update_add_options",
          success: false,
          status: updateResponse.status,
          error: updateText,
          payload_sent: updatePayload,
        });
        console.log(`[TEST] ✗ Options update failed`);
      }
    }

    const allSuccess = results.every(r => r.success);

    return new Response(
      JSON.stringify({
        success: allSuccess,
        message: allSuccess 
          ? "2-step test successful! Product created, then options added via update." 
          : "Test had failures - check results for details",
        approach: "2-step: Create product first, then Update to add options",
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("[TEST] Fatal error:", error);
    return new Response(JSON.stringify({ success: false, error: error?.message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
