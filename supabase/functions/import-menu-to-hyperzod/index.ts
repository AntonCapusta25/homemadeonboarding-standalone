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
  /** Optional override for Hyperzod's product option group type */
  option_group_type?: string;
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

// Try to discover a valid option group type from existing products (when docs are unavailable)
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

    if (!res.ok) {
      console.log(`[OptionTypeDiscovery] product/list failed (${res.status})`);
      return null;
    }

    const json = await res.json().catch(() => null);
    const items = (json as any)?.data?.data || (json as any)?.data || [];

    for (const p of items) {
      const groups = Array.isArray((p as any)?.product_options) ? (p as any).product_options : [];
      const groupWithType = groups.find((g: any) => typeof g?.type === "string" && g.type.trim().length > 0);
      if (groupWithType?.type) {
        console.log(`[OptionTypeDiscovery] Discovered option group type: ${groupWithType.type}`);
        return String(groupWithType.type);
      }
    }

    return null;
  } catch (e) {
    console.log("[OptionTypeDiscovery] error:", e);
    return null;
  }
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

      // NOTE: This mirrors the payload shape used in our existing test-hyperzod-import function.
      return {
        language_translation: [{ key: "name", value: name, locale: "en" }],
        name,
        price_buy: priceBuy,
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

// Build product options - with alternative key names and selection types
function buildProductOptions(
  extras: Dish[], 
  typeValue?: string | number, 
  useVariationsKey = false,
  selectionType: "multiple" | "single" = "multiple"
): any[] {
  const optionItems = buildOptionItemsFromExtras(extras);
  if (optionItems.length === 0) return [];

  const group: any = {
    language_translation: [{ key: "option_name", value: "Extras", locale: "en" }],
    selection_type: selectionType,
    enable_range: true,
    min_quantity: 0,
    max_quantity: optionItems.length,
    is_required: false,
    view_type: "list",
  };

  // Try "variations" key (as shown in UI) or "options" key
  if (useVariationsKey) {
    group.variations = optionItems;
  } else {
    group.options = optionItems;
  }

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

    const discoveredType = hasExtras ? (await fetchExistingOptionGroupType(merchant_id)) : null;

    // Priority: user-provided > discovered > hardcoded candidates
    // Based on Hyperzod UI analysis - they use specific enum values
    // The UI shows options like "Spice level" with variations "Low", "Medium", etc.
    const stringTypeCandidates = [
      ...(optionGroupTypeRequested ? [optionGroupTypeRequested] : []),
      ...(discoveredType ? [discoveredType] : []),
      // Exact enum values that Hyperzod likely uses (based on UI checkbox/radio patterns)
      "nested",        // Most likely for tree-style options
      "simple",        // Basic option type
      "standard",      // Standard option type
      "flat",          // Flat list of options
      "group",         // Option group
      "default",       // Default type
      "product",       // Product-level options
      "product_option", // Product option type
      "addon",
      "add-on",
      "extra",
      "modifier",
      "variation",
      "variant",
      "size",
      "topping",
      "side",
      // Selection type patterns
      "single_select",
      "multi_select",
      "single",
      "multiple",
      "multi",
      "checkbox",
      "radio",
      "list",
      "dropdown",
    ].filter((v, i, arr) => arr.indexOf(v) === i);

    // Try string values, then numeric values, then finally without options
    const typeCandidates: (string | number)[] = [
      ...stringTypeCandidates,
      // Numeric enum values (common pattern: 0=single, 1=multiple, 2=nested, etc.)
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ];

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

        let created = false;
        let lastErrorDetail = "";

        // Try with "options" key first (standard), then with "variations" key (as shown in UI)
        const keyVariants = [false, true]; // false = "options" key, true = "variations" key
        const selectionTypes: Array<"multiple" | "single"> = ["multiple", "single"];

        for (const selectionType of selectionTypes) {
          if (created) break;

          for (const useVariationsKey of keyVariants) {
            if (created) break;

            for (const typeValue of typeCandidates) {
              const payload = {
                ...basePayload,
                has_product_options: hasExtras,
                product_options: hasExtras ? buildProductOptions(extraDishes, typeValue, useVariationsKey, selectionType) : [],
              };

              const typeLabel =
                typeValue === undefined ? "(no type field)" : typeValue === "" ? "(empty string)" : String(typeValue);
              const keyLabel = useVariationsKey ? "variations" : "options";

              console.log(
                `Creating: ${dishName} (type=${typeLabel}, key=${keyLabel}, sel=${selectionType})`,
              );

              // Log the full payload for debugging (first attempt only to reduce logs)
              if (typeValue === typeCandidates[0] && !useVariationsKey && selectionType === "multiple") {
                console.log(`[DEBUG] Full payload for ${dishName}:`, JSON.stringify(payload, null, 2));
              }

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

              const rawText = await response.text();

              if (response.ok) {
                const data = safeJsonParse(rawText) as any;
                results.push({
                  dish_name: dishName,
                  success: true,
                  product_id: data?.data?.product_id || data?.data?._id,
                  used_option_group_type: `type=${typeValue}, key=${keyLabel}, sel=${selectionType}`,
                });
                console.log(`✓ Product ${dishName} created with type=${typeLabel}, key=${keyLabel}, sel=${selectionType}`);
                created = true;
                break;
              }

              const parsed = safeJsonParse(rawText);
              const errorForLog = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
              lastErrorDetail = truncateForLog(errorForLog);

              // Only log failures for first few attempts to reduce noise
              if (typeCandidates.indexOf(typeValue) < 3) {
                console.log(
                  `✗ type=${typeLabel}, key=${keyLabel}, sel=${selectionType}: ${response.status}`,
                );
              }
            }
          }
        }

        // FALLBACK: If all type values failed BUT we have options, try creating WITHOUT options
        if (!created && hasExtras) {
          console.log(`All option types failed for ${dishName}, trying without options as fallback...`);
          
          const noOptionsPayload = {
            ...basePayload,
            has_product_options: false,
            product_options: [],
          };
          
          const fallbackResponse = await fetch(PRODUCT_CREATE_URL, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "X-TENANT": TENANT_ID,
              "X-API-KEY": HYPERZOD_API_KEY!,
            },
            body: JSON.stringify(noOptionsPayload),
          });
          
          const fallbackText = await fallbackResponse.text();
          
          if (fallbackResponse.ok) {
            const data = safeJsonParse(fallbackText) as any;
            results.push({
              dish_name: dishName,
              success: true,
              product_id: data?.data?.product_id || data?.data?._id,
              used_option_group_type: "(no options - fallback)",
            });
            console.log(`✓ Product ${dishName} created WITHOUT options (fallback)`);
            created = true;
          } else {
            console.log(`✗ Fallback (no options) also failed: ${fallbackResponse.status}`);
          }
        }

        if (!created) {
          results.push({
            dish_name: dishName,
            success: false,
            error: `Product create failed. Last error: ${lastErrorDetail || "(no details)"}`,
          });

          console.error(`✗ Product ${dishName} FAILED completely`);
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
