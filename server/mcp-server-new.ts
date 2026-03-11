import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchRestaurants, getRestaurantDetails, getCuisines, getMerchantMenu } from "./hyperzod-client.js";

/**
 * Create and configure the Restaurant Listings MCP Server
 * ChatGPT Apps compliant - returns structured data only, no HTML widgets
 */
export function createRestaurantMCPServer(enableUI?: boolean): McpServer {
    const server = new McpServer({
        name: "restaurant-listings",
        version: "1.0.0",
    });

    // ==========================================
    // TOOL 1: Search Restaurants
    // ==========================================
    server.tool(
        "search_restaurants",
        "Find restaurants by city and cuisine. Returns chef stories, ratings, and ordering links.",
        {
            city: z.string().describe("City name to search in"),
            cuisine: z.string().optional().describe("Optional cuisine type filter"),
            limit: z.number().optional().describe("Number of results to return"),
        },
        async (args) => {
            console.log(`🔎 TOOL EXECUTION: search_restaurants called with args:`, JSON.stringify(args));
            const restaurants = await searchRestaurants(args);

            return {
                content: [{
                    type: "text" as const,
                    text: `Found ${restaurants.length} home chef${restaurants.length !== 1 ? 's' : ''} in ${args.city}${args.cuisine ? ` serving ${args.cuisine} cuisine` : ''}.`
                }],
                isError: false
            };
        }
    );

    // ==========================================
    // TOOL 2: Get Restaurant Details
    // ==========================================
    server.tool(
        "get_restaurant_details",
        "Get detailed information about a specific restaurant including chef story and menu highlights",
        {
            restaurantId: z.string().describe("Restaurant ID"),
        },
        async (args) => {
            const details = await getRestaurantDetails(args.restaurantId);

            return {
                content: [{
                    type: "text",
                    text: `${details.name} - ${details.cuisine} cuisine, rated ${details.rating}/5`,
                }],
                structuredContent: {
                    restaurant: {
                        id: details.id,
                        name: details.name,
                        cuisine: details.cuisine,
                        rating: details.rating,
                        price_range: details.priceRange,
                        description: details.description,
                        address: details.address,
                        image_url: details.image,
                        order_url: details.url,
                        hours: details.hours,
                    },
                },
            };
        }
    );

    // ==========================================
    // TOOL 3: Get Cuisines
    // ==========================================
    server.tool(
        "get_cuisines",
        "Get list of available cuisine types for filtering",
        {},
        async () => {
            const cuisines = await getCuisines();

            return {
                content: [{
                    type: "text",
                    text: `Available cuisines: ${cuisines.join(", ")}`,
                }],
                structuredContent: {
                    cuisines,
                },
            };
        }
    );

    // ==========================================
    // TOOL 4: Get Merchant Menu
    // ==========================================
    server.tool(
        "get_merchant_menu",
        "Get full menu with products organized by category",
        {
            merchantId: z.string().describe("Merchant ID"),
        },
        async (args) => {
            const menu = await getMerchantMenu(args.merchantId);
            const totalProducts = menu.categories.reduce((sum, cat) => sum + cat.products.length, 0);

            return {
                content: [{
                    type: "text",
                    text: `Menu for ${menu.merchant.name}: ${totalProducts} items across ${menu.categories.length} categories`,
                }],
                structuredContent: {
                    merchant: {
                        id: menu.merchant.id,
                        name: menu.merchant.name,
                        cuisine: menu.merchant.cuisine,
                        order_url: menu.merchant.url,
                    },
                    categories: menu.categories.map(cat => ({
                        id: cat.id,
                        name: cat.name,
                        products: cat.products.map(p => ({
                            id: p.id,
                            name: p.name,
                            description: p.description,
                            price: p.price,
                            image_url: p.image,
                            available: p.available,
                        })),
                    })),
                },
            };
        }
    );

    return server;
}
