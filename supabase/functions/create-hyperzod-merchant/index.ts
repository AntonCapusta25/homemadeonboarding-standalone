import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HYPERZOD_API_KEY = Deno.env.get("HYPERZOD_API_KEY");
const TENANT_ID = "3331";
const BASE_URL = "https://api.hyperzod.app";

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

    const extractPostalCode = (address: string): string => {
      if (!address) return "";
      const match = address.match(/\d{4}\s*[A-Z]{2}/i);
      return match ? match[0].replace(/\s/g, "") : "";
    };

    const mapServiceType = (serviceType: string): string[] => {
      if (serviceType === "delivery") return ["delivery"];
      if (serviceType === "pickup") return ["pickup"];
      return ["delivery", "pickup"];
    };

    const acceptedOrderTypes = mapServiceType(chef.service_type || "unsure");
    const postalCode = extractPostalCode(chef.address || "");

    // PAYLOAD with CORRECT commission structure
    const merchantPayload = {
      name: chef.business_name || chef.chef_name || "Unknown Chef",
      address: chef.address || "",
      post_code: postalCode || "",
      country_code: "NL",
      country: "Netherlands",
      state: chef.state || "",
      city: chef.city || "",
      phone: chef.contact_phone || "+31600000000",
      email: chef.contact_email || "",
      
      type: "ecommerce",
      accepted_order_types: acceptedOrderTypes,
      status: 1,
      delivery_by: "tenant",
      
      // CRITICAL: Commission must be structured per order type
      commission: {
        delivery: {
          type: "percentage",
          value: 15,
          calculate_on_status: 1,
        },
        pickup: {
          type: "percentage",
          value: 15,
          calculate_on_status: 1,
        },
        custom_1: {
          type: "percentage",
          value: 15,
          calculate_on_status: 1,
        },
      },
      
      tax_method: "inclusive",
      merchant_category_ids: [],
      
      // Language translation: REQUIRED with at least one entry
      language_translation: [
        {
          locale: "en",
          key: "name",
          value: chef.business_name || chef.chef_name || "Unknown Chef",
        },
      ],
      
      tenant_id: TENANT_ID,
      apikey: HYPERZOD_API_KEY,
    };

    console.log("=".repeat(60));
    console.log("PAYLOAD BEING SENT:");
    console.log(JSON.stringify(merchantPayload, null, 2));
    console.log("=".repeat(60));

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
    console.log("Status:", response.status);
    console.log("Response:", responseText);

    if (response.status === 422) {
      let validationErrors = {};
      try {
        const errorData = JSON.parse(responseText);
        validationErrors = errorData.data || errorData.errors || errorData;
        console.error("Validation errors:", JSON.stringify(validationErrors, null, 2));
      } catch {}

      return new Response(
        JSON.stringify({
          success: false,
          error: "Validation failed",
          validation_errors: validationErrors,
          payload_structure: {
            commission_keys: Object.keys(merchantPayload.commission),
            language_translation_count: merchantPayload.language_translation.length,
          },
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!response.ok) {
      let errorMessage = responseText;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
      } catch {}

      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed (${response.status})`,
          details: errorMessage,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
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
    console.log("Merchant ID:", merchantData?.data?._id || merchantData?._id || "unknown");

    return new Response(
      JSON.stringify({
        success: true,
        merchant: merchantData,
        message: "Merchant created successfully in Hyperzod!",
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
        stack: error?.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
