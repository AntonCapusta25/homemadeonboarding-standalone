import { z } from "zod";

// Hyperzod API Configuration
export const HYPERZOD_API_KEY = process.env.HYPERZOD_API_KEY || "";
export const HYPERZOD_TENANT_ID = process.env.HYPERZOD_TENANT_ID || "3331"; // Default to 3331 if not provided, based on user snippet
export const HYPERZOD_BASE_URL = process.env.HYPERZOD_BASE_URL || "https://api.hyperzod.app";

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
    priceRange?: "budget" | "mid-range" | "premium";
    limit?: number;
}

/**
 * Fetch merchant menu with products organized by categories
 */
export async function getMerchantMenu(merchantId: string): Promise<MerchantMenu> {
    const url = `${HYPERZOD_BASE_URL}/merchant/v1/catalog/product/list?merchant_id=${merchantId}`;

    console.log(`🍽️ Fetching menu for merchant: ${merchantId}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-TENANT': HYPERZOD_TENANT_ID,
            'X-API-KEY': HYPERZOD_API_KEY,
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

// ... rest of the existing code remains the same ...
