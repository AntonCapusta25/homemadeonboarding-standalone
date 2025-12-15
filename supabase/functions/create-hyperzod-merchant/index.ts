import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HYPERZOD_API_KEY = Deno.env.get('HYPERZOD_API_KEY');
const TENANT_ID = '3331';
const BASE_URL = 'https://api.hyperzod.app';

// Endpoints to try for merchant creation
const ENDPOINTS_TO_TRY = [
  '/merchant/v1/merchant',
  '/merchant/v1/merchants',
  '/merchant/v1/create',
  '/admin/v1/merchant',
  '/admin/v1/merchant/create',
  '/admin/v1/merchants',
  '/v1/merchant',
  '/v1/merchants',
  '/merchant',
  '/merchants'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chef } = await req.json();

    if (!chef) {
      return new Response(
        JSON.stringify({ success: false, error: 'Chef data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!HYPERZOD_API_KEY) {
      console.error('HYPERZOD_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Hyperzod API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse address to extract postal code if possible
    const addressParts = chef.address?.split(',') || [];
    let postalCode = '';
    for (const part of addressParts) {
      const match = part.trim().match(/\d{4}\s*[A-Z]{2}/i);
      if (match) {
        postalCode = match[0].replace(/\s/g, '');
        break;
      }
    }

    // Build merchant payload
    const merchantPayload = {
      name: chef.business_name || chef.chef_name || 'Unknown Chef',
      phone: chef.contact_phone || '',
      email: chef.contact_email || '',
      address: chef.address || '',
      city: chef.city || '',
      country: 'Netherlands',
      country_code: 'NL',
      postal_code: postalCode,
      merchant_commission: chef.plan === 'starter' ? 10 : chef.plan === 'growth' ? 12 : 14,
      tax_method: 'inclusive',
      status: 1,
      featured: false,
      sponsored: false,
      category: 'Food',
      tenant_id: TENANT_ID,
    };

    console.log('Creating Hyperzod merchant:', merchantPayload.name);

    let success = false;
    let merchantData = null;
    let workingEndpoint = null;
    let lastError = '';

    // Try each endpoint until one works
    for (const endpoint of ENDPOINTS_TO_TRY) {
      console.log(`Trying endpoint: ${endpoint}`);
      
      try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HYPERZOD_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-tenant': TENANT_ID,
          },
          body: JSON.stringify(merchantPayload),
        });

        const responseText = await response.text();
        console.log(`${endpoint} response status: ${response.status}`);
        console.log(`${endpoint} response body: ${responseText.substring(0, 500)}`);
        
        if (response.ok) {
          try {
            merchantData = JSON.parse(responseText);
            // Check if the response indicates actual success
            if (merchantData.success === false || merchantData.error) {
              lastError = `API returned error: ${JSON.stringify(merchantData)}`;
              console.log(`${endpoint} returned 200 but with error in body`);
              continue;
            }
            success = true;
            workingEndpoint = endpoint;
            console.log(`SUCCESS with endpoint: ${endpoint}`);
            console.log(`Merchant data: ${JSON.stringify(merchantData)}`);
            break;
          } catch {
            merchantData = { raw: responseText };
            success = true;
            workingEndpoint = endpoint;
            break;
          }
        } else {
          lastError = `${response.status}: ${responseText.substring(0, 200)}`;
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
        console.log(`Error with ${endpoint}: ${lastError}`);
      }
    }

    if (success) {
      console.log(`Merchant created successfully via ${workingEndpoint}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          merchant: merchantData,
          endpoint: workingEndpoint 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('All endpoints failed. Last error:', lastError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create merchant. ${lastError}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Error in create-hyperzod-merchant:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
