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
  image_url?: string | null;
}

interface ImportRequest {
  merchant_id: string;
  dishes: Dish[];
}

function safeString(input: unknown, maxLen: number) {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLen);
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function truncateForLog(text: string, maxLen = 2500) {
  if (!text) return "";
  return text.length > maxLen ? `${text.slice(0, maxLen)}…(truncated)` : text;
}

// Remove emojis from string
function removeEmojis(str: string): string {
  return str
    .replace(
      /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu,
      "",
    )
    .trim();
}

// Create or get default category for merchant
async function getOrCreateCategory(merchantId: string, categoryName: string): Promise<string | null> {
  const listResponse = await fetch(
    `${BASE_URL}/merchant/v1/catalog/product-category/list?merchant_id=${merchantId}`,
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
    const listData = await listResponse.json();
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

  const createData = await createResponse.json();
  console.log(`Create category response:`, JSON.stringify(createData));

  if (createResponse.ok && createData?.data) {
    return createData.data._id || createData.data.category_id;
  }
  return null;
}

// Build option items from extras dishes (for product_options.options array)
function buildOptionItemsFromExtras(extras: Dish[]): any[] {
  return extras
    .map((extra) => {
      const name = removeEmojis(safeString(extra?.name, 120));
      if (!name) return null;

      const priceSell = Number(extra?.price) || 0;
      const imageUrl = typeof extra?.image_url === "string" && extra.image_url.trim() ? extra.image_url.trim() : null;

      return {
        language_translation: [{ key: "name", value: name, locale: "en" }],
        name,
        price_buy: 0,
        price_sell: priceSell,
        image_url: imageUrl,
        is_description_enabled: false,
        description: "",
        is_quantity_enabled: false,
        quantity: 0,
      };
    })
    .filter(Boolean);
}

// Build product_options array (based on Hyperzod Update API docs - NO type field!)
function buildProductOptions(extras: Dish[]): any[] {
  const optionItems = buildOptionItemsFromExtras(extras);
  if (optionItems.length === 0) return [];

  // Based on docs: only selection_type, view_type, options - NO type field
  return [{
    language_translation: [{ key: "option_name", value: "Extras", locale: "en" }],
    selection_type: "multiple",
    enable_range: true,
    min_quantity: 0,
    max_quantity: optionItems.length,
    is_required: false,
    view_type: "list",
    options: optionItems,
  }];
}

const PRODUCT_CREATE_URL = `${BASE_URL}/merchant/v1/catalog/product/create`;
const PRODUCT_UPDATE_URL = `${BASE_URL}/merchant/v1/catalog/product/update`;

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

    const body = (await req.json().catch(() => null)) as ImportRequest | null;
    const merchant_id = safeString(body?.merchant_id, 128);
    const dishes = Array.isArray(body?.dishes) ? body!.dishes : [];

    if (!merchant_id) {
      return new Response(JSON.stringify({ success: false, error: "merchant_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dishes.length) {
      return new Response(JSON.stringify({ success: false, error: "No dishes to import" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Importing ${dishes.length} dishes to merchant ${merchant_id}`);

    // Create default category
    const mainCategoryId = await getOrCreateCategory(merchant_id, "Main Dishes");

    if (!mainCategoryId) {
      return new Response(JSON.stringify({ success: false, error: "Failed to create product categories" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Separate dishes into main dishes and extras/upsells
    const mainDishes = dishes.filter((d) => !d.is_upsell);
    const extraDishes = dishes.filter((d) => d.is_upsell);

    console.log(`Found ${mainDishes.length} main dishes and ${extraDishes.length} extras`);

    const results: {
      dish_name: string;
      success: boolean;
      error?: string;
      product_id?: string;
      options_added?: boolean;
    }[] = [];

    const hasExtras = extraDishes.length > 0;
    const productOptions = hasExtras ? buildProductOptions(extraDishes) : [];

    console.log(`Will use 2-step approach: Create products first, then update with options`);

    // ============================================
    // STEP 1: Create all main products WITHOUT options
    // ============================================
    const createdProducts: { dishName: string; productId: string; categoryId: string }[] = [];

    for (const dish of mainDishes) {
      try {
        const dishName = removeEmojis(safeString(dish?.name, 120));
        const description = safeString(dish?.description ?? "", 2000);
        const priceSell = Number(dish?.price) || 0;
        const priceBuy = 0;
        const profit = priceSell - priceBuy;
        const margin = priceSell !== 0 ? (profit / priceSell) * 100 : 0;

        if (!dishName) {
          results.push({
            dish_name: "(invalid dish)",
            success: false,
            error: "Invalid dish payload (missing name)",
          });
          continue;
        }

        const productImages: { file_url: string; is_cover: boolean }[] = [];
        if (dish.image_url) {
          productImages.push({ file_url: dish.image_url, is_cover: true });
        }

        // Create WITHOUT options first
        const createPayload = {
          merchant_id,
          sku: dishName.replace(/[^a-zA-Z0-9\s]/g, "").substring(0, 50) || "SKU",
          language_translation: [
            { key: "name", value: dishName, locale: "en" },
            { key: "description", value: description, locale: "en" },
          ],
          product_pricing: {
            type: "flat",
            price_buy: priceBuy,
            price_sell: priceSell,
            price_sell_compare: null,
            profit,
            margin,
            is_tax_chargaeble: false,
            tax: 0,
          },
          product_category: [mainCategoryId],
          product_tags: ["main"],
          product_labels: [],
          status: true,
          is_quantity_enabled: true,
          is_inventory_enabled: false,
          product_inventory: 0,
          is_featured: false,
          sort_order: 0,
          product_quantity: { min_quantity: 0, max_quantity: 0 },
          product_images: productImages,
          // Create WITHOUT options
          has_product_options: false,
          product_options: [],
        };

        console.log(`[STEP 1] Creating product: ${dishName} (without options)`);

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

        const rawText = await createResponse.text();

        if (createResponse.ok) {
          const data = safeJsonParse(rawText) as any;
          const productId = data?.data?.product_id || data?.data?._id;
          
          console.log(`✓ Created product ${dishName} with ID: ${productId}`);
          
          createdProducts.push({
            dishName,
            productId,
            categoryId: mainCategoryId,
          });
        } else {
          const parsed = safeJsonParse(rawText);
          const errorForLog = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
          
          console.error(`✗ Failed to create product ${dishName}: ${createResponse.status}`);
          console.error(`  Error: ${truncateForLog(errorForLog)}`);
          
          results.push({
            dish_name: dishName,
            success: false,
            error: `Create failed (${createResponse.status}): ${truncateForLog(errorForLog, 500)}`,
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

    console.log(`[STEP 1 COMPLETE] Created ${createdProducts.length} products`);

    // ============================================
    // STEP 2: Update products to add options (if we have extras)
    // ============================================
    if (hasExtras && createdProducts.length > 0) {
      console.log(`[STEP 2] Adding options to ${createdProducts.length} products...`);

      for (const product of createdProducts) {
        try {
          // Update payload based on Hyperzod docs - use product ID and add options
          const updatePayload = {
            id: product.productId,
            merchant_id,
            sku: product.dishName.replace(/[^a-zA-Z0-9\s]/g, "").substring(0, 50) || "SKU",
            has_product_options: true,
            product_options: productOptions,
          };

          console.log(`[STEP 2] Updating product ${product.dishName} with options...`);

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

          if (updateResponse.ok) {
            console.log(`✓ Added options to product ${product.dishName}`);
            results.push({
              dish_name: product.dishName,
              success: true,
              product_id: product.productId,
              options_added: true,
            });
          } else {
            const parsed = safeJsonParse(updateText);
            const errorForLog = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
            
            console.warn(`⚠ Product ${product.dishName} created but options update failed: ${updateResponse.status}`);
            console.warn(`  Error: ${truncateForLog(errorForLog)}`);
            
            // Still consider it a partial success - product was created
            results.push({
              dish_name: product.dishName,
              success: true,
              product_id: product.productId,
              options_added: false,
              error: `Options update failed: ${truncateForLog(errorForLog, 300)}`,
            });
          }
        } catch (updateError: any) {
          console.error(`Error updating product ${product.dishName}:`, updateError);
          results.push({
            dish_name: product.dishName,
            success: true,
            product_id: product.productId,
            options_added: false,
            error: `Options update error: ${updateError?.message || "Unknown"}`,
          });
        }
      }
    } else if (createdProducts.length > 0) {
      // No extras, just mark all as success
      for (const product of createdProducts) {
        results.push({
          dish_name: product.dishName,
          success: true,
          product_id: product.productId,
          options_added: false,
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const withOptions = results.filter((r) => r.success && r.options_added).length;

    console.log(
      `Import complete: ${successful} products created, ${failed} failed, ${withOptions} with options attached`,
    );

    return new Response(
      JSON.stringify({
        success: failed === 0,
        message: `Imported ${successful} of ${mainDishes.length} main products (${withOptions} with extras as options)`,
        successful_count: successful,
        failed_count: failed,
        products_with_options: withOptions,
        extras_count: extraDishes.length,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Fatal error:", error);
    return new Response(JSON.stringify({ success: false, error: error?.message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
