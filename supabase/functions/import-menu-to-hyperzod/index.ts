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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { merchant_id, dishes }: ImportRequest = await req.json();

    if (!merchant_id) {
      return new Response(
        JSON.stringify({ success: false, error: "merchant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!dishes || dishes.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No dishes to import" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Importing ${dishes.length} dishes to merchant ${merchant_id}`);

    const results: { dish_name: string; success: boolean; error?: string; product_id?: string }[] = [];

    for (const dish of dishes) {
      try {
        // Build the product payload according to Hyperzod API
        const productPayload = {
          merchant_id: merchant_id,
          sku: dish.name.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 50),
          language_translation: [
            { key: "name", locale: "en", value: dish.name },
            { key: "description", locale: "en", value: dish.description || "" },
          ],
          product_pricing: {
            price_sell: Number(dish.price),
            price_sell_compare: 0,
            is_tax_chargaeble: false,
            tax: 0,
          },
          has_product_options: false,
          product_options: [],
          product_category: [],
          product_tags: dish.is_upsell ? ["upsell", "extra"] : ["main"],
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

        console.log(`Creating product: ${dish.name}`);

        const response = await fetch(`${BASE_URL}/merchant/v1/catalog/product/create`, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-TENANT": TENANT_ID,
            "X-API-KEY": HYPERZOD_API_KEY || "",
          },
          body: JSON.stringify(productPayload),
        });

        const responseText = await response.text();
        console.log(`Product ${dish.name} response: ${response.status} - ${responseText.substring(0, 200)}`);

        if (response.ok) {
          let data;
          try {
            data = JSON.parse(responseText);
          } catch {
            data = { raw: responseText };
          }
          
          results.push({
            dish_name: dish.name,
            success: true,
            product_id: data?.data?.product_id || data?.data?._id,
          });
        } else {
          results.push({
            dish_name: dish.name,
            success: false,
            error: `${response.status}: ${responseText.substring(0, 100)}`,
          });
        }
      } catch (dishError: any) {
        console.error(`Error creating product ${dish.name}:`, dishError);
        results.push({
          dish_name: dish.name,
          success: false,
          error: dishError?.message || "Unknown error",
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

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
      }
    );
  } catch (error: any) {
    console.error("Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
