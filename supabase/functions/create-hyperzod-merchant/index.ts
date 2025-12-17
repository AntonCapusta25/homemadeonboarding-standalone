import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HYPERZOD_API_KEY = Deno.env.get("HYPERZOD_API_KEY");
const TENANT_ID = "3331";
const BASE_URL = "https://api.hyperzod.app";

/**
 * HYPERZOD MERCHANT CREATION - OFFICIAL API
 * Endpoint: POST /admin/v1/merchant/create
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chef } = await req.json();

    if (!chef || !HYPERZOD_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing chef or API key" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating merchant for:", chef.business_name || chef.chef_name);

    // Extract postal code from address
    const extractPostalCode = (address: string): string => {
      if (!address) return "";
      const match = address.match(/\d{4}\s*[A-Z]{2}/i);
      return match ? match[0].replace(/\s/g, "") : "";
    };

    // Map service type to accepted_order_types
    const mapServiceType = (serviceType: string): string[] => {
      if (serviceType === "delivery") return ["delivery"];
      if (serviceType === "pickup") return ["pickup"];
      return ["delivery", "pickup"]; // both or unsure
    };

    const acceptedOrderTypes = mapServiceType(chef.service_type || "unsure");
    const postalCode = extractPostalCode(chef.address || "");

    // OFFICIAL PAYLOAD STRUCTURE (from API docs)
    const merchantPayload = {
      // Basic info
      name: chef.business_name || chef.chef_name || "Unknown Chef",
      address: chef.address || "",
      post_code: postalCode,
      country_code: "NL",
      country: "Netherlands",
      state: "Noord-Holland",
      city: chef.city || "",
      phone: chef.contact_phone || "+31600000000",
      email: chef.contact_email || "",
      
      // Merchant settings
      type: "ecommerce",
      accepted_order_types: acceptedOrderTypes,
      status: 1,
      delivery_by: "tenant",
      
      // Commission structure (REQUIRED object format)
      commission: {
        type: "percentage",
        value: "15",
        calculate_on_status: 1,
      },
      
      // Tax settings
      tax_method: "inclusive",
      
      // Categories and translations (empty arrays)
      merchant_category_ids: [],
      language_translation: [],
      
      // Tenant ID and API key
      tenant_id: TENANT_ID,
      apikey: HYPERZOD_API_KEY,
    };

    console.log("Sending payload with keys:", Object.keys(merchantPayload).join(", "));

    const response = await fetch(`${BASE_URL}/admin/v1/merchant/create`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "x-tenant": TENANT_ID,
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
        }
      );
    }

    // Success
    let merchantData;
    try {
      merchantData = JSON.parse(responseText);
    } catch {
      merchantData = { raw: responseText };
    }

    console.log("✅ SUCCESS! Merchant created");
    console.log("Merchant ID:", merchantData?.data?._id || merchantData?._id || "unknown");

    return new Response(
      JSON.stringify({
        success: true,
        merchant: merchantData,
        message: "Merchant created successfully in Hyperzod",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Fatal error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
