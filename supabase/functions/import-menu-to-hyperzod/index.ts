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

function removeEmojis(str: string): string {
  return str
    .replace(
      /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu,
      "",
    )
    .trim();
}

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

function buildProductOptions(extras: Dish[]): any[] {
  const optionItems = buildOptionItemsFromExtras(extras);
  if (optionItems.length === 0) return [];

  return [
    {
      option_name: "Extras",
      language_translation: [{ key: "option_name", value: "Extras", locale: "en" }],
      selection_type: "single",
      view_type: "list",
      type: "custom",
      enable_range: false,
      min_quantity: 0,
      max_quantity: optionItems.length,
      is_required: false,
      is_global_quantity_enabled: false,
      max_global_quantity: 0,
      options: optionItems,
    },
  ];
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

    const mainCategoryId = await getOrCreateCategory(merchant_id, "Main Dishes");
    if (!mainCategoryId) {
      return new Response(JSON.stringify({ success: false, error: "Failed to create product categories" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mainDishes = dishes.filter((d) => !d.is_upsell);
    const extraDishes = dishes.filter((d) => d.is_upsell);
    const hasExtras = extraDishes.length > 0;

    console.log(`Importing ${mainDishes.length} main dishes for merchant ${merchant_id}`);
    console.log(`Extras detected: ${extraDishes.length}`);

    type Result = {
      dish_name: string;
      created: boolean;
      product_id?: string;
      options_added?: boolean;
      error?: string;
      options_error?: string;
    };

    const results: Result[] = [];
    const created: Array<{ idx: number; productId: string; base: BaseProductPayload }> = [];

    // STEP 1: Create products WITHOUT options
    for (const dish of mainDishes) {
      const dishName = removeEmojis(safeString(dish?.name, 120));
      if (!dishName) {
        results.push({ dish_name: "(invalid dish)", created: false, error: "Missing name" });
        continue;
      }

      const description = safeString(dish?.description ?? "", 2000);
      const priceSell = Number(dish?.price) || 0;
      const priceBuy = 0;
      const profit = priceSell - priceBuy;
      const margin = priceSell !== 0 ? (profit / priceSell) * 100 : 0;

      const sku = dishName.replace(/[^a-zA-Z0-9\s]/g, "").substring(0, 50) || "SKU";

      const productImages: Array<{ file_url: string; is_cover: boolean }> = [];
      if (dish.image_url) productImages.push({ file_url: dish.image_url, is_cover: true });

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

      const createPayload = {
        ...base,
        has_product_options: false,
        product_options: [],
      };

      console.log(`[STEP 1] Creating: ${dishName}`);

      const res = await fetch(PRODUCT_CREATE_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-TENANT": TENANT_ID,
          "X-API-KEY": HYPERZOD_API_KEY!,
        },
        body: JSON.stringify(createPayload),
      });

      const raw = await res.text();

      if (!res.ok) {
        const parsed = safeJsonParse(raw);
        const errorForLog = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
        results.push({
          dish_name: dishName,
          created: false,
          error: `Create failed (${res.status}): ${truncateForLog(errorForLog, 400)}`,
        });
        continue;
      }

      const data = safeJsonParse(raw) as any;
      const productId = data?.data?.product_id || data?.data?._id;

      const idx = results.push({ dish_name: dishName, created: true, product_id: productId, options_added: false }) - 1;
      if (productId) created.push({ idx, productId, base });

      console.log(`✓ Created ${dishName} (id=${productId})`);
    }

    // STEP 2: Update products to add options with type="custom"
    if (hasExtras && created.length > 0) {
      console.log(`[STEP 2] Attaching options to ${created.length} products with type="custom"...`);

      for (const item of created) {
        const dishName = results[item.idx]?.dish_name || "(unknown)";

        const updatePayload = {
          id: item.productId,
          ...item.base,
          has_product_options: true,
          product_options: buildProductOptions(extraDishes),
        };

        console.log(`[STEP 2] Updating ${dishName}`);

        const res = await fetch(PRODUCT_UPDATE_URL, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-TENANT": TENANT_ID,
            "X-API-KEY": HYPERZOD_API_KEY!,
          },
          body: JSON.stringify(updatePayload),
        });

        const raw = await res.text();

        if (res.ok) {
          results[item.idx] = {
            ...results[item.idx],
            options_added: true,
          };
          console.log(`✓ Options attached to ${dishName}`);
        } else {
          const parsed = safeJsonParse(raw);
          const errorForLog = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
          results[item.idx] = {
            ...results[item.idx],
            options_added: false,
            options_error: truncateForLog(errorForLog, 700),
          };
          console.warn(`⚠ ${dishName} created, but options update failed: ${truncateForLog(errorForLog, 200)}`);
        }
      }
    }

    const createdCount = results.filter((r) => r.created).length;
    const failedCount = results.filter((r) => !r.created).length;
    const optionsCount = results.filter((r) => r.created && r.options_added).length;

    console.log(
      `Import complete: created=${createdCount}, failed=${failedCount}, options_attached=${optionsCount}`,
    );

    return new Response(
      JSON.stringify({
        success: failedCount === 0,
        message: `Imported ${createdCount} of ${mainDishes.length} main products (${optionsCount} with options)` ,
        created_count: createdCount,
        failed_count: failedCount,
        options_attached_count: optionsCount,
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
