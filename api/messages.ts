import type { VercelRequest, VercelResponse } from "@vercel/node";

// This endpoint is required by SSE transport but not actually used in Vercel
// because each request is stateless. The transport is created per-request.
export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log("📨 POST to /api/messages endpoint");

    // In Vercel, we can't maintain session state across requests
    // So we return a helpful error
    return res.status(501).json({
        error: "Not Implemented",
        message: "The /api/messages endpoint is not supported in Vercel serverless environment. Use POST to /api/sse instead."
    });
}
