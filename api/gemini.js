// api/gemini.js — FORGE AI Engine v5.0
// Vercel Serverless Function (Groq + Web Search)

"use strict";

// ── Rate limiting ─────────────────────────────────────────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX    = 10;

function isRateLimited(ip) {
  const now  = Date.now();
  const data = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - data.start > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return false;
  }
  if (data.count >= RATE_LIMIT_MAX) return true;
  data.count++;
  rateLimitMap.set(ip, data);
  return false;
}

// ── Input validation ──────────────────────────────────────────────────────────
function validateInput(body) {
  const { budget, usage, preferences, currency, action } = body;
  const allowedActions = ["recommend", "trending", "compare", "explain", "custom"];
  if (action && !allowedActions.includes(action)) return "Invalid action type.";
  if (budget !== undefined) {
    const b = Number(budget);
    if (isNaN(b) || b < 0 || b > 10_000_000) return "Invalid budget value.";
  }
  if (usage    && typeof usage    !== "string") return "Invalid usage field.";
  if (currency && typeof currency !== "string") return "Invalid currency.";
  if (preferences && typeof preferences !== "object") return "Invalid preferences.";
  return null;
}

// ── Budget tier helper ────────────────────────────────────────────────────────
function getBudgetTier(budgetPKR) {
  if (budgetPKR <  80_000) return "Entry-Level";
  if (budgetPKR < 150_000) return "Budget";
  if (budgetPKR < 300_000) return "Mid-Range";
  if (budgetPKR < 600_000) return "High-End";
  if (budgetPKR < 1_200_000) return "Enthusiast";
  return "Flagship";
}

// ── Web search query builder ──────────────────────────────────────────────────
function buildSearchQueries(budgetPKR, usage, currency) {
  const tier = getBudgetTier(budgetPKR);
  const isPKR = currency === "PKR";
  const market = isPKR ? "Pakistan Hafeez Centre" : "current market";

  return [
    `best ${tier} gaming CPU ${market} price 2025`,
    `best ${tier} gaming GPU ${market} price 2025`,
    `${tier} PC build components price ${market} 2025`,
    `${usage} PC build ${tier} budget components 2025`,
    `gaming monitor keyboard mouse ${tier} budget ${market} 2025`
  ];
}

// ── Build main recommendation prompt ─────────────────────────────────────────
function buildRecommendPrompt(body) {
  const {
    budget       = 0,
    usage        = "gaming",
    preferences  = {},
    currency     = "PKR",
    customerName = "",
    searchResults = "",
  } = body;

  const tier       = getBudgetTier(Number(budget));
  const safeName   = String(customerName).slice(0, 100);
  const safeUsage  = String(usage).slice(0, 200);
  const safePrefs  = JSON.stringify(preferences).slice(0, 500);
  const isPKR      = currency === "PKR";
  const marketNote = isPKR
    ? "Pakistani market (Hafeez Centre Lahore, local importers). Account for import duties, dollar rate volatility."
    : `${currency} market. Use accurate current regional pricing.`;

  const highBudgetNote = Number(budget) >= 1_000_000
    ? `PREMIUM BUDGET RULE: Budget is over 1,000,000 PKR. You MUST recommend flagship components only: top-tier CPU, flagship GPU, premium motherboard, high-end cooling, platinum/titanium PSU, premium NVMe. Do NOT leave significant budget unused — allocate it meaningfully across premium components, peripherals, and storage.`
    : `Maximize performance within budget. No bottlenecks. Balanced allocation.`;

  const usageAlloc = safeUsage.toLowerCase().includes("gaming")
    ? "Prioritize GPU (30-40% of budget). Then CPU. Then RAM/storage."
    : safeUsage.toLowerCase().includes("video") || safeUsage.toLowerCase().includes("3d") || safeUsage.toLowerCase().includes("render")
    ? "Prioritize CPU cores and RAM. GPU for CUDA/OpenCL where beneficial."
    : "Balanced allocation across CPU, GPU, and RAM for mixed productivity/gaming.";

  const searchContext = searchResults
    ? `\n\nLIVE MARKET DATA (use these prices as reference — cross-check for accuracy):\n${searchResults.slice(0, 3000)}\n`
    : "";

  return `You are FORGE AI, a PC hardware expert for the ${marketNote}

Customer: ${safeName || "Anonymous"}
Budget: ${budget} ${currency}
Budget Tier: ${tier}
Primary Usage: ${safeUsage}
Preferences: ${safePrefs}
${searchContext}
${highBudgetNote}
${usageAlloc}

CRITICAL RULES:
1. Stay within the given budget total (components + peripherals combined).
2. ALL prices must reflect CURRENT 2025 market rates for the ${currency} region.
3. For PKR: check Hafeez Centre / local Pakistan prices. For USD: use Newegg/Amazon US.
4. No fake, fabricated, or wildly outdated prices.
5. For each component category provide EXACTLY 3 options: RECOMMENDED, BUDGET PICK, BEST VALUE (or PREMIUM for high budgets).
6. For gaming performance: use real benchmark data only. State estimates as ranges. Never guarantee FPS.
7. Include peripherals (keyboard, mouse, headphones, monitor) scaled to budget.

Respond in this EXACT JSON format — no markdown, no text outside the JSON:

{
  "build_name": "FORGE [Tier] Build — [Usage]",
  "tier": "${tier}",
  "currency": "${currency}",
  "total_budget": ${budget},
  "categories": [
    {
      "cat": "CPU",
      "icon": "🔲",
      "options": [
        { "name": "...", "price": 0, "condition": "New|Used|Refurbished", "badge": "RECOMMENDED", "note": "brief reason" },
        { "name": "...", "price": 0, "condition": "New", "badge": "BUDGET PICK", "note": "..." },
        { "name": "...", "price": 0, "condition": "New", "badge": "BEST VALUE", "note": "..." }
      ]
    },
    { "cat": "GPU",         "icon": "🎮", "options": [{...},{...},{...}] },
    { "cat": "Motherboard", "icon": "🧩", "options": [{...},{...},{...}] },
    { "cat": "RAM",         "icon": "⚡", "options": [{...},{...},{...}] },
    { "cat": "Storage",     "icon": "💾", "options": [{...},{...},{...}] },
    { "cat": "PSU",         "icon": "🔌", "options": [{...},{...},{...}] },
    { "cat": "Cooling",     "icon": "❄️", "options": [{...},{...},{...}] },
    { "cat": "Case",        "icon": "📦", "options": [{...},{...},{...}] },
    { "cat": "Monitor",     "icon": "🖥️", "options": [{...},{...},{...}] },
    { "cat": "Keyboard",    "icon": "⌨️", "options": [{...},{...},{...}] },
    { "cat": "Mouse",       "icon": "🖱️", "options": [{...},{...},{...}] },
    { "cat": "Headphones",  "icon": "🎧", "options": [{...},{...},{...}] }
  ],
  "assembly_fee": 3500,
  "gaming_performance": {
    "note": "Estimates based on benchmark databases. Actual performance varies by settings, drivers, and in-game conditions.",
    "resolution": "1080p|1440p|4K",
    "games": [
      { "title": "Valorant",           "preset": "High",   "avg_fps": "...", "low1_fps": "..." },
      { "title": "Counter-Strike 2",   "preset": "High",   "avg_fps": "...", "low1_fps": "..." },
      { "title": "GTA V",              "preset": "Ultra",  "avg_fps": "...", "low1_fps": "..." },
      { "title": "Call of Duty (MW3)", "preset": "High",   "avg_fps": "...", "low1_fps": "..." },
      { "title": "Fortnite",           "preset": "Epic",   "avg_fps": "...", "low1_fps": "..." },
      { "title": "Apex Legends",       "preset": "High",   "avg_fps": "...", "low1_fps": "..." },
      { "title": "Cyberpunk 2077",     "preset": "High",   "avg_fps": "...", "low1_fps": "..." },
      { "title": "RE4 Remake",         "preset": "High",   "avg_fps": "...", "low1_fps": "..." },
      { "title": "Forza Horizon 5",    "preset": "Ultra",  "avg_fps": "...", "low1_fps": "..." },
      { "title": "Days Gone",          "preset": "Ultra",  "avg_fps": "...", "low1_fps": "..." }
    ]
  },
  "summary": "2-3 sentence build summary",
  "upgrade_path": "future upgrade recommendation"
}`;
}

// ── Build other action prompts ─────────────────────────────────────────────────
function buildPrompt(body) {
  const {
    budget      = 0,
    currency    = "PKR",
    action      = "recommend",
    components  = [],
    query       = "",
  } = body;

  // Custom pass-through
  if (action === "custom" && body.prompt) {
    return { prompt: String(body.prompt).slice(0, 8000), isJson: false };
  }

  if (action === "trending") {
    return {
      isJson: true,
      prompt: `You are FORGE AI, a PC hardware expert for the Pakistani market.
List the top 5 trending PC components in Pakistan right now (2025).
Focus on: GPUs, CPUs, SSDs, RAM, motherboards.
For each item provide: component name, why it's trending, approximate price in PKR.
Respond in JSON only (no markdown):
{"trending":[{"name":"...","reason":"...","price_pkr":"..."}]}`
    };
  }

  if (action === "compare") {
    const safeComps = JSON.stringify(components).slice(0, 1000);
    return {
      isJson: true,
      prompt: `You are FORGE AI, a PC hardware expert for the Pakistani market.
Compare these components: ${safeComps}
Cover: performance benchmarks, price/performance ratio in PKR, best use cases, verdict.
Respond in JSON only (no markdown):
{"comparison":{"components":[],"verdict":"...","best_for":"..."}}`
    };
  }

  if (action === "explain") {
    const safeQuery = String(query).slice(0, 500);
    return {
      isJson: false,
      prompt: `You are FORGE AI, a PC hardware expert.
Explain the following in simple terms for a Pakistani buyer: ${safeQuery}
Be concise, practical, and mention Pakistani market context where relevant.
Respond as plain text.`
    };
  }

  // Default: recommend (handled separately with web search)
  return { isJson: true, prompt: buildRecommendPrompt(body) };
}

// ── Web search via Groq (Compound-beta) ───────────────────────────────────────
async function fetchLivePrices(queries, apiKey) {
  try {
    const searchPrompt = `Search for current 2025 PC component prices in Pakistan (PKR) and global markets.
Queries: ${queries.join(" | ")}
Return a concise summary of current prices found, with component names and approximate PKR prices.
Be specific with model names and prices.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        model: "compound-beta",          // Groq's web-search enabled model
        messages: [
          {
            role: "system",
            content: "You are a PC hardware price researcher. Search the web for current component prices and summarize them accurately. Be specific about PKR prices in Pakistan market (Hafeez Centre) and USD global market prices."
          },
          { role: "user", content: searchPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) return "";       // graceful degradation
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch {
    return "";                          // always degrade gracefully
  }
}

// ── Primary Groq call ─────────────────────────────────────────────────────────
async function callGroq(prompt, isJson, apiKey) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      model:    "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: isJson
            ? "You are FORGE AI, a PC hardware expert for Pakistan. Always respond with valid JSON only. No markdown fences, no explanation outside the JSON object."
            : "You are FORGE AI, a PC hardware expert for Pakistan. Be concise and helpful.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens:  3000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ── Main Vercel handler ───────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Rate limiting
  const clientIP =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (isRateLimited(clientIP)) {
    return res.status(429).json({ error: "Too many requests. Please wait a minute." });
  }

  // Parse body
  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON body." });
  }

  // Validate
  const validationError = validateInput(body);
  if (validationError) return res.status(400).json({ error: validationError });

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "Server configuration error." });
  }

  const action = body.action || "recommend";

  // For recommend action: fetch live prices first, inject into prompt
  if (action === "recommend") {
    try {
      const queries       = buildSearchQueries(Number(body.budget), body.usage || "gaming", body.currency || "PKR");
      const searchResults = await fetchLivePrices(queries, GROQ_API_KEY);
      body.searchResults  = searchResults;                    // inject into prompt builder
    } catch {
      // Non-fatal: continue without live search
    }

    const prompt = buildRecommendPrompt(body);

    try {
      const rawText = await callGroq(prompt, true, GROQ_API_KEY);
      const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        // Return raw for client-side fallback
        return res.status(200).json({ result: rawText, raw: true });
      }

      return res.status(200).json({ result: parsed, live_prices: !!body.searchResults });

    } catch (err) {
      console.error("FORGE recommend error:", err.message);
      return res.status(200).json({ result: getFallbackBuild(body), fallback: true });
    }
  }

  // Other actions
  const { prompt, isJson } = buildPrompt(body);

  try {
    const rawText = await callGroq(prompt, isJson, GROQ_API_KEY);

    if (!isJson) return res.status(200).json({ result: rawText });

    const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(200).json({ result: rawText, raw: true });
    }

    return res.status(200).json({ result: parsed });

  } catch (err) {
    console.error("FORGE API error:", err.message);
    return res.status(500).json({ error: "AI service temporarily unavailable. Please try again." });
  }
};

// ── Fallback build (used when API fails completely) ───────────────────────────
function getFallbackBuild(body) {
  const budget   = Number(body.budget) || 80_000;
  const currency = body.currency || "PKR";
  const tier     = getBudgetTier(budget);

  const mk = (cat, icon, rec, budg, val) => ({
    cat, icon,
    options: [
      { name: rec[0],  price: rec[1],  condition: "New",  badge: "RECOMMENDED", note: rec[2]  },
      { name: budg[0], price: budg[1], condition: "New",  badge: "BUDGET PICK", note: budg[2] },
      { name: val[0],  price: val[1],  condition: "New",  badge: "BEST VALUE",  note: val[2]  },
    ]
  });

  const isHigh = budget >= 600_000;
  const isMid  = budget >= 250_000;

  const categories = [
    mk("CPU", "🔲",
      isHigh ? ["AMD Ryzen 9 9950X", 170000, "Zen 5 flagship"] : isMid ? ["AMD Ryzen 7 7700X", 80000, "AM5 8-core"] : ["AMD Ryzen 5 5600", 32000, "Best AM4 value"],
      isHigh ? ["Intel Core i9-13900K", 115000, "Strong gaming IPC"] : isMid ? ["Intel Core i5-13600K", 58000, "Excellent IPC"] : ["Intel Core i3-12100F", 22000, "Entry gaming"],
      isHigh ? ["AMD Ryzen 9 7950X3D", 185000, "3D V-Cache beast"] : isMid ? ["AMD Ryzen 5 7600X", 55000, "AM5 budget"] : ["AMD Ryzen 5 5500", 25000, "Budget Zen 3"]
    ),
    mk("GPU", "🎮",
      isHigh ? ["NVIDIA RTX 4090 24GB", 350000, "Absolute 4K king"] : isMid ? ["NVIDIA RTX 4070 12GB", 105000, "1440p champion"] : ["NVIDIA RTX 3060 12GB", 62000, "1080p/1440p sweet spot"],
      isHigh ? ["NVIDIA RTX 5080 16GB", 300000, "New gen Ada"] : isMid ? ["AMD RX 7800 XT 16GB", 90000, "AMD 1440p value"] : ["AMD RX 6700 XT Used", 45000, "Great used deal"],
      isHigh ? ["AMD RX 7900 XTX 24GB", 280000, "AMD flagship"] : isMid ? ["NVIDIA RTX 3080 Used", 90000, "Still capable"] : ["NVIDIA GTX 1660 Super", 42000, "1080p workhorse"]
    ),
    mk("Motherboard", "🧩",
      isHigh ? ["ASUS ROG STRIX X670E-F", 55000, "AM5 flagship board"] : isMid ? ["MSI MAG B550 TOMAHAWK", 28000, "Top B550"] : ["MSI B550M PRO-VDH", 18000, "Solid B550"],
      isHigh ? ["Gigabyte X670 AORUS Elite", 45000, "Good AM5 value"] : isMid ? ["ASUS PRIME B550-A", 22000, "Reliable choice"] : ["Gigabyte B450M Gaming", 12000, "Entry AM4"],
      isHigh ? ["MSI MEG X670E ACE", 65000, "OC king"] : isMid ? ["Gigabyte B550 AORUS Elite", 25000, "Good VRMs"] : ["ASUS PRIME B550M-A", 16000, "Feature-rich"]
    ),
    mk("RAM", "⚡",
      isHigh ? ["64GB DDR5-6000 G.Skill Trident Z5", 85000, "DDR5 speed kit"] : isMid ? ["32GB DDR4 3600MHz Corsair Vengeance", 22000, "Gaming sweet spot"] : ["16GB DDR4 3200MHz (2×8GB)", 9500, "Dual channel"],
      isHigh ? ["32GB DDR5-5200 Corsair Dominator", 55000, "Reliable DDR5"] : isMid ? ["16GB DDR4 3600MHz G.Skill", 12000, "Adequate"] : ["8GB DDR4 2666MHz", 4500, "Minimal"],
      isHigh ? ["64GB DDR5-5600 Kingston Fury", 65000, "Massive capacity"] : isMid ? ["32GB DDR4 3200MHz TeamGroup", 19000, "Budget 32GB"] : ["16GB DDR4 TeamGroup", 8500, "Good brand"]
    ),
    mk("Storage", "💾",
      isHigh ? ["2TB Samsung 990 Pro NVMe PCIe 4.0", 32000, "Flagship SSD"] : isMid ? ["1TB Samsung 980 Pro NVMe", 18000, "Top-tier speed"] : ["512GB NVMe M.2 SSD", 7500, "Fast boot drive"],
      isHigh ? ["1TB WD Black SN850X + 2TB HDD", 28000, "Speed + bulk"] : isMid ? ["1TB WD Black SN770", 14000, "Fast & affordable"] : ["256GB SATA SSD", 4500, "Minimal"],
      isHigh ? ["4TB Seagate FireCuda 530 PCIe 4.0", 48000, "4TB NVMe"] : isMid ? ["2TB Crucial P3 Plus NVMe", 22000, "Spacious"] : ["1TB HDD + 120GB SSD Combo", 6500, "Hybrid approach"]
    ),
    mk("PSU", "🔌",
      isHigh ? ["1000W 80+ Platinum Seasonic Prime", 28000, "4090-ready"] : isMid ? ["750W 80+ Gold Seasonic Focus", 16000, "Gold efficiency"] : ["550W 80+ Bronze Seasonic", 8000, "Reliable"],
      isHigh ? ["850W 80+ Gold ASUS ROG Thor", 24000, "OLED meter"] : isMid ? ["850W 80+ Gold EVGA SuperNOVA", 19000, "Headroom"] : ["500W 80+ Bronze Generic", 5500, "Basic"],
      isHigh ? ["1000W 80+ Gold EVGA SuperNOVA P6", 22000, "Gold 1kW"] : isMid ? ["700W 80+ Bronze Cooler Master", 12000, "Budget pick"] : ["450W Corsair CX450", 7000, "Trusted brand"]
    ),
    mk("Cooling", "❄️",
      isHigh ? ["360mm AIO Liquid Cooler NZXT Kraken", 28000, "360mm performance"] : isMid ? ["240mm AIO Cooler Master ML240L", 14000, "240mm AIO"] : ["Cooler Master Hyper 212 Black", 5000, "Reliable air cooler"],
      isHigh ? ["Noctua NH-D15 Chromax", 22000, "Best air cooler"] : isMid ? ["DeepCool AK620", 10000, "Excellent air cooler"] : ["Cooler Master Hyper 212 EVO", 4000, "Budget classic"],
      isHigh ? ["Arctic Liquid Freezer II 360", 24000, "Great price/perf"] : isMid ? ["be quiet! Pure Rock 2", 8000, "Silent cooling"] : ["Stock Cooler / Generic 120mm", 1500, "Budget option"]
    ),
    mk("Case", "📦",
      isHigh ? ["Lian Li PC-O11 Dynamic EVO", 22000, "Showcase build"] : isMid ? ["Lian Li LANCOOL 205 MESH", 12000, "Best airflow"] : ["Deepcool MATREXX 30", 4000, "Good airflow"],
      isHigh ? ["Fractal Design Torrent", 25000, "Best thermals"] : isMid ? ["Fractal Design Meshify C", 14000, "Quiet & cool"] : ["Basic ATX Mid Tower", 2500, "Bare minimum"],
      isHigh ? ["NZXT H9 Flow", 20000, "Premium layout"] : isMid ? ["Corsair 4000D Airflow", 13000, "Premium airflow"] : ["Antec NX200", 3500, "Decent airflow"]
    ),
    mk("Monitor", "🖥️",
      isHigh ? ["27in QHD 240Hz OLED LG UltraGear", 85000, "OLED gaming"] : isMid ? ["27in QHD 165Hz IPS Monitor", 38000, "1440p gaming"] : ["24in FHD 144Hz IPS Monitor", 18000, "144Hz gaming"],
      isHigh ? ["32in 4K 144Hz IPS Monitor", 75000, "True 4K"] : isMid ? ["24in FHD 240Hz IPS Monitor", 28000, "High refresh"] : ["24in FHD 75Hz VA Monitor", 12000, "Good colors"],
      isHigh ? ["27in QHD 165Hz IPS Dell S2722DGM", 45000, "Budget 1440p"] : isMid ? ["27in QHD 144Hz VA Monitor", 30000, "Great contrast"] : ["27in FHD 144Hz Monitor", 22000, "Bigger screen"]
    ),
    mk("Keyboard", "⌨️",
      isHigh ? ["Corsair K95 RGB Platinum Mechanical", 28000, "Premium gaming KB"] : isMid ? ["SteelSeries Apex 3 TKL", 8000, "Quiet gaming switches"] : ["Redragon K552 Mechanical", 2800, "Budget mech"],
      isHigh ? ["Razer BlackWidow V4 Pro", 32000, "Premium wireless"] : isMid ? ["Logitech G213 Prodigy", 6000, "Gaming membrane"] : ["Logitech K120 Wired", 1500, "Ultra budget"],
      isHigh ? ["Wooting 60HE Analog", 45000, "Analog hall-effect"] : isMid ? ["HyperX Alloy Core", 5500, "Solid value"] : ["A4Tech Bloody B150N", 2500, "Entry gaming"]
    ),
    mk("Mouse", "🖱️",
      isHigh ? ["Logitech G Pro X Superlight 2", 18000, "Pro esports mouse"] : isMid ? ["Logitech G502 X Plus", 8500, "Feature-rich"] : ["Logitech G203 Lightsync", 2500, "Entry gaming"],
      isHigh ? ["Razer DeathAdder V3 HyperSpeed", 15000, "Wireless precision"] : isMid ? ["SteelSeries Rival 3", 4500, "Reliable sensor"] : ["A4Tech OP-330 Optical", 800, "Budget option"],
      isHigh ? ["Finalmouse Starlight-12", 25000, "Featherweight"] : isMid ? ["Razer Basilisk X HyperSpeed", 6000, "Wireless value"] : ["Redragon M711 Cobra", 1800, "Value pick"]
    ),
    mk("Headphones", "🎧",
      isHigh ? ["SteelSeries Arctis Nova Pro Wireless", 38000, "Premium wireless"] : isMid ? ["HyperX Cloud Alpha S", 10000, "Excellent sound"] : ["HyperX Cloud Stinger", 4500, "Entry gaming"],
      isHigh ? ["Sony WH-1000XM5", 55000, "Audiophile ANC"] : isMid ? ["Logitech G433", 7000, "7.1 surround"] : ["Redragon H510 Zeus", 2800, "Budget option"],
      isHigh ? ["Astro A50 X Wireless", 45000, "Flagship console+PC"] : isMid ? ["SteelSeries Arctis 7P", 12000, "Wireless value"] : ["Corsair HS35 Stereo", 3500, "Comfortable"]
    ),
  ];

  const gaming_performance = {
    note: "Estimated performance based on typical benchmark data for this tier. Actual FPS depends on settings, drivers, and hardware.",
    resolution: budget >= 600000 ? "4K" : budget >= 250000 ? "1440p" : "1080p",
    games: budget >= 600000
      ? [
          { title: "Valorant",           preset: "Ultra",  avg_fps: "300-400+", low1_fps: "250+" },
          { title: "Counter-Strike 2",   preset: "Very High", avg_fps: "250-350", low1_fps: "180+" },
          { title: "GTA V",              preset: "Ultra",  avg_fps: "100-140",  low1_fps: "80+" },
          { title: "Call of Duty (MW3)", preset: "Ultra",  avg_fps: "150-200",  low1_fps: "110+" },
          { title: "Fortnite",           preset: "Epic",   avg_fps: "120-160",  low1_fps: "90+" },
          { title: "Apex Legends",       preset: "High",   avg_fps: "150-200",  low1_fps: "110+" },
          { title: "Cyberpunk 2077",     preset: "Ultra+RT", avg_fps: "80-120", low1_fps: "60+" },
          { title: "RE4 Remake",         preset: "Ultra",  avg_fps: "120-160",  low1_fps: "90+" },
          { title: "Forza Horizon 5",    preset: "Ultra",  avg_fps: "100-130",  low1_fps: "80+" },
          { title: "Days Gone",          preset: "Ultra",  avg_fps: "100-130",  low1_fps: "80+" },
        ]
      : budget >= 250000
      ? [
          { title: "Valorant",           preset: "High",  avg_fps: "200-300", low1_fps: "150+" },
          { title: "Counter-Strike 2",   preset: "High",  avg_fps: "165-200", low1_fps: "120+" },
          { title: "GTA V",              preset: "High",  avg_fps: "80-100",  low1_fps: "60+" },
          { title: "Call of Duty (MW3)", preset: "High",  avg_fps: "100-130", low1_fps: "75+" },
          { title: "Fortnite",           preset: "High",  avg_fps: "90-120",  low1_fps: "65+" },
          { title: "Apex Legends",       preset: "High",  avg_fps: "120-165", low1_fps: "90+" },
          { title: "Cyberpunk 2077",     preset: "High",  avg_fps: "55-70",   low1_fps: "40+" },
          { title: "RE4 Remake",         preset: "High",  avg_fps: "80-100",  low1_fps: "60+" },
          { title: "Forza Horizon 5",    preset: "Ultra", avg_fps: "75-100",  low1_fps: "55+" },
          { title: "Days Gone",          preset: "High",  avg_fps: "75-95",   low1_fps: "55+" },
        ]
      : [
          { title: "Valorant",           preset: "High",   avg_fps: "144-200", low1_fps: "100+" },
          { title: "Counter-Strike 2",   preset: "Medium", avg_fps: "100-144", low1_fps: "75+" },
          { title: "GTA V",              preset: "High",   avg_fps: "60-80",   low1_fps: "45+" },
          { title: "Call of Duty (MW3)", preset: "Medium", avg_fps: "75-100",  low1_fps: "55+" },
          { title: "Fortnite",           preset: "High",   avg_fps: "75-100",  low1_fps: "55+" },
          { title: "Apex Legends",       preset: "High",   avg_fps: "90-120",  low1_fps: "65+" },
          { title: "Cyberpunk 2077",     preset: "Medium", avg_fps: "40-55",   low1_fps: "30+" },
          { title: "RE4 Remake",         preset: "High",   avg_fps: "60-80",   low1_fps: "45+" },
          { title: "Forza Horizon 5",    preset: "High",   avg_fps: "60-80",   low1_fps: "45+" },
          { title: "Days Gone",          preset: "High",   avg_fps: "55-75",   low1_fps: "40+" },
        ]
  };

  return {
    build_name: `FORGE ${tier} Build (Offline Mode)`,
    tier,
    currency,
    total_budget: budget,
    categories,
    assembly_fee: 3500,
    gaming_performance,
    summary: `Balanced ${tier} build for the ${currency} market. All components available at Hafeez Centre or major local retailers. Assembly included.`,
    upgrade_path: "Upgrade GPU first for gaming; add RAM or faster storage for productivity gains.",
    fallback: true,
  };
}