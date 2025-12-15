import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HYPERZOD_API_KEY = Deno.env.get("HYPERZOD_API_KEY");
const TENANT_ID = "3331";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chef } = await req.json();

    if (!HYPERZOD_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "No API key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("\n" + "=".repeat(80));
    console.log("TESTING HYPERZOD API - ULTRA MINIMAL");
    console.log("=".repeat(80));

    // ABSOLUTE MINIMAL PAYLOAD
    const minimalPayload = {
      merchant_type: "ecommerce",
      name: "MINIMAL TEST " + Date.now(),
      phone: "+31612345678",
      country_code: "NL",
      accepted_order_types: ["delivery"],
      status: true,
      tenant_id: TENANT_ID,
      apikey: HYPERZOD_API_KEY,
    };

    console.log("\nPayload being sent:");
    console.log(JSON.stringify(minimalPayload, null, 2));

    console.log("\nHeaders being sent:");
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-tenant": TENANT_ID,
    };
    console.log(JSON.stringify(headers, null, 2));

    console.log("\nMaking request to: https://api.hyperzod.app/admin/v1/merchant/create");

    const response = await fetch("https://api.hyperzod.app/admin/v1/merchant/create", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(minimalPayload),
    });

    const responseText = await response.text();

    console.log("\n" + "=".repeat(80));
    console.log("RESPONSE RECEIVED");
    console.log("=".repeat(80));
    console.log("Status:", response.status);
    console.log("Status Text:", response.statusText);
    console.log("\nResponse Headers:");
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log("\nResponse Body:");
    console.log(responseText);
    console.log("=".repeat(80) + "\n");

    // If 500 error, let's check if it's actually reaching Hyperzod
    if (response.status === 500) {
      console.error("\n⚠️ 500 ERROR ANALYSIS:");
      console.error("This could mean:");
      console.error("1. API key is invalid/expired");
      console.error("2. Tenant ID is wrong");
      console.error("3. Required field is missing/wrong format");
      console.error("4. Hyperzod server is actually down");
      console.error("\nAPI Key starts with:", HYPERZOD_API_KEY?.substring(0, 10) + "...");
      console.error("API Key length:", HYPERZOD_API_KEY?.length);
      console.error("Tenant ID:", TENANT_ID);
    }

    // Try to parse response
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (response.ok) {
      console.log("✅ SUCCESS!");
      return new Response(
        JSON.stringify({
          success: true,
          merchant: responseData,
          message: "Merchant created successfully!",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } else {
      console.error("❌ FAILED");
      return new Response(
        JSON.stringify({
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          response_body: responseText,
          payload_sent: minimalPayload,
          headers_sent: headers,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (error: any) {
    console.error("\n" + "=".repeat(80));
    console.error("FATAL ERROR:");
    console.error("=".repeat(80));
    console.error(error);
    console.error("Stack:", error?.stack);
    console.error("=".repeat(80) + "\n");

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal error",
        details: error?.message || String(error),
        stack: error?.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
