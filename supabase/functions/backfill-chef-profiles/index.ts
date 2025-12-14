import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify the caller is an admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role to access auth.users and insert profiles
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting backfill of chef_profiles...');

    // Get all auth users
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 10000,
    });

    if (usersError) {
      console.error('Error fetching auth users:', usersError);
      throw usersError;
    }

    const allAuthUsers = usersData.users;
    console.log(`Found ${allAuthUsers.length} auth users`);

    // Get all existing chef_profiles user_ids
    const { data: existingProfiles, error: profilesError } = await supabaseAdmin
      .from('chef_profiles')
      .select('user_id');

    if (profilesError) {
      console.error('Error fetching existing profiles:', profilesError);
      throw profilesError;
    }

    const existingUserIds = new Set(existingProfiles?.map(p => p.user_id) || []);
    console.log(`Found ${existingUserIds.size} existing chef_profiles`);

    // Find users without profiles
    const usersWithoutProfiles = allAuthUsers.filter(u => !existingUserIds.has(u.id));
    console.log(`Found ${usersWithoutProfiles.length} users without chef_profiles`);

    if (usersWithoutProfiles.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'All users already have chef_profiles',
        created: 0,
        total: allAuthUsers.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to get pending_profiles data for these users
    const emails = usersWithoutProfiles.map(u => u.email).filter(Boolean);
    const { data: pendingProfiles } = await supabaseAdmin
      .from('pending_profiles')
      .select('*')
      .in('email', emails);

    const pendingByEmail = new Map(
      pendingProfiles?.map(p => [p.email.toLowerCase(), p]) || []
    );

    // Create profiles for users without them
    const profilesToInsert = usersWithoutProfiles.map(authUser => {
      const pending = pendingByEmail.get(authUser.email?.toLowerCase() || '');
      
      return {
        user_id: authUser.id,
        contact_email: authUser.email,
        chef_name: pending?.chef_name || authUser.user_metadata?.chef_name || null,
        business_name: pending?.business_name || null,
        city: pending?.city || null,
        address: pending?.address || null,
        contact_phone: pending?.phone || null,
        cuisines: pending?.cuisines || [],
        dish_types: pending?.dish_types || [],
        availability: pending?.availability || [],
        service_type: pending?.service_type || 'unsure',
        food_safety_status: pending?.food_safety_status || null,
        kvk_status: pending?.kvk_status || null,
        plan: pending?.plan || 'starter',
        logo_url: pending?.logo_url || null,
        onboarding_completed: false,
      };
    });

    console.log(`Inserting ${profilesToInsert.length} new chef_profiles...`);

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('chef_profiles')
      .insert(profilesToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting profiles:', insertError);
      throw insertError;
    }

    console.log(`Successfully created ${inserted?.length || 0} chef_profiles`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Created ${inserted?.length || 0} chef_profiles`,
      created: inserted?.length || 0,
      total: allAuthUsers.length,
      details: inserted?.map(p => ({ user_id: p.user_id, email: p.contact_email }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Backfill error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
