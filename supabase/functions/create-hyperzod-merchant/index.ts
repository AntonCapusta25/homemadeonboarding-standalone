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

    console.log("Creating merchant for:", chef.business_name || chef.chef_name);

    // Extract postal code
    const postalCode = chef.address?.match(/\d{4}\s*[A-Z]{2}/i)?.[0]?.replace(/\s/g, "") || "";

    // CRITICAL: Try EVERY possible combination until one works
    // Starting from most likely to least likely

    const variations = [
      // Variation 1: EXACT copy of what browser sends (from form HTML)
      {
        name: "Browser-style (string status, lowercase types)",
        payload: {
          merchant_type: "ecommerce",
          name: chef.business_name || chef.chef_name || "Test Chef",
          phone: chef.contact_phone || "+31612345678",
          country_code: "NL",
          accepted_order_types: "delivery,pickup", // Maybe it wants comma-separated string?
          status: "true", // Maybe it wants string?
          tenant_id: TENANT_ID,
          apikey: HYPERZOD_API_KEY,
        },
      },

      // Variation 2: Numeric status
      {
        name: "Numeric status",
        payload: {
          merchant_type: "ecommerce",
          name: chef.business_name || chef.chef_name || "Test Chef",
          phone: chef.contact_phone || "+31612345678",
          country_code: "NL",
          accepted_order_types: ["delivery", "pickup"],
          status: 1, // Numeric
          tenant_id: TENANT_ID,
          apikey: HYPERZOD_API_KEY,
        },
      },

      // Variation 3: With user object (maybe required)
      {
        name: "With user object",
        payload: {
          merchant_type: "ecommerce",
          name: chef.business_name || chef.chef_name || "Test Chef",
          phone: chef.contact_phone || "+31612345678",
          country_code: "NL",
          accepted_order_types: ["delivery", "pickup"],
          status: true,
          user: {
            name: chef.chef_name || "Test User",
            email: chef.contact_email || "test@example.com",
            phone: chef.contact_phone || "+31612345678",
          },
          tenant_id: TENANT_ID,
          apikey: HYPERZOD_API_KEY,
        },
      },

      // Variation 4: Different field names (merchant_name instead of name)
      {
        name: "Alternative field names",
        payload: {
          merchant_type: "ecommerce",
          merchant_name: chef.business_name || chef.chef_name || "Test Chef",
          merchant_phone: chef.contact_phone || "+31612345678",
          merchant_country_code: "NL",
          accepted_order_types: ["delivery", "pickup"],
          merchant_status: true,
          tenant_id: TENANT_ID,
          apikey: HYPERZOD_API_KEY,
        },
      },

      // Variation 5: With ALL optional fields (maybe something is required that we think is optional)
      {
        name: "Kitchen sink - everything",
        payload: {
          merchant_type: "ecommerce",
          name: chef.business_name || chef.chef_name || "Test Chef",
          phone: chef.contact_phone || "+31612345678",
          email: chef.contact_email || "",
          address: chef.address || "",
          city: chef.city || "",
          state: "Noord-Holland",
          postal_code: postalCode,
          country: "Netherlands",
          country_code: "NL",
          accepted_order_types: ["delivery", "pickup"],
          default_order_type: "delivery",
          status: true,
          language: "nl",
          show_merchant_phone: true,
          delivery_by: "tenant",
          delivery_provider: "autozod",
          share_customer_detail: true,
          category: [],
          featured: false,
          sponsored: false,
          merchant_commission: 15,
          tax_method: "inclusive",
          tenant_id: TENANT_ID,
          apikey: HYPERZOD_API_KEY,
        },
      },

      // Variation 6: Pick & Drop type (maybe ecommerce is broken)
      {
        name: "Pick & Drop type",
        payload: {
          merchant_type: "pick_drop", // Different type
          name: chef.business_name || chef.chef_name || "Test Chef",
          phone: chef.contact_phone || "+31612345678",
          country_code: "NL",
          accepted_order_types: ["delivery", "pickup"],
          status: true,
          tenant_id: TENANT_ID,
          apikey: HYPERZOD_API_KEY,
        },
      },

      // Variation 7: API key in header instead of body
      {
        name: "API key in header",
        payload: {
          merchant_type: "ecommerce",
          name: chef.business_name || chef.chef_name || "Test Chef",
          phone: chef.contact_phone || "+31612345678",
          country_code: "NL",
          accepted_order_types: ["delivery", "pickup"],
          status: true,
          tenant_id: TENANT_ID,
          // NO apikey in body
        },
        useHeaderAuth: true, // Flag to use header
      },
    ];

    // Try each variation
    for (let i = 0; i < variations.length; i++) {
      const { name: varName, payload, useHeaderAuth } = variations[i];

      console.log(`\n[${i + 1}/${variations.length}] Testing: ${varName}`);
      console.log("Fields:", Object.keys(payload).join(", "));

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-tenant": TENANT_ID,
      };

      // If using header auth
      if (useHeaderAuth) {
        headers["apikey"] = HYPERZOD_API_KEY;
      }

      try {
        const response = await fetch(`${BASE_URL}/admin/v1/merchant/create`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        console.log(`Status: ${response.status}`);

        if (response.ok || response.status === 201) {
          // SUCCESS!!!
          console.log("✅✅✅ SUCCESS WITH:", varName);
          console.log("Response:", responseText);

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
              working_variation: varName,
              variation_number: i + 1,
              message: `Merchant created successfully using variation: ${varName}`,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Not 200, log and continue
        if (response.status !== 500) {
          // If not generic 500, this is useful info!
          console.log(`⚠️ Got ${response.status} (not 500):`, responseText.substring(0, 200));
        } else {
          console.log("❌ Still 500");
        }
      } catch (err: any) {
        console.log("Network error:", err.message);
      }
    }

    // All failed
    console.error("\n❌ ALL VARIATIONS FAILED");
    console.error("This means:");
    console.error("1. API key doesn't have create permission, OR");
    console.error("2. Account needs approval from Hyperzod, OR");
    console.error("3. The endpoint is actually broken on their side");
    console.error("\nEmail: siddiquiazam966@gmail.com");
    console.error("Subject: Cannot create merchants via API - always 500 error");

    return new Response(
      JSON.stringify({
        success: false,
        error: "All variations failed with 500 errors",
        variations_tried: variations.length,
        message: "API key may not have create permission. Contact Hyperzod support: siddiquiazam966@gmail.com",
      }),
      {
        status: 500,
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
