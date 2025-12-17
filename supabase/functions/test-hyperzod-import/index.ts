import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HYPERZOD_API_KEY = Deno.env.get("HYPERZOD_API_KEY");
const TENANT_ID = "3331";
const BASE_URL = "https://api.hyperzod.app";

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
    const merchant_id = body.merchant_id;
    const dish = body.dish; // Single dish object with name, description, price, image_url

    if (!merchant_id || !dish) {
      return new Response(JSON.stringify({ success: false, error: "merchant_id and dish are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Testing single product import for: ${dish.name}`);

    // Build product_images as array of objects (the fix we're testing)
    const productImages: { file_url: string; is_cover: boolean }[] = [];
    if (dish.image_url) {
      productImages.push({ file_url: dish.image_url, is_cover: true });
    }

    const productPayload = {
      merchant_id,
      sku: dish.name.replace(/[^a-zA-Z0-9\s]/g, "").substring(0, 50) || "TEST-SKU",
      language_translation: [
        { key: "name", locale: "en", value: dish.name },
        { key: "description", locale: "en", value: dish.description || "" },
      ],
      product_pricing: {
        type: "flat",
        price_buy: 0,
        price_sell: Math.round((Number(dish.price) || 0) * 100),
        price_sell_compare: null,
        profit: 0,
        margin: 0,
        is_tax_chargaeble: false,
        tax: 0,
      },
      has_product_options: false,
      product_options: [],
      product_category: [],
      product_tags: ["test"],
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
    console.log(`Response status: ${response.status}`);
    console.log(`Response body: ${responseText}`);

    return new Response(JSON.stringify({
      success: response.ok,
      status: response.status,
      payload_sent: productPayload,
      response: JSON.parse(responseText),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
