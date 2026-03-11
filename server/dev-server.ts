import "dotenv/config";
import express from 'express';
import { createServer } from 'http';
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createRestaurantMCPServer } from "./mcp-server.js";
import { handleMcpRequest } from "./mcp-jsonrpc.js";
import menuRouter from './menu-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '8787');
const SSE_PATH = "/sse";
const MESSAGES_PATH = "/messages";

// Store active transports
const transports = new Map<string, SSEServerTransport>();

// Load widget bundle
let widgetBundle: string | undefined;
try {
    const widgetPath = join(__dirname, "../web/dist/widget.js");
    widgetBundle = readFileSync(widgetPath, "utf-8");
    console.log(`✅ Loaded widget bundle (${(widgetBundle.length / 1024).toFixed(1)}kb)`);
} catch (error) {
    console.warn("⚠️  Widget bundle not found - widgets will not be available");
    console.warn("   Run 'cd web && npm run build' to build the widget");
}

// Load widget HTML template (fragment format per Apps SDK docs)
const widgetHtml = readFileSync(join(__dirname, "../public/widgets/restaurant-simple.html"), "utf-8");

// Middleware
// NOTE: Do NOT use express.json() here - it consumes the request body stream
// and causes "stream is not readable" errors in SSEServerTransport.handlePostMessage()
app.use(express.static('public'));

// CORS Headers Middleware
app.use((req, res, next) => {
    // Allow everything for dev
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, x-tenant");

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
    }
    next();
});

// 1. Health Checks & Info
app.get("/", (req, res) => {
    const host = req.headers.host || `localhost:${PORT}`;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    res.json({
        status: "ok",
        service: "Restaurant Listings MCP Server (SSE)",
        version: "1.0.0",
        endpoint: `${protocol}://${host}${SSE_PATH}`
    });
});

// 2. Widget Bundle Serving
app.get("/widget/chef-search.js", (req, res) => {
    if (!widgetBundle) {
        res.status(404).send("Widget bundle not found");
        return;
    }
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(widgetBundle);
});

// 2b. MCP JSON-RPC Endpoint (POST /mcp)
// This is the RECOMMENDED approach used by working ChatGPT Apps
app.use('/mcp', express.json());

app.post('/mcp', async (req, res) => {
    console.log('📨 MCP JSON-RPC Request');
    try {
        const response = await handleMcpRequest(req.body);
        res.json(response);
    } catch (error) {
        console.error('MCP error:', error);
        res.status(500).json({
            jsonrpc: '2.0',
            id: null,
            error: {
                code: -32603,
                message: 'Internal error',
            },
        });
    }
});

// OPTIONS for /mcp CORS preflight
app.options('/mcp', (req, res) => {
    res.status(204).end();
});

// 3. SSE Endpoint - Connection (GET)
app.get(SSE_PATH, async (req, res) => {
    console.log(`New SSE connection request`);

    try {
        const mcpServer = createRestaurantMCPServer(widgetHtml);

        // Create transport
        const transport = new SSEServerTransport(MESSAGES_PATH, res);
        console.log(`Created transport with session ID: ${transport.sessionId}`);
        transports.set(transport.sessionId, transport);

        transport.onerror = (error) => {
            console.error(`❌ Transport error for session ${transport.sessionId}:`, error);
        };

        console.log(`🔌 Connecting MCP server to transport...`);
        try {
            await mcpServer.connect(transport);
            console.log(`✅ MCP server connected successfully!`);

            // Keep-alive heartbeat every 15 seconds to prevent connection drops
            const heartbeatInterval = setInterval(() => {
                try {
                    if (!res.writableEnded) {
                        res.write(': heartbeat\n\n');
                        console.log(`💓 Heartbeat sent for session ${transport.sessionId}`);
                    } else {
                        clearInterval(heartbeatInterval);
                    }
                } catch (e) {
                    clearInterval(heartbeatInterval);
                }
            }, 15000);

            // Clear heartbeat on close
            transport.onclose = () => {
                console.log(`⚠️  Session closed: ${transport.sessionId}`);
                clearInterval(heartbeatInterval);
                setTimeout(() => {
                    transports.delete(transport.sessionId);
                    try {
                        mcpServer.close();
                    } catch (err) {
                        console.error(`Error closing MCP server:`, err);
                    }
                }, 2000);
            };
        } catch (error) {
            console.error(`❌ Error connecting MCP server:`, error);
            if (!res.headersSent) {
                res.status(500).end("MCP Connection Error");
            }
        }
    } catch (error) {
        console.error("Error setting up SSE connection:", error);
        if (!res.headersSent) {
            res.status(500).end("Internal Server Error");
        }
    }
});

// 3b. SSE Endpoint - HEAD support (Explicitly for ChatGPT checks)
app.head(SSE_PATH, (req, res) => {
    console.log(`🟢 HEAD request to SSE endpoint`);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.status(200).end();
});


// 4. Messages Endpoint (POST)
app.post(MESSAGES_PATH, async (req, res) => {
    console.log(`📨 POST to messages endpoint`);
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
        res.status(400).send("Missing sessionId query parameter");
        return;
    }

    const transport = transports.get(sessionId);
    if (!transport) {
        res.status(404).send("Session not found");
        return;
    }

    try {
        await transport.handlePostMessage(req, res);
    } catch (error) {
        console.error(`Error handling message for session ${sessionId}:`, error);
        if (!res.headersSent) {
            res.status(500).send("Internal Server Error");
        }
    }
});

// 4b. Legacy SSE Path POST Handling (Backup for some clients)
app.post(SSE_PATH, async (req, res) => {
    console.log(`📨 POST to SSE endpoint (misrouted or aborted session)`);

    // Try to find a recent transport
    const transport = Array.from(transports.values()).pop();
    if (!transport) {
        console.log(`   ⚠️  No active transport (ChatGPT aborted or misrouted)`);
        // Return 200 to avoid 503/424 escalation - this is defensive compatibility
        return res.status(200).end();
    }

    console.log(`   ✅ Using transport: ${transport.sessionId}`);
    try {
        await transport.handlePostMessage(req, res);
        console.log(`   ✅ Message handled successfully`);
    } catch (error) {
        console.error(`Error handling POST to legacy path:`, error);
        res.status(500).send("Internal Server Error");
    }
});

// 5. Menu API
app.use('/api', menuRouter);

// Start Server
const httpServer = createServer(app);

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🍽️  Restaurant Listings MCP Server (Express) running!`);
    console.log(`\n📍 SSE Endpoint: http://localhost:${PORT}${SSE_PATH}`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Run: ngrok http ${PORT}`);
    console.log(`   2. Add to ChatGPT: https://your-ngrok.app${SSE_PATH}`);
});
