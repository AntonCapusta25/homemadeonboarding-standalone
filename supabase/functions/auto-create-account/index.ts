import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAccountRequest {
  email: string;
  chefName?: string;
  businessName?: string;
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

    const { email, chefName, businessName }: CreateAccountRequest = await req.json();
    
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
      // User already exists - generate a session for them
      console.log(`User already exists: ${email}, generating session`);
      
      // Generate a magic link token that we can use for auto-login
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
