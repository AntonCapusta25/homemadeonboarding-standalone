// supabase/functions/generate-logo/index.ts
// Edge Function: Generate a brand logo from frontend-provided hints
// Notes:
// - If OPENAI_API_KEY exists -> tries OpenAI image generation (PNG base64).
// - Otherwise -> SVG fallback (vector). You can force SVG via { format: "svg" }.
// - Falls back to SVG if OpenAI fails for ANY reason
// - Optional upload to Supabase Storage (bucket + path) with SUPABASE_SERVICE_ROLE_KEY.
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
// ================== OpenAI ==================
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPENAI") || "";
const DEFAULT_IMAGE_MODEL = Deno.env.get("OPENAI_IMAGE_MODEL") || "gpt-image-1";
// ================== Constants ==================
const MAX_RESPONSE_SIZE_MB = 5; // Warn if response exceeds this
const TIMEOUT_MS = 120_000; // 120 seconds
const WARNING_TIMEOUT_MS = 60_000; // 60 seconds
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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
}
// Upload base64 (PNG or SVG) into Storage and return public/signed URL
async function uploadBase64PNG(opts: {
  bucket: string;
  path: string;
  base64: string;
  contentType?: string;
  public?: boolean;
}) {
  if (!supabaseAdmin) throw new Error("Supabase admin client not configured");
  const arrayBuffer = Uint8Array.from(atob(opts.base64), (c) => c.charCodeAt(0));
  const contentType = opts.contentType || "image/png";
  const { error } = await supabaseAdmin.storage.from(opts.bucket).upload(opts.path, arrayBuffer, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  if (opts.public) {
    const { data: pub } = supabaseAdmin.storage.from(opts.bucket).getPublicUrl(opts.path);
    return {
      url: pub.publicUrl,
      path: opts.path,
    };
  } else {
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from(opts.bucket)
      .createSignedUrl(opts.path, 60 * 60); // 1 hour
    if (signErr) throw signErr;
    return {
      url: signed.signedUrl,
      path: opts.path,
    };
  }
}
// ================== Prompt builder (UPDATED) ==================
// Build EXACT prompt requested by Izaak.
// Template:
//   Create a ${logo_style} logo for "${brand_name}" food brand.
//   Colors: ${primary_color} and ${secondary_color}.
//   Include ${motif} motif.
//   Tagline: "${tagline}".
//   Professional food industry design with beige background.
function buildLogoPrompt(params: {
  name?: string;
  brandName?: string;
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
  // Map incoming fields to the template variables
  const brandName = params.name || params.brandName || "Homemade Brand";
  const logoStyle = params.logoStyle || params.style || "modern minimal";
  // Prefer explicit primary/secondary over colors array
  const primaryColor = params.primaryColor || (Array.isArray(params.colors) ? params.colors[0] : null) || "#111827";
  const secondaryColor = params.secondaryColor || (Array.isArray(params.colors) ? params.colors[1] : null) || "#F59E0B";
  // Motif comes from explicit motif or symbols/cookingSpecialty/keywords/cuisine
  const motif =
    params.motif ||
    (Array.isArray(params.symbols) && params.symbols.length ? params.symbols.join(", ") : null) ||
    params.cookingSpecialty ||
    params.keywords ||
    params.cuisine ||
    "home-cooked meals";
  const tagline = params.tagline?.toString().trim();
  let prompt =
    `Create a ${logoStyle} logo for "${brandName}" food brand. ` +
    `Colors: ${primaryColor} and ${secondaryColor}. ` +
    `Include ${motif} motif. `;
  if (tagline && tagline.length > 0) {
    prompt += `Tagline: "${tagline}". `;
  }
  prompt += `Professional food industry design with beige background.`;
  return prompt;
}
// ================== SVG fallback (now includes tagline) ==================
function buildFallbackLogoSVG(opts: {
  name: string;
  acronym?: string;
  colors?: string[];
  size?: number;
  tagline?: string;
}) {
  const size = Math.max(256, Math.min(1024, opts.size || 512));
  const bg = "#F5EFE6"; // beige background to match the prompt
  const primary = opts.colors?.[0] || "#111827"; // slate-900
  const secondary = opts.colors?.[1] || "#10B981"; // emerald-500
  const tagline = (opts.tagline || "").slice(0, 90);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  <!-- Emblem -->
  <g transform="translate(${size / 2}, ${size / 2.2})">
    <circle r="${Math.floor(size * 0.28)}" fill="${secondary}" opacity="0.15"/>
    <path d="M -${Math.floor(size * 0.16)} 0 L 0 -${Math.floor(size * 0.18)} L ${Math.floor(size * 0.16)} 0 L 0 ${Math.floor(size * 0.18)} Z" fill="${secondary}" opacity="0.45"/>
    <circle r="${Math.floor(size * 0.08)}" fill="${secondary}"/>
  </g>

  <!-- Brand Name -->
  <text x="${size / 2}" y="${Math.floor(size * 0.8)}" text-anchor="middle" fill="${primary}"
        font-family="system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial" font-size="${Math.floor(size * 0.095)}" font-weight="800">
    ${opts.name}
  </text>

  <!-- Tagline (optional) -->
  ${
    tagline
      ? `<text x="${size / 2}" y="${Math.floor(size * 0.9)}" text-anchor="middle" fill="${primary}"
           font-family="system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial" font-size="${Math.floor(size * 0.05)}" font-weight="500" opacity="0.8">
           ${tagline}
         </text>`
      : ""
  }

  <!-- Acronym watermark (optional) -->
  ${
    opts.acronym
      ? `<text x="${size / 2}" y="${Math.floor(size * 0.18)}" text-anchor="middle" fill="${primary}"
           font-family="system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial" font-size="${Math.floor(size * 0.14)}" font-weight="800" opacity="0.06">
           ${opts.acronym}
         </text>`
      : ""
  }
</svg>`.trim();
}
// ================== Generate SVG Fallback Response ==================
// Extracted to separate function to avoid code duplication
async function generateSVGFallback(params: {
  name: string;
  acronym?: string;
  colorsArr: string[];
  tagline?: string;
  uploadToStorage: boolean;
  storageBucket: string;
  storagePath?: string;
  fileBase: string;
  publicUrl: boolean;
  logoStyle?: string;
  style?: string;
  primaryColor?: string;
  secondaryColor?: string;
  motif?: string;
  symbols?: string[];
  cookingSpecialty?: string;
  keywords?: string;
  cuisine?: string;
  fallbackReason: string;
}) {
  const {
    name,
    acronym,
    colorsArr,
    tagline,
    uploadToStorage,
    storageBucket,
    storagePath,
    fileBase,
    publicUrl,
    logoStyle,
    style,
    primaryColor,
    secondaryColor,
    motif,
    symbols,
    cookingSpecialty,
    keywords,
    cuisine,
    fallbackReason,
  } = params;
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
    const path = storagePath || `${fileBase}.svg`;
    console.log(`📤 Uploading SVG fallback to storage: ${storageBucket}/${path}`);
    try {
      uploaded = await uploadBase64PNG({
        bucket: storageBucket,
        path,
        base64,
        contentType: "image/svg+xml",
        public: publicUrl,
      });
      console.log(`✅ SVG fallback upload successful: ${uploaded.url}`);
    } catch (e) {
      console.error("⚠️ Upload SVG fallback failed:", e);
      uploaded = null;
    }
  }
  const syntheticPrompt = buildLogoPrompt({
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
  });
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
    promptUsed: syntheticPrompt,
    warning: `OpenAI generation failed: ${fallbackReason}. Generated SVG fallback instead.`,
    timestamp: new Date().toISOString(),
  };
}
// ================== Main HTTP handler ==================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: `Method ${req.method} not allowed. Use POST.`,
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
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
    size = "1024x1024",
    format,
    uploadToStorage = false,
    storageBucket = "generated-assets",
    storagePath,
    publicUrl = true,
    logoStyle,
    fontStyle,
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
  if (colors && !Array.isArray(colors)) return badRequest("'colors' must be an array of strings");
  if (symbols && !Array.isArray(symbols)) return badRequest("'symbols' must be an array of strings");
  // Derive colors array from primary/secondary if not provided
  const colorsArr = Array.isArray(colors) ? colors : [primaryColor, secondaryColor].filter(Boolean);
  // ===== Decide mode =====
  const wantSVG = format === "svg" || (!OPENAI_API_KEY && format !== "raster");
  const fileBase = `logos/${Date.now()}-${(name || "logo")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .slice(0, 40)}`;
  console.log(`🔑 OpenAI API Key present: ${!!OPENAI_API_KEY}`);
  console.log(`🎯 Format requested: ${format || "none"}`);
  console.log(`🎨 Will use SVG fallback: ${wantSVG}`);
  console.log(`🤖 Model: ${DEFAULT_IMAGE_MODEL}`);
  // If user explicitly requested SVG, generate it immediately
  if (wantSVG) {
    console.log("🎨 Generating SVG (user requested or no OpenAI key)");
    try {
      const result = await generateSVGFallback({
        name,
        acronym,
        colorsArr,
        tagline,
        uploadToStorage,
        storageBucket,
        storagePath,
        fileBase,
        publicUrl,
        logoStyle,
        style,
        primaryColor,
        secondaryColor,
        motif,
        symbols,
        cookingSpecialty,
        keywords,
        cuisine,
        fallbackReason: "user-requested",
      });
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    } catch (svgError) {
      console.error("❌ SVG generation failed:", svgError);
      return serverError("SVG generation failed", svgError instanceof Error ? svgError.message : String(svgError));
    }
  }
  // ===== OpenAI Raster Path with Fallback =====
  console.log("🤖 Attempting OpenAI image generation for logo");
  let openaiError: string | null = null;
  let openaiErrorType = "unknown";
  try {
    const controller = new AbortController();
    const startTime = Date.now();
    // Warning timeout at 60 seconds
    const warningTimeout = setTimeout(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.warn(`⚠️ Logo generation exceeding 60 seconds (${elapsed}s elapsed) - still processing...`);
    }, WARNING_TIMEOUT_MS);
    // Abort timeout at 120 seconds
    const timeoutId = setTimeout(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(`❌ Logo generation timeout at ${elapsed}s`);
      controller.abort();
    }, TIMEOUT_MS);
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
    // Log the exact prompt
    console.log("🧠 Logo prompt (OpenAI path):\n" + prompt);
    // Build request body for gpt-image-1
    // IMPORTANT: Only include supported parameters
    const requestBody = {
      model: DEFAULT_IMAGE_MODEL,
      prompt,
      size,
      n: 1,
      quality: "low",
    };
    console.log("📤 Request body:", JSON.stringify(requestBody, null, 2));
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(warningTimeout);
      clearTimeout(timeoutId);
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⏱️ OpenAI response received after ${elapsed}s`);
    console.log(`📡 OpenAI response status: ${res.status}`);
    if (!res.ok) {
      const errText = await res.text();
      console.error("🤖 OpenAI error:", res.status, errText);
      // Determine error type
      if (res.status === 400) openaiErrorType = "invalid-request";
      else if (res.status === 429) openaiErrorType = "rate-limit";
      else if (res.status === 500) openaiErrorType = "server-error";
      else openaiErrorType = `http-${res.status}`;
      openaiError = `OpenAI API error (${res.status}): ${errText}`;
      throw new Error(openaiError);
    }
    const data = await res.json();
    // Check for processing time in headers
    const processingMs = res.headers.get("openai-processing-ms");
    if (processingMs) {
      console.log(`⚙️ OpenAI processing time: ${(parseInt(processingMs) / 1000).toFixed(1)}s`);
    }
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      console.error("❌ OpenAI response structure:", JSON.stringify(data, null, 2));
      openaiError = "OpenAI returned no image data";
      openaiErrorType = "no-image-data";
      throw new Error(openaiError);
    }
    // Check response size
    const sizeKB = Math.round(b64.length / 1024);
    const sizeMB = (sizeKB / 1024).toFixed(2);
    console.log(`📊 Image size: ${sizeKB}KB (${sizeMB}MB)`);
    if (parseFloat(sizeMB) > MAX_RESPONSE_SIZE_MB) {
      console.warn(`⚠️ Large response: ${sizeMB}MB - may exceed Edge Function limits!`);
    }
    let uploaded = null;
    if (uploadToStorage && supabaseAdmin) {
      const path = storagePath || `${fileBase}.png`;
      console.log(`📤 Uploading to storage: ${storageBucket}/${path}`);
      uploaded = await uploadBase64PNG({
        bucket: storageBucket,
        path,
        base64: b64,
        public: publicUrl,
      }).catch((e) => {
        console.error("⚠️ Upload PNG failed:", e);
        return null;
      });
      if (uploaded) {
        console.log(`✅ Upload successful: ${uploaded.url}`);
      }
    }
    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Logo generation completed in ${totalElapsed}s`);
    return new Response(
      JSON.stringify({
        success: true,
        type: "png",
        mime: "image/png",
        source: "openai",
        model: DEFAULT_IMAGE_MODEL,
        size,
        sizeKB,
        sizeMB,
        processingTimeSeconds: parseFloat(elapsed),
        base64: b64,
        uploaded,
        promptUsed: prompt,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (e) {
    // ===== FALLBACK MECHANISM STARTS HERE =====
    console.error("❌ OpenAI generation error:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    // Detect error type if not already set
    if (!openaiError) {
      openaiError = errorMessage;
      if (errorMessage.includes("abort") || errorMessage.includes("timeout")) {
        openaiErrorType = "timeout";
      } else if (errorMessage.includes("429") || errorMessage.includes("rate_limit")) {
        openaiErrorType = "rate-limit";
      } else if (errorMessage.includes("quota")) {
        openaiErrorType = "quota-exceeded";
      } else if (errorMessage.includes("400") || errorMessage.includes("invalid_request")) {
        openaiErrorType = "invalid-request";
      } else {
        openaiErrorType = "unknown-error";
      }
    }
    console.warn(`⚠️ OpenAI failed with error type: ${openaiErrorType}`);
    console.warn(`⚠️ Error details: ${openaiError}`);
    // ALWAYS attempt SVG fallback when OpenAI fails (unless user explicitly wanted SVG from start, which is already handled above)
    console.log(`🔄 Attempting SVG fallback...`);
    try {
      const result = await generateSVGFallback({
        name,
        acronym,
        colorsArr,
        tagline,
        uploadToStorage,
        storageBucket,
        storagePath,
        fileBase,
        publicUrl,
        logoStyle,
        style,
        primaryColor,
        secondaryColor,
        motif,
        symbols,
        cookingSpecialty,
        keywords,
        cuisine,
        fallbackReason: `openai-${openaiErrorType}`,
      });
      // Return SUCCESS (200) with SVG fallback
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    } catch (fallbackError) {
      // SVG fallback ALSO failed - this should be very rare
      console.error("❌ SVG fallback generation ALSO failed:", fallbackError);
      // Return 500 error only if BOTH OpenAI AND SVG fallback fail
      return serverError("Logo generation failed and fallback also failed", {
        openaiError: openaiError,
        openaiErrorType: openaiErrorType,
        fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });
    }
  }
});
