/**
 * FORGE — GEMINI INTELLIGENCE DISPATCH MODULE v4.2 (FIXED)
 * Live internet search + multi-currency + budget-aware builds + 3 options per category
 *
 * FIXES APPLIED:
 * - API key placeholder updated (must start with AIza — get from aistudio.google.com/app/apikey)
 * - responseMimeType REMOVED — it is incompatible with googleSearch grounding (causes 400 error)
 * - Upgraded model to gemini-2.0-flash (better JSON handling than flash-lite)
 * - Added key format validation before API call
 * - Improved JSON extraction with multi-line fence stripping
 * - Added maxOutputTokens to generationConfig
 * - UTC timestamp for invoice consistency
 */

"use strict";

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const FORGE_GEMINI_MODEL = "gemini-2.0-flash";

// ⚠ IMPORTANT: Replace with your real key from https://aistudio.google.com/app/apikey
// Gemini API keys always start with "AIza" followed by 35 alphanumeric characters (39 chars total).
// Example format: AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ1234567
// The old key starting with "AQ." was a Firebase App Check token — wrong credential type.
const FORGE_GEMINI_API_KEY = "AIzaSyYOUR_REAL_KEY_HERE";

const FORGE_GEMINI_ENDPOINT =
    `https://generativelanguage.googleapis.com/v1beta/models/${FORGE_GEMINI_MODEL}:generateContent?key=${FORGE_GEMINI_API_KEY}`;

// ─── CURRENCY CONFIG ─────────────────────────────────────────────────────────

const CURRENCIES = {
    PKR: { symbol: "Rs",  name: "Pakistani Rupee",   rate: 1        },
    USD: { symbol: "$",   name: "US Dollar",         rate: 0.0036   },
    EUR: { symbol: "€",   name: "Euro",              rate: 0.0033   },
    GBP: { symbol: "£",   name: "British Pound",     rate: 0.0028   },
    AED: { symbol: "د.إ", name: "UAE Dirham",        rate: 0.0131   },
    SAR: { symbol: "ر.س", name: "Saudi Riyal",       rate: 0.0134   },
    CAD: { symbol: "C$",  name: "Canadian Dollar",   rate: 0.0049   },
    AUD: { symbol: "A$",  name: "Australian Dollar", rate: 0.0055   }
};

let activeCurrency = "PKR";

function setActiveCurrency(code) { if (CURRENCIES[code]) activeCurrency = code; }
function getActiveCurrency() { return activeCurrency; }
function convertFromPKR(pkrAmount) { return pkrAmount * (CURRENCIES[activeCurrency]?.rate ?? 1); }
function convertToPKR(amount) { return Math.round(amount / (CURRENCIES[activeCurrency]?.rate ?? 1)); }

function formatPrice(pkrAmount) {
    const cur = CURRENCIES[activeCurrency];
    const val = convertFromPKR(pkrAmount);
    return `${cur.symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatRaw(currencyAmount) {
    const cur = CURRENCIES[activeCurrency];
    return `${cur.symbol}${currencyAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── TIER DETECTION ──────────────────────────────────────────────────────────

function getBudgetTier(budgetPKR) {
    if (budgetPKR <   80000) return "entry";
    if (budgetPKR <  200000) return "budget";
    if (budgetPKR <  400000) return "mid-range";
    if (budgetPKR <  700000) return "high-end";
    if (budgetPKR < 1200000) return "enthusiast";
    return "flagship";
}

// ─── RATE LIMITER ─────────────────────────────────────────────────────────────

const RATE_LIMIT = { maxRequests: 5, windowMs: 60000, timestamps: [] };

function checkRateLimit() {
    const now = Date.now();
    RATE_LIMIT.timestamps = RATE_LIMIT.timestamps.filter(t => now - t < RATE_LIMIT.windowMs);
    if (RATE_LIMIT.timestamps.length >= RATE_LIMIT.maxRequests) {
        const oldest = RATE_LIMIT.timestamps[0];
        const waitSec = Math.ceil((RATE_LIMIT.windowMs - (now - oldest)) / 1000);
        throw new Error(`RATE_LIMITED: Too many requests. Please wait ${waitSec} seconds.`);
    }
    RATE_LIMIT.timestamps.push(now);
}

// ─── SYSTEM INSTRUCTION ──────────────────────────────────────────────────────

function buildSystemInstruction(budgetPKR, purpose) {
    const tier = getBudgetTier(budgetPKR);

    const allocationGuide = purpose === "gaming"
        ? "GPU: 35-45%, CPU: 20-25%, Motherboard: 8-12%, RAM: 5-10%, Storage: 5-10%, PSU: 5-8%, Case: 2-5%, remaining for peripherals."
        : "CPU: 30-35%, GPU: 15-20%, Motherboard: 10-12%, RAM: 10-15%, Storage: 8-12%, PSU: 5-8%, Case: 2-5%, remaining for peripherals.";

    const tierGuidance = {
        entry:      "Entry-level (under 80k PKR): Prioritize CPU, GPU, RAM, Storage. Skip expensive peripherals entirely.",
        budget:     "Budget (80k-200k PKR): Solid mid-entry components. AMD/Intel budget CPUs. GTX 1660 / RX 6600 class GPU.",
        "mid-range":"Mid-range (200k-400k PKR): RTX 3060 Ti / RX 6700 XT. Ryzen 5 5600X / i5-12600K. Good peripherals.",
        "high-end": "High-end (400k-700k PKR): RTX 4070 / RTX 3080. Ryzen 7 5800X3D. 144Hz+ monitor.",
        enthusiast: "Enthusiast (700k-1.2M PKR): RTX 4080 / RTX 5070. Ryzen 9 7900X. Premium 1440p/4K peripherals.",
        flagship:   "Flagship (1.2M+ PKR): RTX 5090 / RTX 4090. Ryzen 9 9950X. Ultra-premium everything, 4K 144Hz+."
    };

    return `You are FORGE, an elite AI PC hardware analyst with access to live internet pricing data.
Task: Generate a complete PC build from REAL, CURRENT Pakistani market prices (2024–2025).
Budget tier: ${tier.toUpperCase()} — ${tierGuidance[tier]}
Budget allocation for ${purpose}: ${allocationGuide}

CRITICAL RULES:
1. Return ONLY a raw JSON object — no markdown, no backticks, no preamble, no explanation.
2. Provide EXACTLY 3 options per category (RECOMMENDED/New, BUDGET PICK/Used, BEST VALUE).
3. All prices in PKR based on real Pakistani market rates from Daraz.pk, OLX Pakistan, itech.com.pk.
4. Total of RECOMMENDED selections must stay within 93% of budget.
5. NEVER recommend the same product in all 3 slots.
6. Scale hardware dramatically with budget — do NOT give same parts for 100k and 500k builds.
7. For entry budgets under 100k: skip expensive peripherals, maximize core hardware.
8. Include condition: "New", "Used", or "Refurbished".
9. Always include all 9 categories: CPU, GPU, Motherboard, RAM, Storage, PSU, Case, Monitor, Peripherals.

OUTPUT SCHEMA (strictly follow):
{
  "tier": "${tier}",
  "categories": [
    {
      "cat": "CPU",
      "icon": "🔲",
      "options": [
        { "name": "Intel Core i5-13600K", "price": 58000, "condition": "New",  "badge": "RECOMMENDED", "note": "Best gaming IPC" },
        { "name": "AMD Ryzen 5 5600X",    "price": 28000, "condition": "Used", "badge": "BUDGET PICK",  "note": "Great value" },
        { "name": "Intel Core i5-12400F", "price": 35000, "condition": "New",  "badge": "BEST VALUE",   "note": "F-series, no iGPU" }
      ]
    }
  ]
}

Icons: CPU=🔲, GPU=🎮, Motherboard=🧩, RAM=⚡, Storage=💾, PSU=🔌, Case=📦, Monitor=🖥️, Peripherals=🎧`;
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/**
 * Calls Gemini with Google Search grounding for live market data.
 * @param {number} budgetPKR
 * @param {string} purpose  "gaming" | "workstation"
 * @returns {Promise<Object>}
 */
async function contactForgeIntelligenceEngine(budgetPKR, purpose) {
    // Validate API key format before wasting a network call
    if (!FORGE_GEMINI_API_KEY || !FORGE_GEMINI_API_KEY.startsWith("AIza") || FORGE_GEMINI_API_KEY.includes("YOUR_REAL_KEY")) {
        throw new Error("API_KEY_INVALID: Key must start with 'AIza'. Get one at https://aistudio.google.com/app/apikey");
    }

    // Rate limit check
    checkRateLimit();

    const tier = getBudgetTier(budgetPKR);
    const budgetFormatted = budgetPKR.toLocaleString();

    const userPrompt =
        `Generate a complete PC build for a TOTAL budget of ${budgetFormatted} PKR optimized for ${purpose}.\n` +
        `Budget tier: ${tier}.\n` +
        `Search the internet for CURRENT Pakistani market prices (2024-2025) from Daraz.pk, OLX Pakistan, itech.com.pk.\n` +
        `Total of all RECOMMENDED options combined must NOT exceed ${Math.round(budgetPKR * 0.93).toLocaleString()} PKR.\n` +
        `Return ONLY the JSON object, nothing else. No markdown, no backticks, no explanation.`;

    const requestBody = {
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
            // NOTE: responseMimeType is intentionally OMITTED.
            // It is incompatible with the googleSearch grounding tool and causes a
            // 400 INVALID_ARGUMENT error: "responseMimeType is not supported when using tools".
            temperature: 0.3,
            topP: 0.85,
            maxOutputTokens: 4096
        },
        systemInstruction: {
            parts: [{ text: buildSystemInstruction(budgetPKR, purpose) }]
        },
        tools: [{ googleSearch: {} }]
    };

    console.log("[FORGE] Calling Gemini API...", { budgetPKR, purpose, model: FORGE_GEMINI_MODEL });

    const response = await fetch(FORGE_GEMINI_ENDPOINT, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(requestBody)
    });

    console.log("[FORGE] Response status:", response.status);

    if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        console.error("[FORGE] API Error:", errBody);
        throw new Error(`Gemini API error ${response.status}: ${errBody.slice(0, 300)}`);
    }

    const data = await response.json();

    // Extract text from response — googleSearch grounding may add tool_code parts too
    let rawText = "";
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
        if (p.text) { rawText = p.text; break; }
    }

    if (!rawText) {
        console.error("[FORGE] Empty response:", JSON.stringify(data).slice(0, 500));
        throw new Error("Gemini returned empty response.");
    }

    console.log("[FORGE] Raw text (first 200 chars):", rawText.slice(0, 200));

    // Strip markdown fences — the model adds these when responseMimeType is not set
    const cleanText = rawText.trim()
        .replace(/^```(?:json)?\s*/im, "")
        .replace(/\s*```\s*$/m, "")
        .trim();

    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in Gemini response");

    let parsed;
    try {
        parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
        console.error("[FORGE] JSON parse failed. Raw:", cleanText.slice(0, 500));
        throw new Error(`JSON parse failed: ${e.message}`);
    }

    if (!Array.isArray(parsed.categories) || parsed.categories.length === 0) {
        throw new Error("Gemini response missing categories array.");
    }

    console.log("[FORGE] ✓ Success! Categories received:", parsed.categories.length);
    parsed._aiPowered = true;
    return parsed;
}