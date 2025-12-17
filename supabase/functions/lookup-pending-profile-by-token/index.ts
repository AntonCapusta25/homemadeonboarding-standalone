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
    const { sessionToken } = await req.json();

    if (!sessionToken || typeof sessionToken !== 'string') {
      return new Response(
        JSON.stringify({ error: "Session token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`Looking up pending profile by session token`);

    // Look up pending profile by session token
    const { data: pendingProfile, error } = await supabaseAdmin
      .from("pending_profiles")
      .select("*")
      .eq("session_token", sessionToken)
      .maybeSingle();

    if (error) {
      console.error("Error looking up pending profile:", error);
      return new Response(
        JSON.stringify({ error: "Failed to lookup profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingProfile) {
      console.log("No pending profile found for token");
      return new Response(
        JSON.stringify({ found: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if profile has expired
    if (new Date(pendingProfile.expires_at) < new Date()) {
      console.log("Pending profile has expired");
      return new Response(
        JSON.stringify({ found: false, expired: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found pending profile for: ${pendingProfile.email}`);

    // Return the profile data
    return new Response(
      JSON.stringify({
        found: true,
        profile: {
          id: pendingProfile.id,
          email: pendingProfile.email,
          phone: pendingProfile.phone,
          chef_name: pendingProfile.chef_name,
          business_name: pendingProfile.business_name,
          city: pendingProfile.city,
          address: pendingProfile.address,
          cuisines: pendingProfile.cuisines,
          dish_types: pendingProfile.dish_types,
          availability: pendingProfile.availability,
          service_type: pendingProfile.service_type,
          food_safety_status: pendingProfile.food_safety_status,
          kvk_status: pendingProfile.kvk_status,
          plan: pendingProfile.plan,
          logo_url: pendingProfile.logo_url,
          current_step: pendingProfile.current_step,
        },
        sessionToken: pendingProfile.session_token,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in lookup-pending-profile-by-token:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
