import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const normalizedEmail = email.toLowerCase().trim();

    // Check ALL sources for existing user

    // 1. Check pending_profiles
    const { data: pendingProfile } = await supabaseAdmin
      .from("pending_profiles")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle();

    // 2. Check chef_profiles
    const { data: chefProfile } = await supabaseAdmin
      .from("chef_profiles")
      .select("*")
      .eq("contact_email", normalizedEmail)
      .maybeSingle();

    // 3. Check Supabase Auth users
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authUsers?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);

    // Determine if user exists in ANY source
    const foundInPending = !!pendingProfile;
    const foundInChef = !!chefProfile;
    const foundInAuth = !!authUser;
    const found = foundInPending || foundInChef || foundInAuth;

    if (!found) {
      return new Response(
        JSON.stringify({ found: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build profile from best available source
    const profile = pendingProfile || (chefProfile ? {
      email: chefProfile.contact_email,
      phone: chefProfile.contact_phone,
      chef_name: chefProfile.chef_name,
      business_name: chefProfile.business_name,
      city: chefProfile.city,
      address: chefProfile.address,
      cuisines: chefProfile.cuisines,
      dish_types: chefProfile.dish_types,
      availability: chefProfile.availability,
      service_type: chefProfile.service_type,
      food_safety_status: chefProfile.food_safety_status,
      kvk_status: chefProfile.kvk_status,
      plan: chefProfile.plan,
      logo_url: chefProfile.logo_url,
    } : {
      email: normalizedEmail,
      chef_name: authUser?.user_metadata?.chef_name || null,
    });

    return new Response(
      JSON.stringify({
        found: true,
        source: foundInChef ? 'chef_profiles' : (foundInPending ? 'pending_profiles' : 'auth'),
        profile: profile,
        sessionToken: pendingProfile?.session_token,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in lookup-pending-profile:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});