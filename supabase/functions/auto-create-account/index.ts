import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAccountRequest {
  email: string;
  phone?: string;
  chefName?: string;
  businessName?: string;
  pendingProfileId?: string;
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

    const { email, phone, chefName, businessName, pendingProfileId }: CreateAccountRequest = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Auto-creating account for email: ${email}`);

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error checking existing users:", listError);
      throw listError;
    }

    const existingUser = existingUsers.users.find(u => u.email === email);
    
    if (existingUser) {
      // User already exists - check if they have a chef_profile
      console.log(`User already exists: ${email}, checking chef_profile`);
      
      const { data: existingProfile } = await supabaseAdmin
        .from("chef_profiles")
        .select("id")
        .eq("user_id", existingUser.id)
        .maybeSingle();

      // If no chef_profile exists, create one
      if (!existingProfile) {
        console.log(`Creating missing chef_profile for existing user: ${existingUser.id}`);
        
        // Try to get data from pending_profile if available
        let profileData: any = {
          user_id: existingUser.id,
          contact_email: email,
          contact_phone: phone,
          chef_name: chefName,
          business_name: businessName,
          onboarding_completed: false,
        };

        if (pendingProfileId) {
          const { data: pendingProfile } = await supabaseAdmin
            .from("pending_profiles")
            .select("*")
            .eq("id", pendingProfileId)
            .maybeSingle();

          if (pendingProfile) {
            profileData = {
              user_id: existingUser.id,
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
              onboarding_completed: false,
            };
          }
        }

        const { error: profileError } = await supabaseAdmin
          .from("chef_profiles")
          .insert(profileData);

        if (profileError) {
          console.error("Error creating chef_profile for existing user:", profileError);
        } else {
          console.log(`Chef profile created for existing user: ${existingUser.id}`);
        }
      }
      
      // Generate a magic link token for auto-login
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
      });

      if (linkError) {
        console.error("Error generating link:", linkError);
        throw linkError;
      }

      // Extract the token from the link
      const url = new URL(linkData.properties.action_link);
      const token = url.searchParams.get('token');
      const type = url.searchParams.get('type');

      // Also send a magic link email for future logins (fire and forget)
      supabaseAdmin.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: 'https://chef-craft-flow.lovable.app/dashboard',
        }
      }).catch(err => console.log('Magic link email send (non-blocking):', err));

      return new Response(
        JSON.stringify({ 
          success: true, 
          isNewUser: false,
          userId: existingUser.id,
          verifyToken: token,
          tokenType: type,
          message: "User already exists, session token generated" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new user with auto-confirm enabled
    console.log(`Creating new user for: ${email}`);
    
    // Generate a temporary password for the user
    const tempPassword = crypto.randomUUID();
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        chef_name: chefName,
        business_name: businessName,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw createError;
    }

    console.log(`User created with ID: ${newUser.user.id}`);

    // Create chef_profile for the new user
    let profileData: any = {
      user_id: newUser.user.id,
      contact_email: email,
      contact_phone: phone,
      chef_name: chefName,
      business_name: businessName,
      onboarding_completed: false,
    };

    // Try to get more data from pending_profile if available
    if (pendingProfileId) {
      const { data: pendingProfile } = await supabaseAdmin
        .from("pending_profiles")
        .select("*")
        .eq("id", pendingProfileId)
        .maybeSingle();

      if (pendingProfile) {
        profileData = {
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
          onboarding_completed: false,
        };
      }
    }

    const { error: profileError } = await supabaseAdmin
      .from("chef_profiles")
      .insert(profileData);

    if (profileError) {
      console.error("Error creating chef_profile:", profileError);
      // Don't fail the whole operation, just log the error
    } else {
      console.log(`Chef profile created for new user: ${newUser.user.id}`);
    }

    // Generate a magic link for auto-login
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (linkError) {
      console.error("Error generating link:", linkError);
      throw linkError;
    }

    // Extract the token from the link
    const url = new URL(linkData.properties.action_link);
    const token = url.searchParams.get('token');
    const type = url.searchParams.get('type');

    // Send a magic link email for future logins (fire and forget)
    supabaseAdmin.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: 'https://chef-craft-flow.lovable.app/dashboard',
      }
    }).then(() => {
      console.log(`Magic link email sent to: ${email}`);
    }).catch(err => console.log('Magic link email send error (non-blocking):', err));

    console.log(`Account auto-created successfully for: ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        isNewUser: true,
        userId: newUser.user.id,
        verifyToken: token,
        tokenType: type,
        message: "Account created and verified" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in auto-create-account:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
