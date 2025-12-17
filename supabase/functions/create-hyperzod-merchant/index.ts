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
    console.log("Testing API key with LIST endpoint...");

    // Test 1: List merchants (should work if API key is valid)
    const listResponse = await fetch(`${BASE_URL}/admin/v1/merchant/list`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-tenant": TENANT_ID,
      },
    });

    const listText = await listResponse.text();
    console.log("LIST Status:", listResponse.status);
    console.log("LIST Response:", listText.substring(0, 200));

    if (listResponse.status === 401 || listResponse.status === 403) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "API key authentication failed on LIST endpoint",
          details: "Your API key is invalid or expired. Generate a new one in Hyperzod admin.",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!listResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `LIST endpoint failed: ${listResponse.status}`,
          details: listText,
        }),
        {
          status: listResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("✅ API key works for LIST!");

    // Test 2: Try CREATE with minimal payload
    const { chef } = await req.json();

    if (!chef) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "API key is valid! Can list merchants.",
          list_status: listResponse.status,
          note: "Send chef data to test CREATE",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

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

    console.log("Attempting CREATE...");

    const createResponse = await fetch(`${BASE_URL}/admin/v1/merchant/create`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-tenant": TENANT_ID,
      },
      body: JSON.stringify(merchantPayload),
    });

    const createText = await createResponse.text();
    console.log("CREATE Status:", createResponse.status);
    console.log("CREATE Response:", createText);

    if (createResponse.status === 404) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "404 on CREATE but LIST works",
          list_works: true,
          create_status: 404,
          explanation: "API key can LIST but not CREATE. Either:",
          options: [
            "1. API key lacks CREATE permission - check Hyperzod admin",
            "2. Tenant requires manual merchant approval",
            "3. CREATE endpoint requires different authentication",
          ],
          action: "Email Hyperzod support: siddiquiazam966@gmail.com",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!createResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `CREATE failed: ${createResponse.status}`,
          details: createText,
        }),
        {
          status: createResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let createData;
    try {
      createData = JSON.parse(createText);
    } catch {
      createData = { raw: createText };
    }

    console.log("✅ SUCCESS! Merchant created!");

    return new Response(
      JSON.stringify({
        success: true,
        merchant: createData,
        message: "Merchant created successfully!",
      }),
      {
        status: 200,
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
