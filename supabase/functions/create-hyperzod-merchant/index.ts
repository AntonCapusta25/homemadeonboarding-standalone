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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { chef } = await req.json();

    // Validate input
    if (!chef) {
      console.error("No chef data provided");
      return new Response(JSON.stringify({ success: false, error: "Chef data is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate API key
    if (!HYPERZOD_API_KEY) {
      console.error("HYPERZOD_API_KEY environment variable not set");
      return new Response(JSON.stringify({ success: false, error: "Hyperzod API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("=".repeat(60));
    console.log("Creating Hyperzod merchant for:", chef.business_name || chef.chef_name);
    console.log("=".repeat(60));

    // Extract postal code from address
    const extractPostalCode = (address: string): string => {
      if (!address) return "";
      const addressParts = address.split(",");
      for (const part of addressParts) {
        const match = part.trim().match(/\d{4}\s*[A-Z]{2}/i);
        if (match) {
          return match[0].replace(/\s/g, "");
        }
      }
      return "";
    };

    // Map service_type to accepted_order_types
    const mapServiceType = (serviceType: string): string[] => {
      const typeMap: Record<string, string[]> = {
        delivery: ["delivery"],
        pickup: ["pickup"],
        both: ["delivery", "pickup"],
        unsure: ["delivery", "pickup"], // Default to both
      };
      return typeMap[serviceType] || ["delivery", "pickup"];
    };

    const postalCode = extractPostalCode(chef.address || "");
    const acceptedOrderTypes = mapServiceType(chef.service_type || "unsure");
    const defaultOrderType = acceptedOrderTypes[0] || "delivery";

    // Build merchant payload with ALL required fields
    const merchantPayload = {
      // === REQUIRED FIELDS (from form analysis) ===
      merchant_type: "ecommerce", // REQUIRED: must be 'ecommerce' or 'pick_drop'
      name: chef.business_name || chef.chef_name || "Unknown Chef", // REQUIRED
      phone: chef.contact_phone || "+31600000000", // REQUIRED: must include country code
      country_code: "NL", // REQUIRED: ISO country code
      accepted_order_types: acceptedOrderTypes, // REQUIRED: must be array
      status: true, // REQUIRED: must be boolean (not 1 or "true")

      // === OPTIONAL BUT RECOMMENDED ===
      address: chef.address || "",
      postal_code: postalCode,
      city: chef.city || "",
      state: "Noord-Holland",
      country: "Netherlands",
      email: chef.contact_email || "",

      // === OPTIONAL SETTINGS ===
      language: "nl", // 'en' or 'nl'
      show_merchant_phone: true, // Show merchant contact to customer
      category: [], // Array of category strings
      default_order_type: defaultOrderType, // 'delivery', 'pickup', or 'custom_1'
      delivery_by: "tenant", // 'tenant' (Admin) or 'merchant'
      delivery_provider: "autozod", // Delivery provider name
      share_customer_detail: true, // Share customer details with merchant

      // === TENANT ID (REQUIRED) ===
      tenant_id: TENANT_ID,
    };

    console.log("Payload structure:");
    console.log(
      JSON.stringify(
        {
          merchant_type: merchantPayload.merchant_type,
          name: merchantPayload.name,
          phone: merchantPayload.phone,
          country_code: merchantPayload.country_code,
          accepted_order_types: merchantPayload.accepted_order_types,
          status: merchantPayload.status,
          tenant_id: merchantPayload.tenant_id,
        },
        null,
        2,
      ),
    );

    // Make API request to Hyperzod
    console.log(`Calling: ${BASE_URL}${MERCHANT_CREATE_ENDPOINT}`);

    const response = await fetch(`${BASE_URL}${MERCHANT_CREATE_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-tenant": TENANT_ID,
        apikey: HYPERZOD_API_KEY, // Try apikey (from SDK code)
      },
      body: JSON.stringify(merchantPayload),
    });

    // Get response text first (safer than .json())
    const responseText = await response.text();
    console.log(`Response status: ${response.status}`);
    console.log(`Response body: ${responseText.substring(0, 500)}`);

    // Handle response based on status code
    if (!response.ok) {
      // Parse error details if possible
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorData = JSON.parse(responseText);
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else {
          errorMessage = JSON.stringify(errorData);
        }
      } catch {
        errorMessage = responseText.substring(0, 200);
      }

      console.error("Hyperzod API error:", errorMessage);

      // Provide specific error messages
      if (response.status === 401) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Authentication failed. Check HYPERZOD_API_KEY.",
            details: errorMessage,
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (response.status === 403) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Permission denied. API key may not have merchant creation access.",
            details: errorMessage,
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (response.status === 422) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Validation error. Check required fields.",
            details: errorMessage,
            payload: merchantPayload,
          }),
          {
            status: 422,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (response.status === 500) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Hyperzod server error. Try different field values or contact support.",
            details: errorMessage,
            hint: "Try setting merchant_type to 'pick_drop' or removing optional fields",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Generic error
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

    // Success! Parse response
    let merchantData;
    try {
      merchantData = JSON.parse(responseText);
    } catch {
      // If can't parse, just return raw text
      merchantData = { raw: responseText };
    }

    console.log("✅ SUCCESS! Merchant created");
    console.log("Merchant data:", JSON.stringify(merchantData).substring(0, 200));

    return new Response(
      JSON.stringify({
        success: true,
        merchant: merchantData,
        message: "Merchant created successfully in Hyperzod",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("=".repeat(60));
    console.error("FATAL ERROR in create-hyperzod-merchant:");
    console.error(error);
    console.error("Stack:", error?.stack);
    console.error("=".repeat(60));

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
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
