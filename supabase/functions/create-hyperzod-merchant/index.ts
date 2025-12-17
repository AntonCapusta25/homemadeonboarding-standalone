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
      return new Response(JSON.stringify({ success: false, error: "Missing chef or API key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("=".repeat(80));
    console.log("CREATING MERCHANT");
    console.log("=".repeat(80));
    console.log("Chef:", chef.business_name || chef.chef_name);

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
      commission: {
        delivery: {
          order_type: "delivery",
          type: "percentage",
          percent_value: 15,
          calculate_on_status: 1,
        },
        pickup: {
          order_type: "pickup",
          type: "percentage",
          percent_value: 15,
          calculate_on_status: 1,
        },
        custom_1: {
          order_type: "custom_1",
          type: "percentage",
          percent_value: 15,
          calculate_on_status: 1,
        },
      },
      tax_method: "inclusive",
      merchant_category_ids: [],
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

    console.log("\nSending request to:", `${BASE_URL}/admin/v1/merchant/create`);
    console.log("Tenant ID:", TENANT_ID);
    console.log("API Key length:", HYPERZOD_API_KEY?.length);

    const response = await fetch(`${BASE_URL}/admin/v1/merchant/create`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-tenant": TENANT_ID,
      },
      body: JSON.stringify(merchantPayload),
    });

    const responseText = await response.text();

    console.log("\n" + "=".repeat(80));
    console.log("HYPERZOD RESPONSE");
    console.log("=".repeat(80));
    console.log("Status Code:", response.status);
    console.log("Status Text:", response.statusText);
    console.log("\nResponse Headers:");
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log("\nResponse Body:");
    console.log(responseText);
    console.log("=".repeat(80));

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    // Check what Hyperzod returned
    if (response.status === 404) {
      console.error("\n❌ 404 ERROR - Merchant Not Found");
      console.error("This means:");
      console.error("1. The CREATE request succeeded (no validation error)");
      console.error("2. But Hyperzod immediately returned 404");
      console.error("3. Possible causes:");
      console.error("   - API key doesn't have CREATE permission");
      console.error("   - Tenant doesn't exist or isn't active");
      console.error("   - Wrong endpoint (maybe /merchants not /merchant?)");
      console.error("\nMessage from Hyperzod:", responseData.message);
      console.error("Model:", responseData.data?.model);

      return new Response(
        JSON.stringify({
          success: false,
          error: "404: Merchant not found after creation attempt",
          hyperzod_message: responseData.message,
          hyperzod_status: response.status,
          possible_causes: [
            "API key lacks CREATE permission (only has READ)",
            "Tenant ID 3331 is invalid or inactive",
            "Wrong API endpoint",
          ],
          action_required: "Contact Hyperzod support: siddiquiazam966@gmail.com",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (response.ok) {
      console.log("✅ Status 200/201 - Success!");
      console.log("Merchant data:", JSON.stringify(responseData, null, 2));

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
    }

    console.error("❌ Unexpected status:", response.status);

    return new Response(
      JSON.stringify({
        success: false,
        error: `HTTP ${response.status}`,
        details: responseData,
      }),
      {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
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
      },
    );
  }
});
