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
  /** Optional override for Hyperzod's required product_options[].type value */
  option_group_type?: string;
}

function safeString(input: unknown, maxLen: number) {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLen);
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

// Build Hyperzod option items from "extras" dishes
function buildOptionItemsFromExtras(extras: Dish[]): any[] {
  return extras
    .map((extra) => {
      const name = removeEmojis(safeString(extra?.name, 120));
      if (!name) return null;

      const priceSell = Number(extra?.price) || 0;
      const priceBuy = 0;
      const imageUrl = typeof extra?.image_url === "string" && extra.image_url.trim() ? extra.image_url.trim() : null;

      return {
        language_translation: [{ key: "name", value: name, locale: "en" }],
        price_buy: priceBuy,
        price_sell: priceSell,
        image_url: imageUrl,
        is_description_enabled: false,
        description: "",
        is_quantity_enabled: true,
        quantity: 1,
        name,
      };
    })
    .filter(Boolean);
}

function buildProductOptions(extras: Dish[], typeValue?: string | number): any[] {
  const options = buildOptionItemsFromExtras(extras);
  if (options.length === 0) return [];

  const group: any = {
    language_translation: [{ key: "option_name", value: "Extras", locale: "en" }],
    selection_type: "single",
    enable_range: true,
    min_quantity: 1,
    max_quantity: 20,
    is_required: false,
    view_type: "list",
    options,
  };

  // Add type only if provided (undefined means skip the field entirely)
  if (typeValue !== undefined) {
    group.type = typeValue;
  }

  return [group];
}

const PRODUCT_CREATE_URL = `${BASE_URL}/merchant/v1/catalog/product/create`;

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
    const optionGroupTypeRequested = safeString(body?.option_group_type, 64) || null;
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

    // Create default categories (extras category is optional, but keeping for future compatibility)
    const mainCategoryId = await getOrCreateCategory(merchant_id, "Main Dishes");
    await getOrCreateCategory(merchant_id, "Extras");

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
      used_option_group_type?: string;
    }[] = [];

    // We DO NOT import extras as standalone products.
    // Instead, we attach them as product_options to every main product.
    const hasExtras = extraDishes.length > 0;

    console.log(`Will attach ${extraDishes.length} extras as product_options to each main product`);

    // STEP: Create main dishes with extras as options
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

        const basePayload = {
          merchant_id,
          sku: dishName.replace(/[^a-zA-Z0-9\s]/g, "").substring(0, 50) || "SKU",
          language_translation: [
            { key: "name", value: dishName, locale: "en" },
            { key: "description", value: description, locale: "en" },
          ],
          product_pricing: {
            // Hyperzod requires product_pricing.type (validated as required in API responses)
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
        };

        // Try different type values - including NO type field, and numeric values
        const typeCandidates: (string | number | undefined)[] = [
          undefined, // No type field at all
          0, // Numeric 0
          1, // Numeric 1
          2, // Numeric 2
          "single", // Match selection_type
          "multiple",
          "checkbox",
          "radio",
          "modifier",
          "variant",
        ];

        let created = false;

        for (const typeValue of typeCandidates) {
          const payload = {
            ...basePayload,
            has_product_options: hasExtras,
            product_options: hasExtras ? buildProductOptions(extraDishes, typeValue) : [],
          };

          const typeLabel = typeValue === undefined ? "(no type field)" : typeValue === "" ? "(empty string)" : String(typeValue);
          console.log(
            `Creating main product: ${dishName} (${hasExtras ? `with ${extraDishes.length} extras, type=${typeLabel}` : "no options"})`,
          );

          // Log the full payload for debugging
          console.log(`[DEBUG] Full payload for ${dishName}:`, JSON.stringify(payload, null, 2));

          const response = await fetch(PRODUCT_CREATE_URL, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "X-TENANT": TENANT_ID,
              "X-API-KEY": HYPERZOD_API_KEY!,
            },
            body: JSON.stringify(payload),
          });

          const text = await response.text();

          if (response.ok) {
            const data = JSON.parse(text);
            results.push({
              dish_name: dishName,
              success: true,
              product_id: data?.data?.product_id || data?.data?._id,
            });
            console.log(`✓ Product ${dishName} created successfully with type=${typeLabel}`);
            created = true;
            break;
          } else {
            console.log(`✗ Attempt with type=${typeLabel} failed: ${response.status}`);
          }
        }

        if (!created) {
          // All attempts failed
          results.push({
            dish_name: dishName,
            success: false,
            error: `Product create failed: all type values rejected`,
          });

          console.error(`✗ Product ${dishName} FAILED - all type values rejected`);
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
    const extrasAsOptions = extraDishes.length;

    console.log(
      `Import complete: ${successful} main products created, ${failed} failed, ${extrasAsOptions} extras attached as options`,
    );

    return new Response(
      JSON.stringify({
        success: failed === 0,
        message: `Imported ${successful} of ${mainDishes.length} main products (${extrasAsOptions} extras attached as options)`,
        successful_count: successful,
        failed_count: failed,
        extras_as_options: extrasAsOptions,
        main_products_with_options: mainDishes.length,
        skipped_extras_count: extraDishes.length,
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
