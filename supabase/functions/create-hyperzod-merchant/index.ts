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

    console.log("Creating merchant for:", chef.business_name || chef.chef_name);

    // Helper: Extract postal code
    const extractPostalCode = (address: string): string => {
      if (!address) return "";
      const match = address.match(/\d{4}\s*[A-Z]{2}/i);
      return match ? match[0].replace(/\s/g, "") : "";
    };

    // Helper: Map service type
    const mapServiceType = (serviceType: string): string[] => {
      if (serviceType === "delivery") return ["delivery"];
      if (serviceType === "pickup") return ["pickup"];
      return ["delivery", "pickup"]; // both or unsure
    };

    const acceptedOrderTypes = mapServiceType(chef.service_type || "unsure");

    // === TEST MULTIPLE PAYLOAD VARIATIONS ===
    // We'll try from minimal to full to find what works

    const payloadVariations = [
      // Variation 1: ABSOLUTE MINIMAL (only required fields)
      {
        name: "Minimal Test",
        merchant_type: "ecommerce",
        phone: chef.contact_phone || "+31612345678",
        country_code: "NL",
        accepted_order_types: ["delivery"],
        status: true,
        tenant_id: TENANT_ID,
      },

      // Variation 2: WITH EMAIL & ADDRESS
      {
        name: chef.business_name || chef.chef_name || "Test Chef",
        merchant_type: "ecommerce",
        phone: chef.contact_phone || "+31612345678",
        email: chef.contact_email || "",
        address: chef.address || "",
        city: chef.city || "",
        postal_code: extractPostalCode(chef.address || ""),
        country_code: "NL",
        country: "Netherlands",
        accepted_order_types: acceptedOrderTypes,
        status: true,
        tenant_id: TENANT_ID,
      },

      // Variation 3: WITH ALL OPTIONAL FIELDS
      {
        name: chef.business_name || chef.chef_name || "Test Chef",
        merchant_type: "ecommerce",
        phone: chef.contact_phone || "+31612345678",
        email: chef.contact_email || "",
        address: chef.address || "",
        city: chef.city || "",
        state: "Noord-Holland",
        postal_code: extractPostalCode(chef.address || ""),
        country_code: "NL",
        country: "Netherlands",
        accepted_order_types: acceptedOrderTypes,
        default_order_type: acceptedOrderTypes[0] || "delivery",
        status: true,
        language: "nl",
        show_merchant_phone: true,
        delivery_by: "tenant",
        delivery_provider: "autozod",
        share_customer_detail: true,
        category: [],
        tenant_id: TENANT_ID,
      },
    ];

    // Try each variation until one works
    for (let i = 0; i < payloadVariations.length; i++) {
      const payload = payloadVariations[i];
      const variationName = `Variation ${i + 1}/${payloadVariations.length}`;

      console.log(`\n${"=".repeat(60)}`);
      console.log(`Testing ${variationName}`);
      console.log(`Fields: ${Object.keys(payload).join(", ")}`);
      console.log(`${"=".repeat(60)}`);

      try {
        const response = await fetch(`${BASE_URL}${MERCHANT_CREATE_ENDPOINT}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "x-tenant": TENANT_ID,
            apikey: HYPERZOD_API_KEY,
          },
          body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        console.log(`Status: ${response.status}`);
        console.log(`Response: ${responseText.substring(0, 300)}`);

        if (response.ok) {
          // SUCCESS!
          console.log(`✅ SUCCESS with ${variationName}!`);

          let merchantData;
          try {
            merchantData = JSON.parse(responseText);
          } catch {
            merchantData = { raw: responseText };
          }

          return new Response(
            JSON.stringify({
              success: true,
              merchant: merchantData,
              working_variation: i + 1,
              working_payload: payload,
              message: `Merchant created successfully using ${variationName}`,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // If not OK, log and try next variation
        console.log(`❌ ${variationName} failed: ${response.status}`);

        // If this is the last variation, return the error
        if (i === payloadVariations.length - 1) {
          let errorMessage = responseText;
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorData.error || responseText;
          } catch {}

          return new Response(
            JSON.stringify({
              success: false,
              error: `All variations failed. Last error: ${errorMessage}`,
              last_status: response.status,
              last_response: responseText.substring(0, 500),
              variations_tried: payloadVariations.length,
              hint: "Check logs above to see what each variation returned",
            }),
            {
              status: response.status,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      } catch (fetchError: any) {
        console.error(`Network error in ${variationName}:`, fetchError.message);

        // If last variation, return network error
        if (i === payloadVariations.length - 1) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Network error calling Hyperzod API",
              details: fetchError.message,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }
    }

    // Should never reach here
    return new Response(JSON.stringify({ success: false, error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("FATAL ERROR:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal error",
        details: error?.message || String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
