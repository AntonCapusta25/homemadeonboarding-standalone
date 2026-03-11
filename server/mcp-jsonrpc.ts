/**
 * MCP JSON-RPC Handler for ChatGPT Apps
 * Uses JSON-RPC 2.0 over HTTP POST (not SSE) for reliable communication
 */

import "dotenv/config";
import { createRestaurantMCPServer } from './mcp-server.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load widget HTML
let widgetHtml = '';
try {
    widgetHtml = fs.readFileSync(
        path.join(__dirname, '../public/widgets/restaurant-simple.html'),
        'utf-8'
    );
    console.log(`✅ Loaded widget bundle (${(widgetHtml.length / 1024).toFixed(1)}kb)`);
} catch (error) {
    console.warn('Widget bundle not found, using fallback');
    widgetHtml = '<html><body>Widget not found</body></html>';
}

// Error codes
const ErrorCode = {
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
};

// Create error response
function createErrorResponse(id: string | number | null, code: number, message: string, data?: unknown) {
    return {
        jsonrpc: '2.0' as const,
        id,
        error: {
            code,
            message,
            ...(data ? { data } : {}),
        },
    };
}

// Widget resource URI
const WIDGET_URI = 'ui://widget/restaurant-carousel.html';

/**
 * Handle MCP JSON-RPC request
 */
export async function handleMcpRequest(request: unknown): Promise<object> {
    // Validate JSON-RPC structure
    if (!request || typeof request !== 'object') {
        return createErrorResponse(null, ErrorCode.PARSE_ERROR, 'Parse error');
    }

    const req = request as Record<string, unknown>;

    // Validate required fields
    if (req.jsonrpc !== '2.0' || !req.id || !req.method) {
        return createErrorResponse(null, ErrorCode.INVALID_REQUEST, 'Invalid Request');
    }

    const id = req.id as string | number;
    const method = req.method as string;
    const params = req.params as Record<string, unknown> | undefined;

    console.log(`📨 MCP Request: ${method}`, params ? JSON.stringify(params).substring(0, 100) : '');

    try {
        switch (method) {
            case 'initialize':
                return handleInitialize(id);

            case 'tools/list':
                return handleToolsList(id);

            case 'tools/call':
                return await handleToolsCall(id, params);

            case 'resources/list':
                return handleResourcesList(id);

            case 'resources/read':
                return handleResourcesRead(id, params);

            default:
                return createErrorResponse(id, ErrorCode.METHOD_NOT_FOUND, 'Method not found');
        }
    } catch (error) {
        console.error('MCP request error:', error);
        return createErrorResponse(id, ErrorCode.INTERNAL_ERROR, 'Internal error', {
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}

/**
 * Handle initialize - MCP handshake
 */
function handleInitialize(id: string | number) {
    console.log('🤝 MCP Initialize');
    return {
        jsonrpc: '2.0',
        id,
        result: {
            protocolVersion: '2024-11-05',
            serverInfo: {
                name: 'restaurant-listings',
                version: '1.0.0',
            },
            capabilities: {
                tools: {},
                resources: {},
            },
        },
    };
}

/**
 * Handle tools/list - Return available tools
 */
function handleToolsList(id: string | number) {
    console.log('🔧 Tools List');
    const tools = [
        {
            name: 'search_restaurants',
            description: 'Use this when the user wants to find home chefs, restaurants, or food delivery options in a specific city. Use this for queries about finding food, ordering meals, or discovering local chefs. Do not use for restaurant reviews, recipes, or cooking instructions.',
            inputSchema: {
                type: 'object',
                properties: {
                    city: {
                        type: 'string',
                        description: "City name to search in. Examples: 'Amsterdam', 'Enschede', 'New York', 'London'.",
                    },
                    cuisine: {
                        type: 'string',
                        description: "Optional cuisine type filter. Examples: 'Italian', 'Mexican', 'Asian'.",
                    },
                    priceRange: {
                        type: 'string',
                        enum: ['budget', 'mid-range', 'premium'],
                        description: 'Optional price range filter.',
                    },
                    limit: {
                        type: 'number',
                        default: 6,
                        description: 'Maximum number of results (default: 6, max: 12).',
                    },
                },
                required: ['city'],
            },
            _meta: {
                'openai/outputTemplate': WIDGET_URI,
                'openai/resultCanProduceWidget': true,
                'openai/toolInvocation/invoking': 'Searching for home chefs...',
                'openai/toolInvocation/invoked': 'Found results',
                'openai/readOnlyHint': true,
                'openai/destructiveHint': false,
                'openai/openWorldHint': false,
            },
        },
    ];

    return {
        jsonrpc: '2.0',
        id,
        result: { tools },
    };
}

/**
 * Handle tools/call - Execute a tool
 */
async function handleToolsCall(id: string | number, params?: Record<string, unknown>) {
    if (!params || !params.name) {
        return createErrorResponse(id, ErrorCode.INVALID_PARAMS, 'Missing tool name');
    }

    const toolName = params.name as string;
    const toolArgs = (params.arguments || {}) as Record<string, unknown>;

    console.log(`🔎 Tool Call: ${toolName}`, JSON.stringify(toolArgs));

    if (toolName === 'search_restaurants') {
        // Import and call the search function
        const { searchRestaurants } = await import('./hyperzod-client.js');

        const city = (toolArgs.city as string) || 'Amsterdam';
        const cuisine = toolArgs.cuisine as string | undefined;
        const priceRange = toolArgs.priceRange as string | undefined;
        const limit = (toolArgs.limit as number) || 6;

        try {
            const restaurants = await searchRestaurants({ city, cuisine, priceRange, limit });

            console.log(`📊 Found ${restaurants.length} restaurants`);

            const result = {
                content: [
                    {
                        type: 'text',
                        text: restaurants.length > 0
                            ? `Found ${restaurants.length} home chef${restaurants.length !== 1 ? 's' : ''} in ${city}.`
                            : `No home chefs available in ${city} yet. Check back soon!`,
                    },
                ],
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
                        order_url: r.url,
                    })),
                },
                _meta: {
                    'openai/outputTemplate': WIDGET_URI,
                    'openai/resultCanProduceWidget': true,
                    'openai/widgetAccessible': `Restaurant carousel showing ${restaurants.length} home chefs in ${city}`,
                },
            };

            return {
                jsonrpc: '2.0',
                id,
                result,
            };
        } catch (error) {
            console.error('Search error:', error);
            return createErrorResponse(id, ErrorCode.INTERNAL_ERROR, 'Search failed', {
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    return createErrorResponse(id, ErrorCode.INVALID_PARAMS, `Unknown tool: ${toolName}`);
}

/**
 * Handle resources/list - Return available widget resources
 */
function handleResourcesList(id: string | number) {
    console.log('📋 Resources List');
    const resources = [
        {
            uri: WIDGET_URI,
            name: 'Restaurant Carousel Widget',
            description: 'Interactive carousel displaying home chefs and restaurants',
            mimeType: 'text/html+skybridge',
            _meta: {
                'openai/outputTemplate': WIDGET_URI,
                'openai/widgetDescription': 'Interactive carousel showing home chefs. Users can browse, view details, and order food directly.',
                'openai/readOnlyHint': true,
                'openai/resultCanProduceWidget': true,
            },
        },
    ];

    return {
        jsonrpc: '2.0',
        id,
        result: { resources },
    };
}

/**
 * Handle resources/read - Return widget HTML content
 */
function handleResourcesRead(id: string | number, params?: Record<string, unknown>) {
    if (!params || !params.uri) {
        return createErrorResponse(id, ErrorCode.INVALID_PARAMS, 'Missing uri');
    }

    const uri = params.uri as string;
    console.log(`📖 Resource Read: ${uri}`);

    if (uri !== WIDGET_URI) {
        return createErrorResponse(id, ErrorCode.INVALID_PARAMS, `Unknown resource: ${uri}`);
    }

    return {
        jsonrpc: '2.0',
        id,
        result: {
            contents: [
                {
                    uri: WIDGET_URI,
                    mimeType: 'text/html+skybridge',
                    text: widgetHtml,
                    _meta: {
                        'openai/outputTemplate': WIDGET_URI,
                        'openai/widgetAccessible': true,
                        'openai/resultCanProduceWidget': true,
                    },
                },
            ],
        },
    };
}
