import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchRestaurants, getRestaurantDetails, getCuisines, getMerchantMenu } from "./hyperzod-client.js";

/**
 * Create and configure the Restaurant Listings MCP Server
 */
export function createRestaurantMCPServer(widgetHtml: string): McpServer {
    const server = new McpServer({
        name: "restaurant-listings",
        version: "1.0.0",
    });

    // ==========================================
    // REGISTER WIDGET RESOURCE
    // ==========================================
    server.registerResource(
        "restaurant-carousel-widget",
        "ui://widget/restaurant-carousel.html",
        {},
        async () => ({
            contents: [{
                uri: "ui://widget/restaurant-carousel.html",
                mimeType: "text/html+skybridge",
                text: widgetHtml,
                _meta: {
                    "openai/widgetPrefersBorder": true,
                    "openai/widgetDomain": "https://chatgpt.com",
                    "openai/widgetCSP": {
                        connect_domains: ["https://api.hyperzod.app"],
                        resource_domains: ["https://cdn-upload.hyperzod.dev", "https://images.unsplash.com"],
                    },
                },
            }],
        })
    );

    // ==========================================
    // TOOL 1: Search Restaurants
    // ==========================================
    server.registerTool(
        "search_restaurants",
        {
            title: "Search for home chefs and restaurants",
            description: "Use this when the user wants to find home chefs, restaurants, or food delivery options in a specific city. Use this for queries about finding food, ordering meals, or discovering local chefs. Do not use for restaurant reviews, recipes, or cooking instructions.",
            inputSchema: {
                city: z.string().describe("City name to search in. Examples: 'Amsterdam', 'Enschede', 'New York', 'London'. Use the city name the user mentions."),
                cuisine: z.string().optional().describe("Optional cuisine type filter. Examples: 'Italian', 'Mexican', 'Asian', 'Mediterranean', 'Indian'. Only use if the user specifies a cuisine preference."),
                priceRange: z.enum(["budget", "mid-range", "premium"]).optional().describe("Optional price range filter. Use 'budget' for affordable options, 'mid-range' for moderate pricing, 'premium' for high-end dining. Only use if the user mentions price or budget."),
                limit: z.number().min(1).max(12).default(6).describe("Maximum number of results to return. Default is 6. Use 12 for 'show me more' requests, 3-4 for 'a few options'."),
            },
            _meta: {
                "openai/outputTemplate": "ui://widget/restaurant-carousel.html",
                "openai/resultCanProduceWidget": true,
                "openai/toolInvocation/invoking": "Searching for home chefs...",
                "openai/toolInvocation/invoked": "Found results",
                "openai/readOnlyHint": true, // This tool only reads data, never mutates
                "openai/destructiveHint": false, // Does not delete or overwrite user data
                "openai/openWorldHint": false, // Does not publish content or reach outside user's account
            },
        },
        async ({ city, cuisine, priceRange, limit }) => {
            console.log(`🔎 TOOL EXECUTION: search_restaurants called with args:`, JSON.stringify({ city, cuisine, priceRange, limit }));
            try {
                const restaurants = await searchRestaurants({ city, cuisine, priceRange, limit });

                // Handle empty results gracefully
                if (restaurants.length === 0) {
                    return {
                        content: [{
                            type: "text" as const,
                            text: `No home chefs are available in ${city} yet${cuisine ? ` for ${cuisine} cuisine` : ''}. We're actively onboarding local cooks — check back soon!`
                        }],
                        structuredContent: {
                            city,
                            cuisine,
                            priceRange,
                            total: 0,
                            restaurants: []
                        },
                        _meta: {
                            "openai/outputTemplate": "ui://widget/restaurant-carousel.html",
                            "openai/resultCanProduceWidget": true,
                            "openai/widgetAccessible": `No home chefs available in ${city}`
                        }
                    };
                }

                const result = {
                    content: [{
                        type: "text" as const,
                        text: `Found ${restaurants.length} home chef${restaurants.length !== 1 ? 's' : ''} in ${city}${cuisine ? ` serving ${cuisine} cuisine` : ''}. Browse the carousel above to see details, ratings, and order links.`
                    }],
                    structuredContent: {
                        city,
                        cuisine,
                        priceRange,
                        total: restaurants.length,
                        restaurants: restaurants.map(r => ({
                            id: r.id,
                            name: r.name,
                            cuisine: r.cuisine,
                            rating: r.rating,
                            price_range: r.priceRange,
                            description: r.description,
                            address: r.address,
                            image_url: r.image,
                            order_url: r.url
                        }))
                    },
                    _meta: {
                        "openai/outputTemplate": "ui://widget/restaurant-carousel.html",
                        "openai/resultCanProduceWidget": true,
                        "openai/widgetAccessible": `Restaurant carousel showing ${restaurants.length} home chefs in ${city}`
                    }
                };

                // Log the complete response for debugging
                console.log(`📤 RESPONSE TO CHATGPT:`);
                console.log(`   - Content: "${result.content[0].text}"`);
                console.log(`   - Structured data: ${result.structuredContent.restaurants.length} restaurants`);
                console.log(`   - Widget template: ${result._meta["openai/outputTemplate"]}`);
                console.log(`   - Full response:`, JSON.stringify(result, null, 2).substring(0, 500));

                return result;
            } catch (error) {
                console.error("Error in search_restaurants:", error);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error searching restaurants: ${error instanceof Error ? error.message : "Unknown error"}`,
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    // ==========================================
    // TOOL 2: Get Restaurant Details
    // ==========================================
    server.registerTool(
        "get_restaurant_details",
        {
            title: "Get detailed information about a restaurant",
            description: "Use this when the user asks for more details about a specific restaurant or home chef they saw in search results. Use this to get full information including address, hours, phone number, and menu details. Do not use for searching or listing multiple restaurants.",
            inputSchema: {
                restaurantId: z.string().describe("The unique ID of the restaurant. This is provided in search results."),
            },
            _meta: {
                "openai/readOnlyHint": true,
            },
        },
        async ({ restaurantId }) => {
            try {
                const restaurant = await getRestaurantDetails(restaurantId);

                return {
                    content: [
                        {
                            type: "text",
                            text: `**${restaurant.name}**\n\n${restaurant.description}\n\n📍 ${restaurant.address}\n⭐ Rating: ${restaurant.rating}/5\n💰 Price: ${restaurant.priceRange}\n🍽️ Cuisine: ${restaurant.cuisine}${restaurant.phone ? `\n📞 ${restaurant.phone}` : ''}${restaurant.hours ? `\n🕐 ${restaurant.hours}` : ''}\n\n[Order Now](${restaurant.url})`,
                        },
                    ],
                    _meta: {
                        restaurant,
                    },
                };
            } catch (error) {
                console.error("Error in get_restaurant_details:", error);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error fetching restaurant details: ${error instanceof Error ? error.message : "Unknown error"}`,
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    // ==========================================
    // TOOL 3: Get Available Cuisines
    // ==========================================
    server.tool(
        "get_cuisines",
        "Get a list of available cuisine types for filtering restaurant searches.",
        {},
        async () => {
            try {
                const cuisines = await getCuisines();

                return {
                    content: [
                        {
                            type: "text",
                            text: `Available cuisines: ${cuisines.join(", ")}`,
                        },
                    ],
                    _meta: {
                        cuisines,
                    },
                };
            } catch (error) {
                console.error("Error in get_cuisines:", error);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error fetching cuisines: ${error instanceof Error ? error.message : "Unknown error"}`,
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    // ==========================================
    // TOOL 4: Get Merchant Menu
    // ==========================================
    server.tool(
        "get_merchant_menu",
        "Get the full menu for a specific merchant/restaurant with products organized by categories. Returns product names, descriptions, prices, and images.",
        {
            merchantId: z.string().describe("The merchant ID to fetch the menu for"),
        },
        async (args) => {
            try {
                const menu = await getMerchantMenu(args.merchantId);

                const totalProducts = menu.categories.reduce((sum, cat) => sum + cat.products.length, 0);

                return {
                    content: [
                        {
                            type: "text",
                            text: `Menu for ${menu.merchant.name}:\n\n` +
                                `📍 ${menu.merchant.address}\n` +
                                `🍽️ ${menu.merchant.cuisine}\n` +
                                `📦 ${totalProducts} products in ${menu.categories.length} categories\n\n` +
                                menu.categories.map(cat =>
                                    `**${cat.name}** (${cat.products.length} items):\n` +
                                    cat.products.map(p =>
                                        `  • ${p.name} - €${p.price}${p.description ? ` - ${p.description.substring(0, 50)}...` : ''}`
                                    ).join('\n')
                                ).join('\n\n'),
                        },
                    ],
                    _meta: {
                        menu,
                    },
                };
            } catch (error) {
                console.error("Error in get_merchant_menu:", error);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error fetching menu: ${error instanceof Error ? error.message : "Unknown error"}`,
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    return server;
}

// Create and export the server instance for Vercel
const widgetHtml = ""; // Will be loaded in Vercel function
export const mcpServer = createRestaurantMCPServer(widgetHtml);
