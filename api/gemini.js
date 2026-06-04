/**
 * FORGE — GEMINI INTELLIGENCE DISPATCH MODULE v4.0
 * Live internet search + multi-currency + budget-aware builds + 3 options per category
 */

"use strict";

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const FORGE_GEMINI_MODEL = "gemini-2.0-flash-lite";
const FORGE_GEMINI_API_KEY = "AQ.Ab8RN6JATzigRoap7QQ6h5_ByRyH2jWlQ-lT0dGW05MQYVHrSQ";
const FORGE_GEMINI_ENDPOINT =
    `https://generativelanguage.googleapis.com/v1beta/models/${FORGE_GEMINI_MODEL}:generateContent?key=${FORGE_GEMINI_API_KEY}`;

// ─── CURRENCY CONFIG ─────────────────────────────────────────────────────────

const CURRENCIES = {
    PKR: { symbol: "Rs",  name: "Pakistani Rupee",     rate: 1        },
    USD: { symbol: "$",   name: "US Dollar",           rate: 0.0036   },
    EUR: { symbol: "€",   name: "Euro",                rate: 0.0033   },
    GBP: { symbol: "£",   name: "British Pound",       rate: 0.0028   },
    AED: { symbol: "د.إ", name: "UAE Dirham",          rate: 0.0131   },
    SAR: { symbol: "ر.س", name: "Saudi Riyal",         rate: 0.0134   },
    CAD: { symbol: "C$",  name: "Canadian Dollar",     rate: 0.0049   },
    AUD: { symbol: "A$",  name: "Australian Dollar",   rate: 0.0055   }
};

let activeCurrency = "PKR";

function setActiveCurrency(code) {
    if (CURRENCIES[code]) activeCurrency = code;
}

function getActiveCurrency() {
    return activeCurrency;
}

/**
 * Convert a PKR value to the currently active currency.
 * @param {number} pkrAmount
 * @returns {number}
 */
function convertFromPKR(pkrAmount) {
    const rate = CURRENCIES[activeCurrency]?.rate ?? 1;
    return pkrAmount * rate;
}

/**
 * Convert an amount in the active currency back to PKR.
 * @param {number} amount
 * @returns {number}
 */
function convertToPKR(amount) {
    const rate = CURRENCIES[activeCurrency]?.rate ?? 1;
    return Math.round(amount / rate);
}

/**
 * Format a PKR value in the current currency.
 * @param {number} pkrAmount
 * @returns {string}
 */
function formatPrice(pkrAmount) {
    const cur  = CURRENCIES[activeCurrency];
    const val  = convertFromPKR(pkrAmount);
    const opts = { minimumFractionDigits: 0, maximumFractionDigits: 0 };
    return `${cur.symbol}${val.toLocaleString(undefined, opts)}`;
}

/**
 * Format a raw value that is already in the active currency.
 * @param {number} currencyAmount
 * @returns {string}
 */
function formatRaw(currencyAmount) {
    const cur  = CURRENCIES[activeCurrency];
    const opts = { minimumFractionDigits: 0, maximumFractionDigits: 0 };
    return `${cur.symbol}${currencyAmount.toLocaleString(undefined, opts)}`;
}

// ─── TIER DETECTION ──────────────────────────────────────────────────────────

function getBudgetTier(budgetPKR) {
    if (budgetPKR <  80000)  return "entry";
    if (budgetPKR < 200000)  return "budget";
    if (budgetPKR < 400000)  return "mid-range";
    if (budgetPKR < 700000)  return "high-end";
    if (budgetPKR < 1200000) return "enthusiast";
    return "flagship";
}

// ─── SYSTEM INSTRUCTION ──────────────────────────────────────────────────────

function buildSystemInstruction(budgetPKR, purpose) {
    const tier = getBudgetTier(budgetPKR);

    const allocationGuide = purpose === "gaming"
        ? `GPU: 35-45%, CPU: 20-25%, Motherboard: 8-12%, RAM: 5-10%, Storage: 5-10%, PSU: 5-8%, Case: 2-5%, remaining for peripherals (monitor, keyboard, mouse, headset).`
        : `CPU: 30-35%, GPU: 15-20%, Motherboard: 10-12%, RAM: 10-15%, Storage: 8-12%, PSU: 5-8%, Case: 2-5%, remaining for peripherals.`;

    const tierGuidance = {
        entry:      "Entry-level (low budget): Prioritize strong CPU, GPU, RAM, Storage. Use basic or no case. Skip expensive peripherals entirely if needed. Every rupee counts.",
        budget:     "Budget build: Solid mid-entry components. AMD or Intel budget CPUs. GTX 1660 / RX 6600 class GPU. Functional case and basic peripherals.",
        "mid-range":"Mid-range (300k-400k PKR): RTX 3060/3060 Ti / RX 6700 XT class. Ryzen 5 5600X / i5-12600K CPU tier. Good quality case, decent peripherals.",
        "high-end":  "High-end (400k-700k PKR): RTX 3080 Used / RTX 3080 Ti Used / RTX 4070 New / RTX 5060 New. Ryzen 7 5800X3D / i7-12700K class. Quality peripherals including a 144Hz+ monitor.",
        enthusiast: "Enthusiast (700k-1.2M PKR): RTX 4080 / RTX 4070 Ti / RTX 5070 class. Ryzen 9 7900X / i9-13900K. Premium peripherals, 1440p 165Hz+ monitor.",
        flagship:   "Flagship (1.2M+ PKR): RTX 5090 / RTX 4090 / RTX 5080 class. Ryzen 9 9950X / i9-14900K / Threadripper. Ultra-premium everything, 4K 144Hz+ display, premium peripherals."
    };

    return `You are FORGE, an elite AI PC hardware analyst with access to live internet pricing data.
Your task: generate a complete PC build recommendation list from REAL, CURRENT Pakistani market prices (2024–2025).
Budget tier: ${tier.toUpperCase()} — ${tierGuidance[tier]}

BUDGET ALLOCATION for ${purpose}: ${allocationGuide}

CRITICAL RULES:
1. Return ONLY raw JSON — no markdown, no backticks, no preamble.
2. Provide EXACTLY 3 options per category (New, Used/Alternative, Best Value).
3. All prices in PKR based on real Pakistani market rates.
4. Total of recommended selections must stay within 95% of the budget.
5. NEVER recommend the same product in all 3 slots.
6. Scale hardware dramatically with budget — do NOT give same parts for 100k and 500k builds.
7. For entry budgets under 100k: skip expensive peripherals, maximize core hardware.
8. Include condition: "New", "Used", or "Refurbished".
9. For flagship budgets over 1.2M: after core build, allocate remaining to ultra-premium peripherals.
10. Always include all 9 categories: CPU, GPU, Motherboard, RAM, Storage, PSU, Case, Monitor, Peripherals.

OUTPUT SCHEMA (strictly follow):
{
  "tier": "${tier}",
  "categories": [
    {
      "cat": "CPU",
      "icon": "🔲",
      "options": [
        { "name": "Intel Core i5-13600K", "price": 58000, "condition": "New",  "badge": "RECOMMENDED", "note": "Best gaming IPC" },
        { "name": "AMD Ryzen 5 5600X Used", "price": 28000, "condition": "Used", "badge": "BUDGET PICK", "note": "Great value" },
        { "name": "Intel Core i5-12400F", "price": 35000, "condition": "New", "badge": "BEST VALUE", "note": "F-series, no iGPU" }
      ]
    },
    ... (GPU, Motherboard, RAM, Storage, PSU, Case, Monitor, Peripherals)
  ]
}

ICONS per category: CPU=🔲, GPU=🎮, Motherboard=🧩, RAM=⚡, Storage=💾, PSU=🔌, Case=📦, Monitor=🖥️, Peripherals=🎧`;
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/**
 * Calls Gemini with Google Search grounding for live market data.
 * @param {number} budgetPKR
 * @param {string} purpose
 * @returns {Promise<Object>}
 */
async function contactForgeIntelligenceEngine(budgetPKR, purpose) {
    if (!FORGE_GEMINI_API_KEY || FORGE_GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
        throw new Error("API_KEY_NOT_SET");
    }

    const tier = getBudgetTier(budgetPKR);
    const budgetFormatted = budgetPKR.toLocaleString();

    const userPrompt =
        `Generate a complete PC build for a TOTAL budget of ${budgetFormatted} PKR optimized for ${purpose}.\n` +
        `Budget tier: ${tier}.\n` +
        `Search the internet for CURRENT Pakistani market prices (2024-2025).\n` +
        `Include used/refurbished options where they provide better value.\n` +
        `Total of all RECOMMENDED options combined must NOT exceed ${Math.round(budgetPKR * 0.93).toLocaleString()} PKR.\n` +
        `Provide 3 realistic options per category scaled appropriately to this ${tier} budget.\n` +
        `For Used options, use prices from OLX Pakistan or Daraz Pakistan.\n` +
        `Return ONLY the JSON object, nothing else.`;

    const requestBody = {
        contents: [
            { parts: [{ text: userPrompt }] }
        ],
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
            topP: 0.85
        },
        systemInstruction: {
            parts: [{ text: buildSystemInstruction(budgetPKR, purpose) }]
        },
        tools: [{ googleSearch: {} }]
    };

    const response = await fetch(FORGE_GEMINI_ENDPOINT, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        throw new Error(`Gemini API error ${response.status}: ${errBody.slice(0, 300)}`);
    }

    const data = await response.json();

    // Extract text from Gemini response — search grounding may produce tool_code parts too
    let rawText = "";
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
        if (p.text) { rawText = p.text; break; }
    }

    if (!rawText) throw new Error("Gemini returned empty response.");

    // Strip any stray markdown fences
    const cleanText = rawText
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

    let parsed;
    try {
        parsed = JSON.parse(cleanText);
    } catch (e) {
        throw new Error(`Failed to parse Gemini JSON: ${e.message}\nRaw: ${cleanText.slice(0, 300)}`);
    }

    if (!Array.isArray(parsed.categories) || parsed.categories.length === 0) {
        throw new Error("Gemini response missing categories array.");
    }

    return parsed;
}
