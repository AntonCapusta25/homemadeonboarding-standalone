import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFileSync } from "fs";
import { join } from "path";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { mcpServer } from "../server/mcp-server.js";

// Read the widget HTML
const widgetHtml = readFileSync(
    join(process.cwd(), "public/widgets/restaurant-simple.html"),
    "utf8"
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
        res.setHeader("Access-Control-Allow-Headers", "content-type, mcp-session-id");
        res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
        return res.status(204).end();
    }

    // Health check - only for simple GET without MCP headers
    // Don't intercept ChatGPT's SSE connection attempts
    if (req.method === "GET" &&
        !req.headers["mcp-session-id"] &&
        !req.headers.authorization &&
        req.url === "/api/mcp") {
        return res.status(200).json({
            status: "ok",
            service: "Restaurant Listings MCP Server",
            version: "1.0.0",
            transport: "SSE",
            endpoints: {
                sse: "/api/mcp",
                http: "/api/mcp"
            }
        });
    }

    // Handle MCP requests using SSE transport
    const MCP_METHODS = new Set(["POST", "GET", "DELETE"]);
    if (req.method && MCP_METHODS.has(req.method)) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

        // Use SSE transport for ChatGPT compatibility
        const nodeRes = res as any;
        const transport = new SSEServerTransport("/api/messages", nodeRes);

        try {
            // Connect transport - it will handle the request automatically
            await mcpServer.connect(transport);

            // DON'T call handlePostMessage - transport already handles it!
            // The connection itself processes the request

            return; // Response handled by transport
        } catch (error) {
            console.error("Error handling MCP request:", error);
            if (!res.headersSent) {
                return res.status(500).json({ error: "Internal server error" });
            }
        }
    }

    return res.status(404).json({ error: "Not found" });
}
