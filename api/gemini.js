// api/gemini.js — Powered by Groq (drop-in replacement for Gemini)
// Vercel Serverless Function

// ── Rate limiting ────────────────────────────────────────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
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

// ── Input validation ─────────────────────────────────────────────────────────
function validateInput(body) {
  const { budget, usage, preferences, currency, action } = body;
  const allowedActions = ["recommend", "trending", "compare", "explain", "custom"];
  if (action && !allowedActions.includes(action)) return "Invalid action type.";
  if (budget !== undefined) {
    const b = Number(budget);
    if (isNaN(b) || b < 0 || b > 10_000_000) return "Invalid budget value.";
  }
  if (usage && typeof usage !== "string") return "Invalid usage field.";
  if (preferences && typeof preferences !== "object") return "Invalid preferences.";
  if (currency && typeof currency !== "string") return "Invalid currency.";
  return null;
}

// ── Build prompt ─────────────────────────────────────────────────────────────
function buildPrompt(body) {
  const {
    budget       = 0,
    usage        = "general",
    preferences  = {},
    currency     = "PKR",
    action       = "recommend",
    components   = [],
    query        = "",
    customerName = "",
  } = body;

  // Custom prompt pass-through (used by index.html fetchBuildFromGroq)
  if (action === "custom" && body.prompt) {
    return String(body.prompt).slice(0, 8000);
  }

  const safeUsage = String(usage).slice(0, 200);
  const safeQuery = String(query).slice(0, 500);
  const safeName  = String(customerName).slice(0, 100);
  const safePrefs = JSON.stringify(preferences).slice(0, 500);
  const safeComps = JSON.stringify(components).slice(0, 1000);

  if (action === "trending") {
    return `You are FORGE AI, a PC hardware expert for the Pakistani market.
List the top 5 trending PC components in Pakistan right now (2025).
Focus on: GPUs, CPUs, SSDs, RAM, motherboards.
For each item provide: component name, why it's trending, approximate price in PKR.
Respond in JSON format only (no markdown):
{
  "trending": [
    { "name": "...", "reason": "...", "price_pkr": "..." }
  ]
}`;
  }

  if (action === "compare") {
    return `You are FORGE AI, a PC hardware expert for the Pakistani market.
Compare these components: ${safeComps}
Cover: performance benchmarks, price/performance ratio in PKR, best use cases, verdict.
Respond in JSON format only (no markdown):
{
  "comparison": {
    "components": [],
    "verdict": "...",
    "best_for": "..."
  }
}`;
  }

  if (action === "explain") {
    return `You are FORGE AI, a PC hardware expert.
Explain the following in simple terms for a Pakistani buyer: ${safeQuery}
Be concise, practical, and mention Pakistani market context where relevant.
Respond as plain text.`;
  }

  // Default: recommend
  return `You are FORGE AI, an expert PC builder assistant for the Pakistani market.

Customer: ${safeName || "Anonymous"}
Build Budget: ${budget} ${currency}
Primary Usage: ${safeUsage}
Preferences/Constraints: ${safePrefs}

Your task: Recommend a complete PC build optimized for the Pakistani market.
Consider local availability, import prices, and value for money in PKR.

IMPORTANT RULES:
1. Stay strictly within the given budget
2. Prioritize components available in Pakistani markets (Hafeez Centre, local retailers)
3. Prefer value-for-money options
4. Account for Pakistani import duties and market pricing
5. If budget is very low, recommend the best possible build, not empty fields

Respond in this EXACT JSON format only (no markdown, no explanation outside JSON):
{
  "build_name": "...",
  "total_price": ...,
  "currency": "${currency}",
  "tier": "Entry/Mid-Range/High-End/Flagship",
  "components": {
    "cpu":         { "name": "...", "price": ..., "reason": "..." },
    "motherboard": { "name": "...", "price": ..., "reason": "..." },
    "ram":         { "name": "...", "price": ..., "reason": "..." },
    "gpu":         { "name": "...", "price": ..., "reason": "..." },
    "storage":     { "name": "...", "price": ..., "reason": "..." },
    "psu":         { "name": "...", "price": ..., "reason": "..." },
    "case":        { "name": "...", "price": ..., "reason": "..." },
    "cooling":     { "name": "...", "price": ..., "reason": "..." }
  },
  "technician_fee": ...,
  "summary": "...",
  "performance_notes": "...",
  "upgrade_path": "..."
}`;
}

// ── Groq API call ─────────────────────────────────────────────────────────────
async function callGroq(prompt, isJson) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY environment variable is not set.");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: isJson
            ? "You are FORGE AI, a PC hardware expert for Pakistan. Always respond with valid JSON only. No markdown, no explanation outside the JSON object."
            : "You are FORGE AI, a PC hardware expert for Pakistan. Be concise and helpful.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const clientIP =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (isRateLimited(clientIP)) {
    return res.status(429).json({ error: "Too many requests. Please wait a minute." });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON body." });
  }

  const validationError = validateInput(body);
  if (validationError) return res.status(400).json({ error: validationError });

  const action = body.action || "recommend";
  const isJson = action !== "explain";
  const prompt = buildPrompt(body);

  try {
    const rawText = await callGroq(prompt, isJson);

    if (!isJson) return res.status(200).json({ result: rawText });

    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(200).json({ result: rawText, raw: true });
    }

    return res.status(200).json({ result: parsed });

  } catch (err) {
    console.error("FORGE API Error:", err.message);
    if (action === "recommend") {
      return res.status(200).json({ result: getFallbackBuild(body), fallback: true });
    }
    return res.status(500).json({ error: "AI service temporarily unavailable. Please try again." });
  }
};

// ── Fallback build ────────────────────────────────────────────────────────────
function getFallbackBuild(body) {
  const budget   = Number(body.budget) || 80000;
  const currency = body.currency || "PKR";
  return {
    build_name: "FORGE Recommended Build (Offline Mode)",
    total_price: budget,
    currency,
    tier: budget < 80000 ? "Entry" : budget < 150000 ? "Mid-Range" : "High-End",
    components: {
      cpu:         { name: "AMD Ryzen 5 5600",        price: Math.round(budget * 0.22), reason: "Best value CPU for Pakistani market" },
      motherboard: { name: "MSI B550M PRO-VDH",       price: Math.round(budget * 0.12), reason: "Reliable and affordable B550 board" },
      ram:         { name: "16GB DDR4 3200MHz",        price: Math.round(budget * 0.10), reason: "Adequate for most workloads" },
      gpu:         { name: "RX 6600 XT",              price: Math.round(budget * 0.30), reason: "Best 1080p card available in Pakistan" },
      storage:     { name: "1TB NVMe SSD",            price: Math.round(budget * 0.08), reason: "Fast boot and load times" },
      psu:         { name: "650W 80+ Bronze",          price: Math.round(budget * 0.08), reason: "Reliable power with headroom" },
      case:        { name: "Mid-Tower ATX Case",       price: Math.round(budget * 0.06), reason: "Good airflow and build quality" },
      cooling:     { name: "Cooler Master Hyper 212",  price: Math.round(budget * 0.04), reason: "Excellent CPU cooler value" },
    },
    technician_fee: 3000,
    summary: "A balanced build for Pakistani market conditions. All components readily available at Hafeez Centre.",
    performance_notes: "Handles 1080p gaming and everyday productivity tasks well.",
    upgrade_path: "GPU upgrade possible later; CPU socket supports future Ryzen 5000 series.",
  };
}