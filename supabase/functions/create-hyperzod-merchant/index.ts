import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HYPERZOD_API_KEY = Deno.env.get("HYPERZOD_API_KEY");
const TENANT_ID = "3331";
const BASE_URL = "https://api.hyperzod.app";
const MERCHANT_CREATE_ENDPOINT = "/admin/v1/merchant/create";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chef } = await req.json();

    if (!chef || !HYPERZOD_API_KEY) {
      console.error(!chef ? "No chef data" : "No API key");
      return new Response(
        JSON.stringify({
          success: false,
          error: !chef ? "Chef data required" : "API key not configured",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("=".repeat(60));
    console.log("Creating merchant:", chef.business_name || chef.chef_name);
    console.log("=".repeat(60));

    // Extract postal code from address
    const extractPostalCode = (address: string): string => {
      if (!address) return "";
      const match = address.match(/\d{4}\s*[A-Z]{2}/i);
      return match ? match[0].replace(/\s/g, "") : "";
    };

    // Map service type to order types
    const mapServiceType = (serviceType: string): string[] => {
      if (serviceType === "delivery") return ["delivery"];
      if (serviceType === "pickup") return ["pickup"];
      return ["delivery", "pickup"]; // both or unsure
    };

    const acceptedOrderTypes = mapServiceType(chef.service_type || "unsure");

    // Build merchant payload
    // CRITICAL: apikey goes in the BODY, not headers!
    const merchantPayload = {
      // === REQUIRED FIELDS ===
      merchant_type: "ecommerce",
      name: chef.business_name || chef.chef_name || "Unknown Chef",
      phone: chef.contact_phone || "+31600000000",
      country_code: "NL",
      accepted_order_types: acceptedOrderTypes,
      status: true,

      // === OPTIONAL FIELDS ===
      email: chef.contact_email || "",
      address: chef.address || "",
      city: chef.city || "",
      state: "Noord-Holland",
      postal_code: extractPostalCode(chef.address || ""),
      country: "Netherlands",
      language: "nl",
      show_merchant_phone: true,
      default_order_type: acceptedOrderTypes[0] || "delivery",
      delivery_by: "tenant",
      delivery_provider: "autozod",
      share_customer_detail: true,
      category: [],

      // === AUTHENTICATION (in body!) ===
      tenant_id: TENANT_ID,
      apikey: HYPERZOD_API_KEY, // ← KEY GOES HERE, NOT IN HEADERS!
    };

    console.log("Payload keys:", Object.keys(merchantPayload).join(", "));
    console.log("Calling:", `${BASE_URL}${MERCHANT_CREATE_ENDPOINT}`);

    const response = await fetch(`${BASE_URL}${MERCHANT_CREATE_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-tenant": TENANT_ID,
        // NO Authorization header!
        // NO apikey header!
        // API key is in the body instead
      },
      body: JSON.stringify(merchantPayload),
    });

    const responseText = await response.text();
    console.log("Response status:", response.status);
    console.log("Response body:", responseText.substring(0, 500));

    if (!response.ok) {
      let errorMessage = responseText;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
      } catch {}

      console.error("API Error:", errorMessage);

      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to create merchant (${response.status})`,
          details: errorMessage,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Success!
    let merchantData;
    try {
      merchantData = JSON.parse(responseText);
    } catch {
      merchantData = { raw: responseText };
    }

    console.log("✅ SUCCESS! Merchant created");
    console.log("Merchant ID:", merchantData?._id || merchantData?.id || "unknown");

    return new Response(
      JSON.stringify({
        success: true,
        merchant: merchantData,
        message: "Merchant created successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("FATAL ERROR:", error);
    console.error("Stack:", error?.stack);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: error?.message || String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
