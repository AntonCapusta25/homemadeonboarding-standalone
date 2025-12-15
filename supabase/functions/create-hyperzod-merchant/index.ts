import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HYPERZOD_API_KEY = Deno.env.get("HYPERZOD_API_KEY");
const TENANT_ID = "3331";
const BASE_URL = "https://api.hyperzod.app";

// Confirmed working endpoint for merchant creation (Hyperzod)
// Captured from Hyperzod SDK / console: POST /admin/v1/merchant/create
const MERCHANT_CREATE_ENDPOINT = "/admin/v1/merchant/create";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chef } = await req.json();

    if (!chef) {
      return new Response(JSON.stringify({ success: false, error: "Chef data is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!HYPERZOD_API_KEY) {
      console.error("HYPERZOD_API_KEY not configured");
      return new Response(JSON.stringify({ success: false, error: "Hyperzod API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse address to extract postal code if possible
    const addressParts = chef.address?.split(",") || [];
    let postalCode = "";
    for (const part of addressParts) {
      const match = part.trim().match(/\d{4}\s*[A-Z]{2}/i);
      if (match) {
        postalCode = match[0].replace(/\s/g, "");
        break;
      }
    }

    // Map service_type to accepted_order_types
    const mapServiceType = (serviceType: string): string[] => {
      switch (serviceType) {
        case "delivery":
          return ["delivery"];
        case "pickup":
          return ["pickup"];
        case "both":
          return ["delivery", "pickup"];
        default:
          return ["delivery", "pickup"]; // 'unsure' defaults to both
      }
    };

    const acceptedOrderTypes = mapServiceType(chef.service_type || "unsure");
    const defaultOrderType = acceptedOrderTypes[0] || "delivery";

    // Build merchant payload with CORRECT required fields
    const merchantPayload = {
      // REQUIRED FIELDS
      merchant_type: "ecommerce", // REQUIRED: 'ecommerce' or 'pick_drop'
      name: chef.business_name || chef.chef_name || "Unknown Chef", // REQUIRED
      phone: chef.contact_phone || "+31600000000", // REQUIRED: with country code
      country_code: "NL", // REQUIRED: ISO country code
      accepted_order_types: acceptedOrderTypes, // REQUIRED: array
      status: true, // REQUIRED: boolean (not 1/0)

      // OPTIONAL BUT RECOMMENDED
      address: chef.address || "",
      postal_code: postalCode,
      city: chef.city || "",
      state: "Noord-Holland",
      country: "Netherlands",
      email: chef.contact_email || "",

      // OPTIONAL SETTINGS
      language: "nl",
      show_merchant_phone: true,
      category: [], // Array of categories
      default_order_type: defaultOrderType,
      delivery_by: "tenant", // 'tenant' (Admin) or 'merchant'
      delivery_provider: "autozod",
      share_customer_detail: true,

      // Tenant ID
      tenant_id: TENANT_ID,
    };

    console.log("Creating Hyperzod merchant:", merchantPayload.name);

    let success = false;
    let merchantData: any = null;
    let workingEndpoint: string | null = null;
    let lastError = "";

    // Use the confirmed working endpoint only
    const endpoint = MERCHANT_CREATE_ENDPOINT;
    console.log(`Creating merchant via confirmed endpoint: ${endpoint}`);

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HYPERZOD_API_KEY}`,
          "x-api-key": HYPERZOD_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-tenant": TENANT_ID,
        },
        body: JSON.stringify(merchantPayload),
      });

      const responseText = await response.text();
      console.log(`${endpoint} response status: ${response.status}`);
      console.log(`${endpoint} response body: ${responseText.substring(0, 500)}`);

      if (response.status === 401 || response.status === 403) {
        lastError = `${response.status}: ${responseText.substring(0, 200)}`;
        console.log(`Auth/permission failed at ${endpoint}: ${lastError}`);
      } else if (response.ok) {
        try {
          merchantData = JSON.parse(responseText);
          if (merchantData?.success === false || merchantData?.error) {
            lastError = `API returned error: ${JSON.stringify(merchantData)}`;
          } else {
            success = true;
            workingEndpoint = endpoint;
            console.log(`SUCCESS with endpoint: ${endpoint}`);
            console.log(`Merchant data: ${JSON.stringify(merchantData)}`);
          }
        } catch {
          merchantData = { raw: responseText };
          success = true;
          workingEndpoint = endpoint;
        }
      } else {
        lastError = `${response.status}: ${responseText.substring(0, 200)}`;
      }
    } catch (err: any) {
      lastError = err?.message || String(err);
      console.log(`Network error calling ${endpoint}: ${lastError}`);
    }

    if (success) {
      console.log(`Merchant created successfully via ${workingEndpoint}`);
      return new Response(
        JSON.stringify({
          success: true,
          merchant: merchantData,
          endpoint: workingEndpoint,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else {
      console.error("All endpoints failed. Last error:", lastError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to create merchant. ${lastError}`,
        }),
        {
          status: lastError.startsWith("401") ? 401 : lastError.startsWith("403") ? 403 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (error: any) {
    console.error("Error in create-hyperzod-merchant:", error);
    return new Response(JSON.stringify({ success: false, error: error?.message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
