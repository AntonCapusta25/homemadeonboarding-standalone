// Advanced AI Features for Home Chef App
// These tools integrate with OpenAI API for image generation, vision, and text generation

import { z } from "zod";

// Food Safety Test Questions
export const SAFETY_TEST_QUESTIONS = [
    {
        id: 1,
        question: "What is the safe minimum internal temperature for cooking chicken?",
        options: ["145°F (63°C)", "155°F (68°C)", "165°F (74°C)", "175°F (79°C)"],
        correctAnswer: 2,
        explanation: "Chicken must reach 165°F (74°C) to kill harmful bacteria like Salmonella."
    },
    {
        id: 2,
        question: "How long can perishable food safely sit at room temperature?",
        options: ["30 minutes", "1 hour", "2 hours", "4 hours"],
        correctAnswer: 2,
        explanation: "The 'danger zone' is 40-140°F. Food shouldn't sit out for more than 2 hours (1 hour if above 90°F)."
    },
    {
        id: 3,
        question: "What should you do first when entering the kitchen?",
        options: ["Put on apron", "Wash hands", "Preheat oven", "Gather ingredients"],
        correctAnswer: 1,
        explanation: "Always wash hands with soap and warm water for at least 20 seconds before handling food."
    },
    {
        id: 4,
        question: "Which cutting board should be used for raw meat?",
        options: ["Any board", "Wooden board", "Separate designated board", "Glass board"],
        correctAnswer: 2,
        explanation: "Use separate cutting boards for raw meat to prevent cross-contamination."
    },
    {
        id: 5,
        question: "How should you cool hot food before refrigerating?",
        options: ["Leave on counter overnight", "Put directly in fridge", "Cool quickly in shallow containers", "Wait until room temperature"],
        correctAnswer: 2,
        explanation: "Cool food quickly in shallow containers to prevent bacterial growth."
    }
];

// Food Safety Tips by Category
export const SAFETY_TIPS = {
    cleaning: [
        "Wash hands for 20 seconds with soap before and after handling food",
        "Sanitize countertops and cutting boards with bleach solution",
        "Clean as you go to prevent cross-contamination",
        "Wash produce under running water, even if you'll peel it"
    ],
    separation: [
        "Use separate cutting boards for raw meat and vegetables",
        "Store raw meat on bottom shelf to prevent drips",
        "Never reuse marinades that touched raw meat",
        "Keep raw and cooked foods separate in the fridge"
    ],
    cooking: [
        "Use a food thermometer to check internal temperatures",
        "Cook eggs until yolks are firm",
        "Bring sauces and soups to a rolling boil when reheating",
        "Don't rely on color alone to determine doneness"
    ],
    chilling: [
        "Refrigerate perishables within 2 hours (1 hour if above 90°F)",
        "Keep refrigerator at 40°F or below",
        "Thaw food in the refrigerator, not on the counter",
        "Use refrigerated leftovers within 3-4 days"
    ]
};

// Menu generation schemas
export const menuGenerationSchema = {
    cuisine: z.enum(["italian", "mexican", "asian", "american", "mediterranean", "fusion"]).describe("Type of cuisine"),
    dietaryRestrictions: z.array(z.enum(["vegetarian", "vegan", "gluten-free", "dairy-free", "nut-free"])).optional().describe("Dietary restrictions to consider"),
    numberOfDishes: z.number().min(3).max(10).describe("Number of dishes to generate"),
    priceRange: z.enum(["budget", "mid-range", "premium"]).describe("Target price range")
};

// Kitchen photo verification schema
export const kitchenPhotoSchema = {
    photoDescription: z.string().describe("Description of what's in the kitchen photo"),
    checklistItems: z.array(z.enum([
        "clean_countertops",
        "proper_lighting",
        "food_storage",
        "ventilation",
        "fire_safety",
        "handwashing_station"
    ])).describe("Items to verify in the photo")
};

// Logo generation schema
export const logoGenerationSchema = {
    businessName: z.string().describe("Name of the home chef business"),
    style: z.enum(["modern", "rustic", "elegant", "playful", "minimalist"]).describe("Logo style"),
    colors: z.array(z.string()).optional().describe("Preferred colors (e.g., ['red', 'gold'])"),
    includeIcon: z.boolean().optional().describe("Whether to include an icon/symbol")
};

// Helper function to call OpenAI API (you'll need to implement this)
export async function callOpenAIAPI(prompt: string, model: string = "gpt-4") {
    // This would integrate with OpenAI API
    // For now, return mock data
    return {
        response: `AI-generated response for: ${prompt}`,
        model
    };
}

// Helper function to generate images (DALL-E integration)
export async function generateImage(prompt: string) {
    // This would integrate with DALL-E API
    // For now, return mock URL
    return {
        imageUrl: `https://via.placeholder.com/512x512.png?text=${encodeURIComponent(prompt)}`,
        prompt
    };
}

// Helper function to analyze images (Vision API integration)
export async function analyzeImage(imageUrl: string, prompt: string) {
    // This would integrate with GPT-4 Vision API
    // For now, return mock analysis
    return {
        analysis: `Image analysis: The kitchen appears clean and well-organized.`,
        passed: true,
        suggestions: ["Consider adding better lighting", "Ensure fire extinguisher is visible"]
    };
}
