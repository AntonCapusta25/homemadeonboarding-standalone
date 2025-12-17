import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HYPERZOD_API_KEY = Deno.env.get("HYPERZOD_API_KEY");
const TENANT_ID = "3331";
const BASE_URL = "https://api.hyperzod.app";

// IMPORTANT: We test pricing type against the SAME endpoint + payload shape used by import-menu-to-hyperzod
const PRICING_TYPES_TO_TRY: Array<string | number> = [
  // numeric
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  // strings
  "fixed",
  "simple",
  "standard",
  "default",
  "regular",
  "flat",
  "static",
  "single",
  "unit",
  "item",
];

function safeString(input: unknown, maxLen: number) {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLen);
}

async function getOrCreateCategory(merchantId: string): Promise<string | null> {
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
    const existing = categories?.[0];
    if (existing) return existing._id || existing.category_id;
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
      language_translation: [{ key: "name", locale: "en", value: "Test Category" }],
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
      return new Response(JSON.stringify({ success: false, error: "HYPERZOD_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { merchant_id } = await req.json();
    const merchantId = safeString(merchant_id, 128);

    if (!merchantId) {
      return new Response(JSON.stringify({ success: false, error: "merchant_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Detecting pricing type for merchant:", merchantId);

    const categoryId = await getOrCreateCategory(merchantId);
    if (!categoryId) {
      return new Response(JSON.stringify({ success: false, error: "Failed to create/find a category" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ type: string | number; status: number; ok: boolean; body: unknown }> = [];
    const validTypes: Array<string | number> = [];

    for (const pricingType of PRICING_TYPES_TO_TRY) {
      const testName = `_TEST_TYPE_${String(pricingType)}_${Date.now()}`;

      const payload = {
        merchant_id: merchantId,
        sku: testName,
        language_translation: [
          { key: "name", locale: "en", value: testName },
          { key: "description", locale: "en", value: "Temporary test product" },
        ],
        product_pricing: {
          type: pricingType,
          price_buy: 0,
          price_sell: 100,
          price_sell_compare: null,
          profit: 0,
          margin: 0,
          is_tax_chargaeble: false,
          tax: 0,
        },
        has_product_options: false,
        product_options: [],
        product_category: [categoryId],
        product_tags: ["__test__"],
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

      console.log("Testing pricing type:", pricingType);

      const response = await fetch(`${BASE_URL}/merchant/v1/catalog/product/create`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-TENANT": TENANT_ID,
          "X-API-KEY": HYPERZOD_API_KEY!,
        },
        body: JSON.stringify(payload),
      });

      let parsed: unknown;
      const raw = await response.text();
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }

      const ok = response.ok;
      results.push({ type: pricingType, status: response.status, ok, body: parsed });

      if (ok) {
        validTypes.push(pricingType);
        console.log("✓ Valid pricing type:", pricingType);
      } else {
        console.log("✗ Invalid pricing type:", pricingType, "status:", response.status);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        merchant_id: merchantId,
        valid_types: validTypes,
        message:
          validTypes.length > 0
            ? `Found valid pricing type(s): ${validTypes.map(String).join(", ")}`
            : "No valid pricing types found",
        total_tested: PRICING_TYPES_TO_TRY.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in detect-hyperzod-pricing-type:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

