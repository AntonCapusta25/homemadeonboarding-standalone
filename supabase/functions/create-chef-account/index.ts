import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAccountRequest {
  email: string;
  pendingProfileId: string;
  redirectTo: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, pendingProfileId, redirectTo }: CreateAccountRequest = await req.json();
    
    if (!email || !pendingProfileId) {
      return new Response(
        JSON.stringify({ error: "Email and pendingProfileId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing account creation for email: ${email}`);

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error checking existing users:", listError);
      throw listError;
    }

    const existingUser = existingUsers.users.find(u => u.email === email);
    
    if (existingUser) {
      // User exists - send magic link for login
      console.log(`User exists, sending login magic link to: ${email}`);
      
      // Try to send the magic link email
      const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      // Handle rate limit gracefully - email was likely already sent recently
      if (otpError) {
        if (otpError.message.includes("security purposes") || otpError.status === 429) {
          console.log("Rate limited, but user exists - magic link was likely sent recently");
          return new Response(
            JSON.stringify({ 
              success: true, 
              isNewUser: false,
              message: "Magic link was recently sent. Please check your email or wait a minute to request again." 
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.error("Error sending OTP email:", otpError);
        throw otpError;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          isNewUser: false,
          message: "Magic link sent to existing user" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch pending profile data
    const { data: pendingProfile, error: profileError } = await supabaseAdmin
      .from("pending_profiles")
      .select("*")
      .eq("id", pendingProfileId)
      .single();

    if (profileError || !pendingProfile) {
      console.error("Error fetching pending profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Pending profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new user with magic link
    console.log(`Creating new user for: ${email}`);
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      email_confirm: false, // Will confirm via magic link
      user_metadata: {
        chef_name: pendingProfile.chef_name,
        business_name: pendingProfile.business_name,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw createError;
    }

    console.log(`User created with ID: ${newUser.user.id}`);

    // Create chef profile linked to the new user
    const { error: chefProfileError } = await supabaseAdmin
      .from("chef_profiles")
      .insert({
        user_id: newUser.user.id,
        contact_email: pendingProfile.email,
        contact_phone: pendingProfile.phone,
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
        onboarding_completed: true,
      });

    if (chefProfileError) {
      console.error("Error creating chef profile:", chefProfileError);
      // Try to clean up the created user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw chefProfileError;
    }

    // Send magic link email
    const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    // Handle rate limit gracefully for new users too
    if (otpError) {
      if (otpError.message.includes("security purposes") || otpError.status === 429) {
        console.log("Rate limited for new user, but account was created successfully");
        // Still delete pending profile and return success
        await supabaseAdmin
          .from("pending_profiles")
          .delete()
          .eq("id", pendingProfileId);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            isNewUser: true,
            message: "Account created. Magic link will be sent shortly - please wait a minute then request again." 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("Error sending magic link:", otpError);
      throw otpError;
    }

    // Delete the pending profile
    await supabaseAdmin
      .from("pending_profiles")
      .delete()
      .eq("id", pendingProfileId);

    console.log(`Account creation complete for: ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        isNewUser: true,
        message: "Account created and magic link sent" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in create-chef-account:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
