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

    // Look up pending profile by email
    const { data: pendingProfile, error } = await supabaseAdmin
      .from("pending_profiles")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      console.error("Error looking up pending profile:", error);
      return new Response(
        JSON.stringify({ error: "Failed to lookup profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingProfile) {
      return new Response(
        JSON.stringify({ found: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return the profile data including session_token for continued editing
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
    console.error("Error in lookup-pending-profile:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});