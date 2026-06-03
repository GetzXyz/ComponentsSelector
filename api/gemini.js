/**
 * FORGE — GEMINI INTELLIGENCE DISPATCH MODULE
 * Isolated API gateway layer consumed by app.js
 *
 * ⚠️  SETUP REQUIRED:
 *     Replace the placeholder below with your real Gemini API key.
 *     Never commit a live key to version control.
 *     For production, proxy requests through a backend to protect the key.
 */

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const FORGE_GEMINI_MODEL   = "gemini-2.0-flash";
const FORGE_GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE"; // <── replace this

const FORGE_GEMINI_ENDPOINT =
    `https://generativelanguage.googleapis.com/v1beta/models/${FORGE_GEMINI_MODEL}:generateContent?key=${FORGE_GEMINI_API_KEY}`;

// ─── SYSTEM INSTRUCTIONS ─────────────────────────────────────────────────────

const FORGE_SYSTEM_INSTRUCTION = `You are FORGE, an elite hardware optimization algorithm specializing in the Pakistani PC market.
Your task is to return a strict JSON object with PC components optimized for the given budget and use case.
All prices must be in PKR and realistic for Pakistani retail market (2024–2025).
Do NOT output markdown. Do NOT wrap in backticks. Return raw JSON only.
Output schema (follow EXACTLY, no extra fields):
{
  "parts": [
    { "cat": "CPU",     "name": "Exact Model Name", "price": 45000, "icon": "🔳" },
    { "cat": "GPU",     "name": "Exact Model Name", "price": 85000, "icon": "🎮" },
    { "cat": "RAM",     "name": "Exact Model Name", "price": 12000, "icon": "⚡" },
    { "cat": "Storage", "name": "Exact Model Name", "price": 14000, "icon": "💾" },
    { "cat": "Chassis", "name": "Exact Model Name", "price":  5000, "icon": "📦" },
    { "cat": "Power",   "name": "Exact Model Name", "price":  8000, "icon": "🔌" }
  ],
  "insights": {
    "summary":     "2–3 sentences on overall configuration strategy",
    "performance": "Specific frame rate targets, rendering speeds, or workload capabilities",
    "upgrades":    "Clear, specific upgrade pathway for the next tier"
  }
}
Rules:
- Sum of all part prices must be BELOW the stated budget (leave ~5–10% buffer for taxes/shipping)
- Include 4–7 parts; never duplicate a category
- Use real, currently-available part names with correct model numbers
- Choose components that make architectural sense together (matching socket, DDR gen, PCIe gen, etc.)`;

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/**
 * Calls the Gemini API and returns a parsed blueprint object.
 * Throws on network error, non-OK HTTP status, or unparseable JSON.
 *
 * @param {number} budget   - Total PKR budget entered by user
 * @param {string} purpose  - One of: gaming | editing | coding | office
 * @returns {Promise<{parts: Array, insights: {summary, performance, upgrades}}>}
 */
async function contactForgeIntelligenceEngine(budget, purpose) {
    if (!FORGE_GEMINI_API_KEY || FORGE_GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
        throw new Error("API key not configured. Please set FORGE_GEMINI_API_KEY in gemini.js");
    }

    const userPrompt =
        `Generate a complete PC build for a budget of ${budget.toLocaleString()} PKR, ` +
        `optimized for ${purpose}. ` +
        `Ensure total component cost stays at least 5% below ${budget.toLocaleString()} PKR. ` +
        `Use real 2024–2025 Pakistani market prices.`;

    const requestBody = {
        contents: [
            { parts: [{ text: userPrompt }] }
        ],
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
            topP: 0.9
        },
        systemInstruction: {
            parts: [{ text: FORGE_SYSTEM_INSTRUCTION }]
        }
    };

    const response = await fetch(FORGE_GEMINI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        throw new Error(`Gemini API error ${response.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await response.json();

    // Extract text from Gemini response structure
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
        throw new Error("Gemini returned an empty or malformed response.");
    }

    // Defensively strip any stray markdown fences
    const cleanText = rawText
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/,           "")
        .trim();

    let parsed;
    try {
        parsed = JSON.parse(cleanText);
    } catch (e) {
        throw new Error(`Failed to parse Gemini JSON: ${e.message}`);
    }

    // Basic shape validation before returning
    if (!Array.isArray(parsed.parts) || parsed.parts.length === 0) {
        throw new Error("Gemini response missing valid parts array.");
    }
    if (!parsed.insights?.summary) {
        throw new Error("Gemini response missing insights block.");
    }

    return parsed;
}