import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HYPERZOD_API_KEY = Deno.env.get("HYPERZOD_API_KEY");
const TENANT_ID = "3331";
const BASE_URL = "https://api.hyperzod.app";
const MERCHANT_CREATE_URL = `${BASE_URL}/admin/v1/merchant/create`;

interface Chef {
  business_name?: string;
  chef_name?: string;
  address?: string;
  city?: string;
  state?: string;
  contact_phone?: string;
  contact_email?: string;
  service_type?: string;
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!HYPERZOD_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing HYPERZOD_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { chef } = await req.json() as { chef?: Chef };

    if (!chef) {
      return new Response(
        JSON.stringify({ success: false, error: "chef data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const acceptedOrderTypes = mapServiceType(chef.service_type || "unsure");
    const postalCode = extractPostalCode(chef.address || "");
    const merchantName = chef.business_name || chef.chef_name || "Unknown Chef";

    const merchantPayload = {
      name: merchantName,
      address: chef.address || "",
      post_code: postalCode,
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
        { locale: "en", key: "name", value: merchantName },
      ],
    };

    console.log("[create-hyperzod-merchant] Creating merchant:", merchantName);

    const createResponse = await fetch(MERCHANT_CREATE_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-TENANT": TENANT_ID,
        "X-API-KEY": HYPERZOD_API_KEY,
      },
      body: JSON.stringify(merchantPayload),
    });

    const responseText = await createResponse.text();
    console.log("[create-hyperzod-merchant] Response status:", createResponse.status);
    console.log("[create-hyperzod-merchant] Response body:", responseText.substring(0, 500));

    if (!createResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Merchant creation failed: ${createResponse.status}`,
          details: responseText,
        }),
        { status: createResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const createData = JSON.parse(responseText);
    const merchantId = createData?.data?.merchant_id || createData?.data?._id || null;

    console.log("[create-hyperzod-merchant] Merchant created:", merchantId);

    return new Response(
      JSON.stringify({
        success: true,
        merchant_id: merchantId,
        merchant: createData,
        message: "Merchant created successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[create-hyperzod-merchant] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
