import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HYPERZOD_API_KEY = Deno.env.get("HYPERZOD_API_KEY");
const TENANT_ID = "3331";
const BASE_URL = "https://api.hyperzod.app";

interface Dish {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  is_upsell: boolean;
}

interface ImportRequest {
  merchant_id: string;
  dishes: Dish[];
}

function safeString(input: unknown, maxLen: number) {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLen);
}

// Create or get default category for merchant
async function getOrCreateCategory(merchantId: string, categoryName: string): Promise<string | null> {
  // First try to list existing categories
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
    const existing = categories.find((c: any) => 
      c.name === categoryName || 
      c.language_translation?.some((t: any) => t.value === categoryName)
    );
    if (existing) {
      console.log(`Found existing category: ${existing._id || existing.category_id}`);
      return existing._id || existing.category_id;
    }
  }

  // Create new category using correct endpoint: /merchant/v1/catalog/product-category/create
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
      return new Response(
        JSON.stringify({ success: false, error: "Missing HYPERZOD_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json().catch(() => null)) as ImportRequest | null;
    const merchant_id = safeString(body?.merchant_id, 128);
    const dishes = Array.isArray(body?.dishes) ? body!.dishes : [];

    if (!merchant_id) {
      return new Response(
        JSON.stringify({ success: false, error: "merchant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!dishes.length) {
      return new Response(
        JSON.stringify({ success: false, error: "No dishes to import" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`Importing ${dishes.length} dishes to merchant ${merchant_id}`);

    // Create default categories
    const mainCategoryId = await getOrCreateCategory(merchant_id, "Main Dishes");
    const extrasCategoryId = await getOrCreateCategory(merchant_id, "Extras");
    
    if (!mainCategoryId) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create product categories" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`Using categories - Main: ${mainCategoryId}, Extras: ${extrasCategoryId}`);

    const results: { dish_name: string; success: boolean; error?: string; product_id?: string }[] = [];

    for (const dish of dishes) {
      try {
        const dishName = safeString(dish?.name, 120);
        const description = safeString(dish?.description ?? "", 2000);
        const priceSell = Number(dish?.price) || 0;
        const isUpsell = dish?.is_upsell || false;

        if (!dishName) {
          results.push({
            dish_name: "(invalid dish)",
            success: false,
            error: "Invalid dish payload (missing name)",
          });
          continue;
        }

        // Use appropriate category based on dish type
        const categoryId = isUpsell && extrasCategoryId ? extrasCategoryId : mainCategoryId;

        const productPayload = {
          merchant_id,
          sku: dishName.replace(/[^a-zA-Z0-9\s]/g, "").substring(0, 50) || "SKU",
          language_translation: [
            { key: "name", locale: "en", value: dishName },
            { key: "description", locale: "en", value: description },
          ],
          product_pricing: {
            type: "simple",
            price_sell: priceSell,
            price_sell_compare: priceSell, // Must be >= price_sell
            is_tax_chargaeble: false,
            tax: 0,
          },
          has_product_options: false,
          product_options: [],
          product_category: [categoryId],
          product_tags: dish?.is_upsell ? ["upsell", "extra"] : ["main"],
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

        console.log(`Creating product: ${dishName}`);
        console.log(`Payload: ${JSON.stringify(productPayload)}`);

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
        console.log(`Product ${dishName} response: ${response.status} - ${responseText}`);

        if (response.ok) {
          let data: any;
          try {
            data = JSON.parse(responseText);
          } catch {
            data = { raw: responseText };
          }

          results.push({
            dish_name: dishName,
            success: true,
            product_id: data?.data?.product_id || data?.data?._id,
          });
        } else {
          results.push({
            dish_name: dishName,
            success: false,
            error: `${response.status}: ${responseText}`,
          });
        }
      } catch (dishError: any) {
        console.error(`Error creating product ${dish?.name}:`, dishError);
        results.push({
          dish_name: safeString(dish?.name, 120) || "(unknown)",
          success: false,
          error: dishError?.message || "Unknown error",
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`Import complete: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: failed === 0,
        message: `Imported ${successful} of ${dishes.length} dishes`,
        successful_count: successful,
        failed_count: failed,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
