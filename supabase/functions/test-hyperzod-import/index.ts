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

type ProductPricing = {
  type: "flat";
  price_buy: number;
  price_sell: number;
  price_sell_compare: null;
  profit: number;
  margin: number;
  is_tax_chargaeble: false;
  tax: number;
};

type BaseProductPayload = {
  merchant_id: string;
  sku: string;
  description: string;
  language_translation: Array<{ key: "name" | "description"; value: string; locale: "en" }>;
  product_pricing: ProductPricing;
  product_category: string[];
  product_tags: string[];
  product_labels: string[];
  status: boolean;
  is_quantity_enabled: boolean;
  is_inventory_enabled: boolean;
  product_inventory: number;
  is_featured: boolean;
  sort_order: number;
  product_quantity: { min_quantity: number; max_quantity: number };
  product_images: Array<{ file_url: string; is_cover: boolean }>;
};

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
    const listData = await listResponse.json().catch(() => null);
    const categories = (listData as any)?.data?.data || (listData as any)?.data || [];
    const existing = categories.find(
      (c: any) => c.name === categoryName || c.language_translation?.some((t: any) => t.value === categoryName),
    );
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
      language_translation: [{ key: "name", locale: "en", value: categoryName }],
    }),
  });

  const createData = await createResponse.json().catch(() => null);
  if (createResponse.ok && (createData as any)?.data) {
    return (createData as any).data._id || (createData as any).data.category_id;
  }
  return null;
}

async function fetchExistingOptionGroupType(merchantId: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/merchant/v1/catalog/product/list?merchant_id=${merchantId}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-TENANT": TENANT_ID,
        "X-API-KEY": HYPERZOD_API_KEY!,
      },
    });

    if (!res.ok) return null;

    const json = await res.json().catch(() => null);
    const items = (json as any)?.data?.data || (json as any)?.data || [];

    for (const p of items) {
      const groups = Array.isArray((p as any)?.product_options) ? (p as any).product_options : [];
      const groupWithType = groups.find((g: any) => (typeof g?.type === "string" && g.type.trim()) || typeof g?.type === "number");
      if (groupWithType?.type !== undefined && groupWithType?.type !== null) {
        console.log(`[TEST] Discovered option group type: ${String(groupWithType.type)}`);
        return String(groupWithType.type);
      }
    }

    return null;
  } catch {
    return null;
  }
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

    console.log(`[TEST] Starting create-then-update test for merchant ${merchant_id}`);

    const mainCategoryId = await getOrCreateCategory(merchant_id, "Main Dishes");
    if (!mainCategoryId) {
      return new Response(JSON.stringify({ success: false, error: "Failed to create/find category" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timestamp = Date.now();
    const dishName = `TEST Main ${timestamp}`;
    const sku = `TEST-MAIN-${timestamp}`;
    const description = "Test product - will attach options via update";

    const base: BaseProductPayload = {
      merchant_id,
      sku,
      description,
      language_translation: [
        { key: "name", value: dishName, locale: "en" },
        { key: "description", value: description, locale: "en" },
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

    // STEP 1: Create without options
    const createPayload = {
      ...base,
      has_product_options: false,
      product_options: [],
    };

    const createRes = await fetch(PRODUCT_CREATE_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-TENANT": TENANT_ID,
        "X-API-KEY": HYPERZOD_API_KEY!,
      },
      body: JSON.stringify(createPayload),
    });

    const createText = await createRes.text();
    console.log(`[TEST] Create status: ${createRes.status}`);
    console.log(`[TEST] Create body: ${createText}`);

    if (!createRes.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "create",
          status: createRes.status,
          body: createText,
          payload_sent: createPayload,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const createJson = JSON.parse(createText);
    const productId = createJson?.data?.product_id || createJson?.data?._id;

    // STEP 2: Update with options; must include full payload + product_options.0.type
    const discoveredType = await fetchExistingOptionGroupType(merchant_id);

    const stringTypeCandidates = [
      ...(discoveredType ? [discoveredType] : []),
      "nested",
      "simple",
      "standard",
      "flat",
      "group",
      "default",
      "addon",
      "extra",
      "modifier",
      "variation",
      "variant",
      "single",
      "multiple",
      "checkbox",
      "radio",
      "list",
      "dropdown",
      "single_select",
      "multi_select",
    ].filter((v, i, arr) => arr.indexOf(v) === i);

    const typeCandidates: Array<string | number> = [
      ...stringTypeCandidates,
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
    ];

    const productOptionsBase = {
      option_name: "Extras",
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
          price_sell: 1.5,
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
    };

    const attempts: any[] = [];

    for (const typeValue of typeCandidates) {
      const updatePayload = {
        id: productId,
        ...base,
        has_product_options: true,
        product_options: [{ ...productOptionsBase, type: typeValue }],
      };

      console.log(`[TEST] Updating with type=${String(typeValue)}`);

      const updateRes = await fetch(PRODUCT_UPDATE_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-TENANT": TENANT_ID,
          "X-API-KEY": HYPERZOD_API_KEY!,
        },
        body: JSON.stringify(updatePayload),
      });

      const updateText = await updateRes.text();
      console.log(`[TEST] Update status (type=${String(typeValue)}): ${updateRes.status}`);
      console.log(`[TEST] Update body (type=${String(typeValue)}): ${updateText}`);

      if (updateRes.ok) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Create + update with options succeeded",
            product_id: productId,
            used_type: String(typeValue),
            create_response: createJson,
            update_response: JSON.parse(updateText),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      attempts.push({ type: typeValue, status: updateRes.status, body: updateText });

      // keep logs manageable
      if (attempts.length >= 12) break;
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: "Create succeeded, but update with options failed for tried type candidates",
        product_id: productId,
        discovered_type: discoveredType,
        attempts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[TEST] Fatal error:", error);
    return new Response(JSON.stringify({ success: false, error: error?.message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
