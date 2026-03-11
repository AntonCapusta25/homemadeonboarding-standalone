import { z } from "zod";

// Hyperzod API Configuration
// Read from process.env at runtime instead of module load time
// This ensures Fly.io secrets are available
function getHyperzodConfig() {
    return {
        apiKey: process.env.HYPERZOD_API_KEY || "",
        tenantId: process.env.HYPERZOD_TENANT_ID || "3331",
        baseUrl: process.env.HYPERZOD_BASE_URL || "https://api.hyperzod.app"
    };
}

// Type definitions
export interface Restaurant {
    id: string;
    name: string;
    cuisine: string;
    rating: number;
    priceRange: string;
    image: string;
    address: string;
    url: string;
    description?: string;
    hours?: string;
    logo?: string;
    phone?: string;
    deliveryFee?: string;
    categories?: string[];
}

export interface Category {
    id: string;
    name: string;
    products: Product[];
}

export interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    image?: string;
    available: boolean;
}

export interface MerchantMenu {
    merchant: {
        id: string;
        name: string;
        address: string;
        cuisine: string;
        url: string;
    };
    categories: Category[];
}
export interface SearchParams {
    city: string;
    cuisine?: string;
    priceRange?: string;
    limit?: number;
}

// Hyperzod merchant response schema
// Adjusting schema to be more loose as we don't know the exact listing response structure,
// but relying on common fields seen in snippet/docs
const MerchantSchema = z.object({
    id: z.union([z.string(), z.number()]).transform(val => String(val)),
    name: z.string().optional(),
    business_name: z.string().optional(),
    category: z.string().optional(), // Might be merchant_category_ids in some endpoints, or category name
    rating: z.number().optional(),
    price_range: z.string().optional(),
    logo_url: z.string().optional(),
    cover_image: z.string().optional(),
    address: z.string().optional(),
    store_url: z.string().optional(),
    description: z.string().optional(),
    phone: z.string().optional(),
    business_hours: z.string().optional(), // format might vary
    slug: z.string().optional(),
});

const MerchantsResponseSchema = z.object({
    data: z.array(MerchantSchema).optional(), // Hyperzod often wraps list in 'data'
    // Fallback for if it's direct array or different key
    merchants: z.array(MerchantSchema).optional(),
});

export async function searchRestaurants(params: SearchParams): Promise<Restaurant[]> {
    console.log(`🔍 searchRestaurants called with params:`, JSON.stringify(params));

    const config = getHyperzodConfig();
    if (!config.apiKey) {
        console.error("❌ HYPERZOD_API_KEY is not configured");
        throw new Error("HYPERZOD_API_KEY is not configured");
    }

    try {
        const baseUrl = new URL(`${config.baseUrl}/admin/v1/merchant/list`);
        console.log(`📡 Fetching from: ${baseUrl.toString()}`);

        let allMerchants: any[] = [];
        let currentPage = 1;
        let lastPage = 1;

        do {
            const url = new URL(baseUrl.toString());
            url.searchParams.set("page", currentPage.toString());

            console.log(`   Fetching page ${currentPage}...`);
            const response = await fetch(url.toString(), {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "X-TENANT": config.tenantId,
                    "X-API-KEY": config.apiKey,
                },
            });

            if (!response.ok) {
                const text = await response.text();
                console.error(`❌ Hyperzod API error: ${response.status}`, text.substring(0, 200));
                throw new Error(`Hyperzod API error: ${response.status}`);
            }

            const responseData = await response.json();
            console.log(`   Page ${currentPage} response:`, {
                success: responseData.success,
                dataLength: responseData.data?.data?.length || 0,
                lastPage: responseData.data?.last_page || 1
            });

            if (responseData.success && responseData.data) {
                lastPage = responseData.data.last_page || 1;
                if (Array.isArray(responseData.data.data)) {
                    allMerchants = allMerchants.concat(responseData.data.data);
                }
            }

            currentPage++;
        } while (currentPage <= lastPage);

        console.log(`🍽️ Total: ${allMerchants.length} merchants`);
        let merchants = allMerchants;

        // Filter for published/active merchants only (status: true means published)
        merchants = merchants.filter((m: any) => m.status === true);
        console.log(`✅ Published merchants: ${merchants.length}`);

        // Filter by city - check multiple address fields for better coverage
        if (params.city) {
            const cityLower = params.city.toLowerCase();
            merchants = merchants.filter((m: any) => {
                // Build haystack from all possible address fields
                const haystack = [
                    m.city,
                    m.address,
                    m.business_address,
                    m.location?.address,
                    m.area_name,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return haystack.includes(cityLower);
            });
            console.log(`📍 ${params.city}: ${merchants.length} merchants`);
        }

        const result = merchants.map((m: any) => mapMerchantToRestaurant(m));
        console.log(`✅ Returning ${result.length} restaurants`);
        return result;

    } catch (error) {
        console.error("❌ Error fetching restaurants from Hyperzod:", error);
        console.error("   Error details:", error instanceof Error ? error.message : String(error));
        console.error("   Stack:", error instanceof Error ? error.stack : "N/A");
        throw error;
    }
}

/**
 * Get details for a specific restaurant
 */
export async function getRestaurantDetails(restaurantId: string): Promise<Restaurant> {
    const config = getHyperzodConfig();
    if (!config.apiKey) {
        throw new Error("HYPERZOD_API_KEY is not configured");
    }

    try {
        const response = await fetch(`${config.baseUrl}/client/v1/merchant/${restaurantId}`, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-TENANT": config.tenantId,
                "X-API-KEY": config.apiKey,
            },
        });

        if (!response.ok) {
            throw new Error(`Hyperzod API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        // Assuming data is the merchant object or data.data
        const merchant = data.data || data;

        return mapMerchantToRestaurant(merchant);
    } catch (error) {
        console.error("Error fetching restaurant details from Hyperzod:", error);
        throw error;
    }
}

/**
 * Get list of available cuisines
 */
export async function getCuisines(): Promise<string[]> {
    const config = getHyperzodConfig();
    // If there is an endpoint for categories: /client/v1/category/list
    try {
        const response = await fetch(`${config.baseUrl}/client/v1/category/list`, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-TENANT": config.tenantId,
                "X-API-KEY": config.apiKey,
            },
        });

        if (response.ok) {
            const data = await response.json();
            const list = data.data || data;
            if (Array.isArray(list)) {
                return list.map((c: any) => c.name);
            }
        }
    } catch (e) {
        console.warn("Failed to fetch cuisines, using defaults");
    }

    return [
        "Italian",
        "Mexican",
        "Asian",
        "American",
        "Mediterranean",
        "Indian",
        "Japanese",
    ];
}

/**
 * Map Hyperzod merchant data to our Restaurant format
 */
function mapMerchantToRestaurant(merchant: any): Restaurant {
    const name = merchant.name || merchant.business_name || "Unknown Restaurant";

    // Extract images - prefer cover image, fallback to logo
    const coverImage = merchant.images?.cover?.image_url || merchant.images?.cover?.image_thumb_url;
    const logoImage = merchant.images?.logo?.image_url || merchant.images?.logo?.image_thumb_url;
    const image = coverImage || logoImage || getDefaultImage();

    // Extract rating - use average_rating if available
    const rating = merchant.average_rating > 0 ? merchant.average_rating : 4.5;

    // Calculate price range based on min_order_amount
    let priceRange = "mid-range"; // Use lowercase to match tool schema
    if (merchant.min_order_amount) {
        if (merchant.min_order_amount < 15) priceRange = "budget";
        else if (merchant.min_order_amount > 30) priceRange = "premium";
    }

    // Generate safe URL slug
    const slug = merchant.slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    return {
        id: String(merchant._id || merchant.merchant_id || merchant.id),
        name: name,
        cuisine: merchant.category_name || (merchant.categories && merchant.categories[0]?.name) || "Food",
        rating: rating,
        priceRange: priceRange, // Now normalized to lowercase
        image: image,
        logo: logoImage, // Add logo separately
        address: merchant.address || "Address not available",
        url: `https://www.homemademeals.net/en/m/${slug}/${merchant._id || merchant.merchant_id}`,
        description: merchant.description || `Experience delicious food at ${name}.`,
        phone: merchant.phone || merchant.owner_phone,
        hours: merchant.business_hours || "10:00 AM - 10:00 PM",
        deliveryFee: merchant.delivery_amount || 0,
        categories: merchant.merchant_category_ids || [],
    };
}

/**
 * Normalize price range to consistent format
 */
function normalizePriceRange(priceRange?: string): string {
    if (!priceRange) return "Mid-range";

    const normalized = priceRange.toLowerCase();
    if (normalized.includes("budget") || normalized.includes("$")) return "Budget";
    if (normalized.includes("premium") || normalized.includes("$$$")) return "Premium";
    return "Mid-range";
}

/**
 * Get default placeholder image for restaurants
 */
function getDefaultImage(): string {
    return "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop";
}

// Mock data fallback
function getMockRestaurants(params: SearchParams): Restaurant[] {
    return [
        {
            id: "1",
            name: `Mock ${params.cuisine || "Local"} Bistro`,
            cuisine: params.cuisine || "International",
            rating: 4.8,
            priceRange: "Mid-range",
            image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
            address: `123 Main St, ${params.city}`,
            url: "https://example.com/order",
            description: "A lovely place for dinner.",
            hours: "9 AM - 10 PM"
        },
        {
            id: "2",
            name: `${params.city} Dining House`,
            cuisine: "American",
            rating: 4.2,
            priceRange: "Premium",
            image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=300&fit=crop",
            address: `456 Elm St, ${params.city}`,
            url: "https://example.com/order2",
            description: "Fine dining experience.",
            hours: "5 PM - 11 PM"
        }
    ]
}

/**
 * Fetch merchant menu with products organized by categories
 */
export async function getMerchantMenu(merchantId: string): Promise<MerchantMenu> {
    const config = getHyperzodConfig();
    const url = `${config.baseUrl}/merchant/v1/catalog/product/list?merchant_id=${merchantId}`;

    console.log(`🍽️ Fetching menu for merchant: ${merchantId}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-TENANT': config.tenantId,
            'X-API-KEY': config.apiKey,
        },
    });

    if (!response.ok) {
        throw new Error(`Hyperzod API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Organize products by category
    const categoriesMap = new Map<string, Category>();
    const products = data.data?.data || [];

    products.forEach((product: any) => {
        const categoryId = product.product_category?.[0] || 'uncategorized';
        const categoryName = product.category_name || 'Other';

        if (!categoriesMap.has(categoryId)) {
            categoriesMap.set(categoryId, {
                id: categoryId,
                name: categoryName,
                products: []
            });
        }

        categoriesMap.get(categoryId)!.products.push({
            id: product._id || product.id || product.product_id,
            name: product.name,
            description: product.description,
            price: product.price,
            image: product.product_images?.[0]?.file_url || product.images?.[0]?.image_url || product.image_url,
            available: product.is_available !== false
        });
    });

    const categories = Array.from(categoriesMap.values());

    console.log(`✅ Menu loaded: ${products.length} products in ${categories.length} categories`);

    return {
        merchant: {
            id: merchantId,
            name: data.merchant_name || 'Restaurant',
            address: data.merchant_address || '',
            cuisine: data.merchant_cuisine || '',
            url: `https://www.homemademeals.net/en/m/${data.merchant_slug || 'restaurant'}/${merchantId}`
        },
        categories
    };
}
