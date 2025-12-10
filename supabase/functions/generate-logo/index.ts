// supabase/functions/generate-logo/index.ts
// Edge Function: Generate a brand logo using Lovable AI Gateway
// Notes:
// - Uses Lovable AI gateway with google/gemini-3-pro-image-preview for image generation
// - Falls back to SVG if image generation fails
// - Optional upload to Supabase Storage (bucket + path)
// ================== Imports ==================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ================== CORS ==================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-requested-with, accept, origin, referer, user-agent",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH",
  "Access-Control-Max-Age": "86400",
};

// ================== Supabase Admin (optional upload) ==================
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

// ================== Lovable AI ==================
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ================== Constants ==================
const MAX_RESPONSE_SIZE_MB = 5;
const TIMEOUT_MS = 120_000;

// ================== Helpers ==================
function badRequest(message: string, details: unknown = null) {
  return new Response(
    JSON.stringify({
      error: message,
      details,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

function serverError(message: string, details: unknown = null) {
  return new Response(
    JSON.stringify({
      error: message,
      details,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

// Upload base64 image to Storage
async function uploadBase64Image(opts: {
  bucket: string;
  path: string;
  base64: string;
  contentType?: string;
  public?: boolean;
}) {
  if (!supabaseAdmin) throw new Error("Supabase admin client not configured");
  
  // Handle data URL format
  let base64Data = opts.base64;
  if (base64Data.includes(",")) {
    base64Data = base64Data.split(",")[1];
  }
  
  const arrayBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  const contentType = opts.contentType || "image/png";
  
  const { error } = await supabaseAdmin.storage.from(opts.bucket).upload(opts.path, arrayBuffer, {
    contentType,
    upsert: true,
  });
  
  if (error) throw error;
  
  if (opts.public) {
    const { data: pub } = supabaseAdmin.storage.from(opts.bucket).getPublicUrl(opts.path);
    return { url: pub.publicUrl, path: opts.path };
  } else {
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from(opts.bucket)
      .createSignedUrl(opts.path, 60 * 60);
    if (signErr) throw signErr;
    return { url: signed.signedUrl, path: opts.path };
  }
}

// Build logo generation prompt
function buildLogoPrompt(params: {
  name: string;
  logoStyle?: string;
  style?: string;
  primaryColor?: string;
  secondaryColor?: string;
  colors?: string[];
  tagline?: string;
  motif?: string;
  symbols?: string[];
  cookingSpecialty?: string;
  keywords?: string;
  cuisine?: string;
  mood?: string;
}) {
  const {
    name,
    logoStyle = "modern minimal",
    primaryColor,
    secondaryColor,
    colors,
    tagline,
    motif,
    cookingSpecialty,
    cuisine,
  } = params;

  const colorList = colors?.length
    ? colors.join(" and ")
    : [primaryColor, secondaryColor].filter(Boolean).join(" and ") || "#C65D3B and #F2A35E";

  const motifStr = motif || cookingSpecialty || cuisine || "";

  let prompt = `Create a ${logoStyle} logo for "${name}" food brand. Colors: ${colorList}.`;
  if (motifStr) prompt += ` Include ${motifStr} motif.`;
  if (tagline) prompt += ` Tagline: "${tagline}".`;
  prompt += " Professional food industry design with beige background.";

  return prompt;
}

// Build SVG fallback logo
function buildFallbackLogoSVG(opts: {
  name: string;
  acronym?: string;
  colors?: string[];
  size?: number;
  tagline?: string;
}) {
  const size = opts.size || 512;
  const primary = opts.colors?.[0] || "#C65D3B";
  const secondary = opts.colors?.[1] || "#F2A35E";
  const bg = "#FAF7F2";

  // Generate acronym from name
  const acronym =
    opts.acronym ||
    opts.name
      .split(/[\s']+/)
      .filter((w) => w.length > 0 && /^[A-Za-z]/.test(w))
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");

  const tagline = opts.tagline
    ? `<text x="${size / 2}" y="${Math.floor(size * 0.7)}" text-anchor="middle" fill="${primary}"
         font-family="system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial" font-size="${Math.floor(size * 0.045)}" font-weight="500">
         ${opts.tagline}
       </text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${Math.floor(size * 0.38)}" fill="none" stroke="${secondary}" stroke-width="${Math.floor(size * 0.02)}"/>
  <text x="${size / 2}" y="${size / 2 + size * 0.12}" text-anchor="middle" fill="${primary}"
        font-family="system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial" font-size="${Math.floor(size * 0.28)}" font-weight="700">
    ${acronym}
  </text>
  ${tagline}
</svg>`.trim();
}

// Generate SVG fallback
async function generateSVGFallback(params: {
  name: string;
  acronym?: string;
  colorsArr: string[];
  tagline?: string;
  uploadToStorage: boolean;
  storageBucket: string;
  fileBase: string;
  publicUrl: boolean;
  fallbackReason: string;
}) {
  const { name, acronym, colorsArr, tagline, uploadToStorage, storageBucket, fileBase, publicUrl, fallbackReason } = params;
  
  console.log(`🎨 Generating SVG fallback (reason: ${fallbackReason})`);
  
  const svg = buildFallbackLogoSVG({
    name,
    acronym,
    colors: colorsArr,
    size: 512,
    tagline,
  });
  
  const base64 = btoa(svg);
  let uploaded = null;
  
  if (uploadToStorage && supabaseAdmin) {
    // Always use .svg extension for SVG files
    const path = `${fileBase}.svg`;
    console.log(`📤 Uploading SVG fallback to storage: ${storageBucket}/${path}`);
    try {
      uploaded = await uploadBase64Image({
        bucket: storageBucket,
        path,
        base64,
        contentType: "image/svg+xml",
        public: publicUrl,
      });
      console.log(`✅ SVG fallback upload successful: ${uploaded.url}`);
    } catch (e) {
      console.error("⚠️ Upload SVG fallback failed:", e);
    }
  }
  
  console.log(`✅ SVG fallback generated successfully`);
  
  return {
    success: true,
    type: "svg",
    mime: "image/svg+xml",
    source: "svg-fallback",
    fallbackReason,
    width: 512,
    height: 512,
    base64,
    uploaded,
    timestamp: new Date().toISOString(),
  };
}

// ================== Main HTTP handler ==================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: `Method ${req.method} not allowed. Use POST.` }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  
  console.log(`🚀 /generate-logo POST from ${req.headers.get("origin") || "unknown"}`);
  
  let body;
  try {
    body = await req.json();
  } catch (e) {
    console.error("❌ JSON parse error:", e);
    return badRequest("Invalid JSON body", e instanceof Error ? e.message : e);
  }
  
  // ===== Inputs =====
  const {
    name,
    acronym,
    cuisine,
    keywords,
    style,
    colors,
    symbols,
    mood,
    format,
    uploadToStorage = false,
    storageBucket = "logos",
    publicUrl = true,
    logoStyle,
    primaryColor,
    secondaryColor,
    tagline,
    cookingSpecialty,
    motif,
  } = body || {};
  
  // ===== Validation =====
  if (!name || typeof name !== "string" || name.length > 80) {
    return badRequest("Field 'name' is required (<= 80 chars)");
  }
  
  const colorsArr = Array.isArray(colors) ? colors : [primaryColor, secondaryColor].filter(Boolean);
  const fileBase = `generated/${Date.now()}-${name.toLowerCase().replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}`;
  
  console.log(`🔑 Lovable API Key present: ${!!LOVABLE_API_KEY}`);
  console.log(`🎯 Format requested: ${format || "none"}`);
  
  // If SVG explicitly requested or no API key, use SVG fallback
  if (format === "svg" || !LOVABLE_API_KEY) {
    const result = await generateSVGFallback({
      name,
      acronym,
      colorsArr,
      tagline,
      uploadToStorage,
      storageBucket,
      fileBase,
      publicUrl,
      fallbackReason: format === "svg" ? "user-requested" : "no-api-key",
    });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  
  // ===== Lovable AI Image Generation =====
  console.log("🤖 Attempting Lovable AI image generation for logo");
  
  try {
    const prompt = buildLogoPrompt({
      name,
      logoStyle,
      style,
      primaryColor,
      secondaryColor,
      colors: colorsArr,
      tagline,
      motif,
      symbols,
      cookingSpecialty,
      keywords,
      cuisine,
      mood,
    });
    
    console.log("🧠 Logo prompt:\n" + prompt);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    const response = await fetch(LOVABLE_AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
    
    console.log(`📡 Lovable AI response status: ${response.status}`);
    
    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ Lovable AI error:", response.status, errText);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded");
      }
      if (response.status === 402) {
        throw new Error("Payment required");
      }
      throw new Error(`Lovable AI error (${response.status}): ${errText}`);
    }
    
    const data = await response.json();
    console.log("📦 Lovable AI response received");
    
    // Extract image from response
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error("❌ No image in response:", JSON.stringify(data, null, 2));
      throw new Error("No image returned from AI");
    }
    
    // Extract base64 from data URL
    let base64 = imageData;
    if (imageData.startsWith("data:")) {
      base64 = imageData.split(",")[1];
    }
    
    const sizeKB = Math.round(base64.length / 1024);
    console.log(`📊 Image size: ${sizeKB}KB`);
    
    let uploaded = null;
    if (uploadToStorage && supabaseAdmin) {
      const path = `${fileBase}.png`;
      console.log(`📤 Uploading to storage: ${storageBucket}/${path}`);
      
      try {
        uploaded = await uploadBase64Image({
          bucket: storageBucket,
          path,
          base64,
          contentType: "image/png",
          public: publicUrl,
        });
        console.log(`✅ Upload successful: ${uploaded.url}`);
      } catch (e) {
        console.error("⚠️ Upload failed:", e);
      }
    }
    
    console.log("✅ Logo generation completed");
    
    return new Response(
      JSON.stringify({
        success: true,
        type: "png",
        mime: "image/png",
        source: "lovable-ai",
        model: "google/gemini-3-pro-image-preview",
        sizeKB,
        base64,
        uploaded,
        promptUsed: prompt,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    // Fallback to SVG on any error
    console.error("❌ Image generation error:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    
    console.log("🔄 Falling back to SVG...");
    
    const result = await generateSVGFallback({
      name,
      acronym,
      colorsArr,
      tagline,
      uploadToStorage,
      storageBucket,
      fileBase,
      publicUrl,
      fallbackReason: errorMessage,
    });
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
