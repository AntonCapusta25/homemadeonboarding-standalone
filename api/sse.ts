import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFileSync } from "fs";
import { join } from "path";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createRestaurantMCPServer } from "../server/mcp-server.js";

// Load widget HTML once at module initialization
const widgetHtml = readFileSync(
    join(process.cwd(), "public/widgets/restaurant-simple.html"),
    "utf-8"
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log("📡 SSE endpoint called:", req.method, req.url);

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
        res.setHeader("Access-Control-Allow-Headers", "content-type, mcp-session-id, authorization");
        res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
        return res.status(204).end();
    }

    // Only handle GET for SSE connections
    if (req.method === "GET") {
        console.log("🔌 New SSE connection request");

        // Set CORS headers for SSE connection
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
        res.setHeader("Access-Control-Allow-Headers", "content-type, mcp-session-id, authorization");
        res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

        try {
            // Create a NEW server instance for this connection (like dev-server does)
            const mcpServer = createRestaurantMCPServer(widgetHtml);

            // Create transport (matches dev-server pattern)
            const transport = new SSEServerTransport("/api/messages", res as any);
            console.log(`✅ Created transport with session ID: ${transport.sessionId}`);

            // Set up handlers (like dev-server)
            transport.onclose = () => {
                console.log(`⚠️  Session closed: ${transport.sessionId}`);
                transport.onclose = undefined;
                try {
                    mcpServer.close();
                } catch (err) {
                    console.error(`Error closing MCP server:`, err);
                }
            };

            transport.onerror = (error) => {
                console.error(`❌ Transport error for session ${transport.sessionId}:`, error);
            };

            // Connect server to transport (like dev-server)
            console.log(`🔌 Connecting MCP server to transport...`);
            await mcpServer.connect(transport);
            console.log(`✅ MCP server connected successfully!`);

            // DON'T call res.end() - transport handles everything
            return;
        } catch (error) {
            console.error("❌ Error setting up SSE connection:", error);
            if (!res.headersSent) {
                return res.status(500).end("Internal Server Error");
            }
        }
    }
    // Handle POST for MCP messages (tool invocations, etc.)
    if (req.method === "POST") {
        console.log("📬 POST request (MCP message)");

        try {
            // Create server instance
            const mcpServer = createRestaurantMCPServer(widgetHtml);

            // Create transport
            const transport = new SSEServerTransport("/api/messages", res as any);

            // DON'T call connect() - that's for GET requests only
            // Just handle the POST message directly
            await transport.handlePostMessage(req as any, res as any);
            console.log("✅ POST message handled");

            return; // Response handled by transport
        } catch (error) {
            console.error("❌ Error handling POST request:", error);
            // Don't try to send response if headers already sent
            if (!res.headersSent) {
                return res.status(500).json({
                    error: "Internal Server Error",
                    message: error instanceof Error ? error.message : "Unknown error"
                });
            }
            return;
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
