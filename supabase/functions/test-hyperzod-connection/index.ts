import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HYPERZOD_API_KEY = Deno.env.get('HYPERZOD_API_KEY');
const TENANT_ID = '3331';
const BASE_URL = 'https://api.hyperzod.app';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Testing Hyperzod connection...');

    if (!HYPERZOD_API_KEY) {
      console.error('HYPERZOD_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Hyperzod API key not configured in secrets',
          details: { field: 'api_key', message: 'Missing HYPERZOD_API_KEY secret' }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to list merchants to verify connection
    const response = await fetch(`${BASE_URL}/admin/v1/merchant/list?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${HYPERZOD_API_KEY}`,
        'x-api-key': HYPERZOD_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-tenant': TENANT_ID,
      },
    });

    const responseText = await response.text();
    console.log(`Hyperzod response status: ${response.status}`);
    console.log(`Hyperzod response: ${responseText.substring(0, 500)}`);

    if (response.status === 401) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid API key - authentication failed',
          details: { field: 'api_key', message: 'The API key is invalid or expired. Please check your Hyperzod dashboard.' }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 403) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Permission denied - API key lacks required permissions',
          details: { field: 'permissions', message: 'The API key does not have permission to access merchant data. Check API key scope in Hyperzod.' }
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.ok) {
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { raw: responseText };
      }

      const merchantCount = data?.data?.length || data?.merchants?.length || 0;
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Connection successful!',
          details: {
            tenant_id: TENANT_ID,
            api_key_valid: true,
            merchants_accessible: true,
            merchant_count_sample: merchantCount
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `API error: ${response.status}`,
          details: { 
            status_code: response.status,
            message: errorData?.message || errorData?.error || responseText.substring(0, 200)
          }
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Error testing Hyperzod connection:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Network error',
        details: { field: 'network', message: 'Could not reach Hyperzod API. Check network connectivity.' }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
