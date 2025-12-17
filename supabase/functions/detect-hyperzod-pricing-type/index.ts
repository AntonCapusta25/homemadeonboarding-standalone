import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HYPERZOD_API_KEY = Deno.env.get('HYPERZOD_API_KEY');
const TENANT_ID = '3331';
const BASE_URL = 'https://api.hyperzod.io';

// Different pricing type values to try
const PRICING_TYPES_TO_TRY = [
  // Numeric values
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  // String values
  'simple', 'single', 'fixed', 'standard', 'default', 'regular', 'price',
  'flat', 'base', 'basic', 'one', 'unit', 'item', 'product', 'static',
  'fixed_price', 'single_price', 'flat_rate', 'per_unit', 'each',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { merchant_id } = await req.json();

    if (!merchant_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'merchant_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!HYPERZOD_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'HYPERZOD_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting pricing type detection for merchant:', merchant_id);

    const results: { type: any; status: number; success: boolean; error?: string }[] = [];
    const validTypes: any[] = [];

    // First, get or create a category
    let categoryId: string | null = null;
    try {
      const catResponse = await fetch(`${BASE_URL}/admin/v1/product/categories/list?merchant_id=${merchant_id}`, {
        method: 'GET',
        headers: {
          'x-api-key': HYPERZOD_API_KEY,
          'x-tenant': TENANT_ID,
        },
      });
      
      const catData = await catResponse.json();
      if (catData?.data?.length > 0) {
        categoryId = catData.data[0].id || catData.data[0]._id;
        console.log('Found existing category:', categoryId);
      }
    } catch (e) {
      console.log('Could not fetch categories:', e);
    }

    // Create a category if none exists
    if (!categoryId) {
      try {
        const createCatResponse = await fetch(`${BASE_URL}/admin/v1/product/category/create`, {
          method: 'POST',
          headers: {
            'x-api-key': HYPERZOD_API_KEY,
            'x-tenant': TENANT_ID,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            merchant_id: merchant_id,
            name: 'Test Category',
            status: 1,
          }),
        });
        
        const createCatData = await createCatResponse.json();
        categoryId = createCatData?.data?.id || createCatData?.data?._id;
        console.log('Created test category:', categoryId);
      } catch (e) {
        console.log('Could not create category:', e);
      }
    }

    // Try each pricing type
    for (const pricingType of PRICING_TYPES_TO_TRY) {
      const testProductPayload = {
        merchant_id: merchant_id,
        name: `_TEST_DETECT_TYPE_${pricingType}_${Date.now()}`,
        description: 'Temporary test product for pricing type detection - DELETE ME',
        status: 0, // Inactive so it won't show up
        product_pricing: {
          type: pricingType,
          selling_price: 1,
          cost_price: 0,
          compare_price: 0,
        },
        category_id: categoryId || undefined,
      };

      try {
        console.log(`Testing pricing type: ${pricingType}`);
        
        const response = await fetch(`${BASE_URL}/admin/v1/product/create`, {
          method: 'POST',
          headers: {
            'x-api-key': HYPERZOD_API_KEY,
            'x-tenant': TENANT_ID,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testProductPayload),
        });

        const data = await response.json();
        
        const result = {
          type: pricingType,
          status: response.status,
          success: response.ok && data?.success !== false,
          error: !response.ok || data?.success === false ? JSON.stringify(data) : undefined,
        };
        
        results.push(result);
        
        if (result.success) {
          validTypes.push(pricingType);
          console.log(`✓ Valid pricing type found: ${pricingType}`);
          
          // Try to delete the test product
          const productId = data?.data?.id || data?.data?._id;
          if (productId) {
            try {
              await fetch(`${BASE_URL}/admin/v1/product/delete`, {
                method: 'POST',
                headers: {
                  'x-api-key': HYPERZOD_API_KEY,
                  'x-tenant': TENANT_ID,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: productId, merchant_id }),
              });
              console.log(`Deleted test product: ${productId}`);
            } catch (delErr) {
              console.log('Could not delete test product:', delErr);
            }
          }
        } else {
          console.log(`✗ Invalid pricing type: ${pricingType} - ${result.error?.slice(0, 100)}`);
        }
      } catch (err) {
        results.push({
          type: pricingType,
          status: 0,
          success: false,
          error: err instanceof Error ? err.message : 'Network error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        valid_types: validTypes,
        message: validTypes.length > 0 
          ? `Found ${validTypes.length} valid pricing type(s): ${validTypes.join(', ')}`
          : 'No valid pricing types found. Check API permissions or contact Hyperzod support.',
        total_tested: PRICING_TYPES_TO_TRY.length,
        results: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in detect-hyperzod-pricing-type:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
