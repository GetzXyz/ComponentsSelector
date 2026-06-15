// api/priceSearch.js
// Fetches real PK retail price snippets via Serper, cached per budget tier
// to stay well within free-tier search quotas.

const SERPER_URL = "https://google.serper.dev/search";

// In-memory cache. Resets on cold start, but Vercel functions stay warm
// for a while under normal traffic, so this still cuts most repeat searches.
const marketCache = new Map(); // tier -> { data, timestamp }
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const CATEGORY_QUERY_TEMPLATES = {
  CPU:         "{TIER} CPU processor price Pakistan Daraz",
  GPU:         "{TIER} graphics card GPU price Pakistan Daraz",
  Motherboard: "{TIER} motherboard price Pakistan Daraz",
  RAM:         "{TIER} DDR4 DDR5 RAM kit price Pakistan Daraz",
  Storage:     "{TIER} SSD NVMe price Pakistan Daraz",
  PSU:         "{TIER} power supply PSU price Pakistan Daraz",
  Case:        "{TIER} PC case price Pakistan Daraz",
  Monitor:     "{TIER} gaming monitor price Pakistan Daraz",
  Peripherals: "{TIER} keyboard mouse combo price Pakistan Daraz"
};

const TIER_DESCRIPTORS = {
  entry:      "entry level budget",
  budget:     "budget",
  "mid-range":"mid range",
  "high-end": "high end",
  enthusiast: "enthusiast premium",
  flagship:   "flagship top tier"
};

// Matches "Rs. 24,000", "Rs 24000", "PKR 24,000", "₨24,000"
const PRICE_REGEX = /(?:Rs\.?|PKR|₨)\s?([\d,]{4,9})/i;

function extractPrice(text) {
  const m = String(text || "").match(PRICE_REGEX);
  if (!m) return null;
  const num = parseInt(m[1].replace(/,/g, ""), 10);
  if (!Number.isFinite(num) || num < 500 || num > 10_000_000) return null;
  return num;
}

async function searchCategory(category, tier, apiKey) {
  const tierWord = TIER_DESCRIPTORS[tier] || "mid range";
  const template = CATEGORY_QUERY_TEMPLATES[category];
  if (!template) return [];

  const query = template.replace("{TIER}", tierWord);

  try {
    const res = await fetch(SERPER_URL, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ q: query, gl: "pk", num: 8 })
    });

    if (!res.ok) {
      console.warn(`[priceSearch] Serper error for ${category}: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const results = [];

    for (const item of (data.organic || [])) {
      const title = item.title || "";
      const snippet = item.snippet || "";
      const price = extractPrice(snippet) || extractPrice(title);
      if (price) results.push({ name: title.slice(0, 100), price });
      if (results.length >= 3) break;
    }

    for (const item of (data.shopping || [])) {
      const price = extractPrice(item.price);
      if (price && item.title) results.push({ name: item.title.slice(0, 100), price });
      if (results.length >= 4) break;
    }

    return results;
  } catch (err) {
    console.error(`[priceSearch] Failed for ${category}:`, err.message);
    return [];
  }
}

// Returns { CPU: [...], GPU: [...], ... } for a tier, using cache when fresh.
async function getMarketData(tier) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null; // No key configured — caller should skip gracefully

  const cached = marketCache.get(tier);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    console.log(`[priceSearch] Cache hit for tier "${tier}"`);
    return cached.data;
  }

  console.log(`[priceSearch] Cache miss for tier "${tier}" — fetching fresh data`);
  const categories = Object.keys(CATEGORY_QUERY_TEMPLATES);

  const settled = await Promise.allSettled(
    categories.map(cat => searchCategory(cat, tier, apiKey))
  );

  const marketData = {};
  categories.forEach((cat, i) => {
    marketData[cat] = settled[i].status === "fulfilled" ? settled[i].value : [];
  });

  marketCache.set(tier, { data: marketData, timestamp: Date.now() });
  return marketData;
}

// Compact text block for prompt injection. Returns "" if no usable data.
function formatMarketDataForPrompt(marketData) {
  if (!marketData) return "";
  const lines = [];
  for (const [cat, items] of Object.entries(marketData)) {
    if (!items.length) continue;
    lines.push(`${cat}:`);
    items.slice(0, 3).forEach(item => {
      lines.push(`  - ${item.name} — Rs ${item.price.toLocaleString()}`);
    });
  }
  return lines.join("\n");
}

module.exports = { getMarketData, formatMarketDataForPrompt };+-