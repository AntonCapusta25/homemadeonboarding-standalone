import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HYPERZOD_API_KEY = Deno.env.get("HYPERZOD_API_KEY");
const TENANT_ID = "3331";
const BASE_URL = "https://api.hyperzod.app";

interface DishInput {
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  is_upsell?: boolean;
}

function safeString(input: unknown, maxLen: number) {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLen);
}

async function getOrCreateCategory(merchantId: string, categoryName: string): Promise<string | null> {
  const listResponse = await fetch(
    `${BASE_URL}/merchant/v1/catalog/product-category/list?merchant_id=${encodeURIComponent(merchantId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-TENANT": TENANT_ID,
        "X-API-KEY": HYPERZOD_API_KEY!,
      },
    },
  );

  if (listResponse.ok) {
    const listData = await listResponse.json().catch(() => null);
    const categories = listData?.data?.data || listData?.data || [];
    const existing = categories.find(
      (c: any) => c.name === categoryName || c.language_translation?.some((t: any) => t.value === categoryName),
    );
    if (existing) {
      console.log(`Found existing category: ${existing._id || existing.category_id}`);
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

  const createData = await createResponse.json().catch(() => null);
  console.log(`Create category response:`, JSON.stringify(createData));

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
    const merchant_id = safeString(body?.merchant_id, 128);
    const dish = body?.dish as DishInput | undefined;

    if (!merchant_id || !dish) {
      return new Response(JSON.stringify({ success: false, error: "merchant_id and dish are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dishName = safeString(dish?.name, 120);
    const description = safeString(dish?.description ?? "", 2000);
    const isUpsell = !!dish?.is_upsell;

    if (!dishName) {
      return new Response(JSON.stringify({ success: false, error: "dish.name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Required by Hyperzod
    const categoryName = isUpsell ? "Extras" : "Main Dishes";
    const categoryId = await getOrCreateCategory(merchant_id, categoryName);

    if (!categoryId) {
      return new Response(JSON.stringify({ success: false, error: `Failed to get/create category: ${categoryName}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Testing single product import for: ${dishName} (category: ${categoryName})`);

    // Hyperzod expects array of objects with file_url and is_cover fields
    const productImages: { file_url: string; is_cover: boolean }[] = [];
    if (dish.image_url) {
      const imageUrl = safeString(dish.image_url, 2048);
      if (imageUrl) productImages.push({ file_url: imageUrl, is_cover: true });
    }

    const productPayload = {
      merchant_id,
      sku: dishName.replace(/[^a-zA-Z0-9\s]/g, "").substring(0, 50) || "TEST-SKU",
      language_translation: [
        { key: "name", locale: "en", value: dishName },
        { key: "description", locale: "en", value: description },
      ],
      product_pricing: {
        type: "flat",
        price_buy: 0,
        price_sell: Math.round((Number(dish?.price) || 0) * 100),
        price_sell_compare: null,
        profit: 0,
        margin: 0,
        is_tax_chargaeble: false,
        tax: 0,
      },
      has_product_options: false,
      product_options: [],
      product_category: [categoryId],
      product_tags: isUpsell ? ["upsell", "extra", "test"] : ["main", "test"],
      product_labels: [],
      status: true,
      is_quantity_enabled: false,
      is_inventory_enabled: false,
      product_inventory: 0,
      is_featured: false,
      sort_order: 0,
      product_quantity: { min_quantity: 0, max_quantity: 0 },
      product_images: productImages,
    };

    console.log("Payload:", JSON.stringify(productPayload, null, 2));

    const response = await fetch(`${BASE_URL}/merchant/v1/catalog/product/create`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-TENANT": TENANT_ID,
        "X-API-KEY": HYPERZOD_API_KEY,
      },
      body: JSON.stringify(productPayload),
    });

    const responseText = await response.text();
    let responseJson: unknown = responseText;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      // keep text
    }

    console.log(`Response status: ${response.status}`);
    console.log(`Response body: ${responseText}`);

    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        payload_sent: productPayload,
        response: responseJson,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ success: false, error: error?.message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
