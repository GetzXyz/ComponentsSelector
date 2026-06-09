/**
 * FORGE Backend API Handler v7.1
 * 
 * Provider: Groq Llama-3-70b with improved error handling
 * Features:
 * - Multiple component options (new & used)
 * - Real-time market research
 * - Better fallback system
 */

"use strict";

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 20;

function isRateLimited(ip) {
  const now = Date.now();
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

function validateInput(body) {
  const { budget, usage, currency } = body;

  if (budget !== undefined) {
    const b = Number(budget);
    if (isNaN(b) || b < 0 || b > 50000000) {
      return "Budget must be between 0 and 50,000,000.";
    }
  }

  if (usage && !["gaming", "editing", "coding", "office"].includes(usage.toLowerCase())) {
    return "Invalid usage type.";
  }

  if (currency && !["PKR", "USD", "EUR", "GBP", "AED", "SAR", "CAD", "AUD"].includes(currency)) {
    return "Currency not supported.";
  }

  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT DATABASE WITH 3 OPTIONS EACH
// ════════════════════════════════════════════════════════════════════════════

const componentDatabase = {
  PKR: {
    CPU: [
      { name: "AMD Ryzen 5 5600X", price: 42000, spec: "6C/12T, 3.7-4.6GHz, AM4", condition: "new", brand: "AMD" },
      { name: "Intel Core i5-12400F", price: 45000, spec: "6P+4E cores, LGA1700", condition: "new", brand: "Intel" },
      { name: "AMD Ryzen 5 7600X (Used)", price: 38000, spec: "6C/12T, 3.6-5.3GHz, AM5", condition: "used", brand: "AMD" },
    ],
    GPU: [
      { name: "NVIDIA RTX 4060 Ti 16GB", price: 195000, spec: "16GB GDDR6, 2535MHz, Full Memory", condition: "new", brand: "NVIDIA" },
      { name: "AMD Radeon RX 7600 12GB", price: 118000, spec: "12GB GDDR6, RDNA 3 Architecture", condition: "new", brand: "AMD" },
      { name: "NVIDIA RTX 3070 Ti 8GB (Used)", price: 145000, spec: "8GB GDDR6X, Ampere Gen", condition: "used", brand: "NVIDIA" },
    ],
    Motherboard: [
      { name: "ASUS PRIME B550M-A", price: 28000, spec: "AM4, PCIe 4.0, WiFi 6", condition: "new", brand: "ASUS" },
      { name: "MSI B650M Gaming WiFi", price: 32000, spec: "AM5, PCIe 5.0, DDR5 Ready", condition: "new", brand: "MSI" },
      { name: "Gigabyte B450M DS3H (Used)", price: 18000, spec: "AM4, Budget Friendly", condition: "used", brand: "Gigabyte" },
    ],
    RAM: [
      { name: "TeamGroup Elite DDR5 32GB 6000MHz", price: 65000, spec: "2x16GB Kit, CL30, High Speed", condition: "new", brand: "TeamGroup" },
      { name: "Corsair Vengeance DDR5 32GB 5600MHz", price: 68000, spec: "2x16GB, CL36, RGB", condition: "new", brand: "Corsair" },
      { name: "Kingston DDR4 16GB 3200MHz (Used)", price: 22000, spec: "2x8GB Kit, Budget Option", condition: "used", brand: "Kingston" },
    ],
    Storage: [
      { name: "Samsung 990 PRO 1TB NVMe", price: 18000, spec: "Gen4, 7100MB/s, PCIe 4.0", condition: "new", brand: "Samsung" },
      { name: "WD Black SN850X 1TB", price: 16500, spec: "Gen4, 7100MB/s, TLC NAND", condition: "new", brand: "Western Digital" },
      { name: "Crucial MX500 1TB SSD (Used)", price: 9000, spec: "2.5\" SATA, Reliable", condition: "used", brand: "Crucial" },
    ],
    PSU: [
      { name: "Corsair RM750x 750W", price: 15000, spec: "80+ Gold, Modular, 10 Year Warranty", condition: "new", brand: "Corsair" },
      { name: "EVGA SuperNOVA 750W GA", price: 14000, spec: "80+ Gold, Eco Mode", condition: "new", brand: "EVGA" },
      { name: "Thermaltake 650W 80+ Bronze (Used)", price: 8500, spec: "Budget, Modular", condition: "used", brand: "Thermaltake" },
    ],
    Cooling: [
      { name: "NZXT Kraken X63 RGB", price: 12000, spec: "280mm AIO, CAM Software Control", condition: "new", brand: "NZXT" },
      { name: "Corsair H100i Elite Capellix", price: 13000, spec: "240mm AIO, RGB, Quiet", condition: "new", brand: "Corsair" },
      { name: "Noctua NH-D15 Air Cooler (Used)", price: 8000, spec: "Dual Tower, Silent Operation", condition: "used", brand: "Noctua" },
    ],
    Case: [
      { name: "NZXT H510 Flow", price: 9000, spec: "Mid-Tower, Tempered Glass, Airflow", condition: "new", brand: "NZXT" },
      { name: "Corsair 4000D Airflow", price: 9500, spec: "Mid-Tower, Good Cable Management", condition: "new", brand: "Corsair" },
      { name: "Fractal Design Core 1000 (Used)", price: 5500, spec: "Budget, Compact", condition: "used", brand: "Fractal Design" },
    ],
    Monitor: [
      { name: "LG 27GP850-B 1440p 144Hz", price: 42000, spec: "27\", 1440p, 144Hz, IPS Panel", condition: "new", brand: "LG" },
      { name: "Dell S2721DGF 1440p 165Hz", price: 45000, spec: "27\", 1440p, 165Hz, VA Panel", condition: "new", brand: "Dell" },
      { name: "ASUS VP228HE 1080p 75Hz (Used)", price: 18000, spec: "21.5\", Entry Level", condition: "used", brand: "ASUS" },
    ],
    Keyboard: [
      { name: "Corsair K95 RGB Platinum", price: 18000, spec: "Mechanical, Cherry MX, Wireless", condition: "new", brand: "Corsair" },
      { name: "SteelSeries Apex Pro", price: 16000, spec: "Adjustable Switches, OLED", condition: "new", brand: "SteelSeries" },
      { name: "Mechanical Gaming Keyboard (Used)", price: 8000, spec: "Budget, Reliable Switches", condition: "used", brand: "Generic" },
    ],
    Mouse: [
      { name: "Razer DeathAdder V2 Pro", price: 14000, spec: "30000 DPI, Wireless, Lightweight", condition: "new", brand: "Razer" },
      { name: "SteelSeries Rival 3", price: 6500, spec: "18000 DPI, Ergonomic", condition: "new", brand: "SteelSeries" },
      { name: "Logitech MX Master 2S (Used)", price: 5000, spec: "Professional, Multi-Device", condition: "used", brand: "Logitech" },
    ],
    Headphones: [
      { name: "SteelSeries Arctis 9 Wireless", price: 22000, spec: "Wireless, RGB, Surround Sound", condition: "new", brand: "SteelSeries" },
      { name: "HyperX Cloud Stinger 2", price: 11000, spec: "Comfortable, 30-hour Battery", condition: "new", brand: "HyperX" },
      { name: "Audio-Technica ATH-M50x (Used)", price: 8000, spec: "Professional Monitor, Wired", condition: "used", brand: "Audio-Technica" },
    ],
  },
  USD: {
    CPU: [
      { name: "AMD Ryzen 5 5600X", price: 129, spec: "6C/12T, 3.7-4.6GHz", condition: "new", brand: "AMD" },
      { name: "Intel Core i5-12400F", price: 139, spec: "6P+4E cores", condition: "new", brand: "Intel" },
      { name: "AMD Ryzen 5 7600X (Used)", price: 119, spec: "6C/12T, AM5", condition: "used", brand: "AMD" },
    ],
    GPU: [
      { name: "NVIDIA RTX 4060 Ti 16GB", price: 599, spec: "16GB GDDR6", condition: "new", brand: "NVIDIA" },
      { name: "AMD Radeon RX 7600 12GB", price: 369, spec: "12GB GDDR6", condition: "new", brand: "AMD" },
      { name: "NVIDIA RTX 3070 Ti (Used)", price: 449, spec: "8GB GDDR6X", condition: "used", brand: "NVIDIA" },
    ],
    Motherboard: [
      { name: "ASUS PRIME B550M-A", price: 89, spec: "AM4, PCIe 4.0", condition: "new", brand: "ASUS" },
      { name: "MSI B650M Gaming WiFi", price: 99, spec: "AM5, PCIe 5.0", condition: "new", brand: "MSI" },
      { name: "Gigabyte B450M DS3H (Used)", price: 59, spec: "AM4, Budget", condition: "used", brand: "Gigabyte" },
    ],
    RAM: [
      { name: "TeamGroup Elite DDR5 32GB", price: 199, spec: "High Speed", condition: "new", brand: "TeamGroup" },
      { name: "Corsair Vengeance DDR5 32GB", price: 209, spec: "RGB, High Speed", condition: "new", brand: "Corsair" },
      { name: "Kingston DDR4 16GB (Used)", price: 69, spec: "Budget Option", condition: "used", brand: "Kingston" },
    ],
    Storage: [
      { name: "Samsung 990 PRO 1TB", price: 55, spec: "Gen4, Fast", condition: "new", brand: "Samsung" },
      { name: "WD Black SN850X 1TB", price: 51, spec: "Gen4, Reliable", condition: "new", brand: "Western Digital" },
      { name: "Crucial MX500 1TB (Used)", price: 28, spec: "SATA, Budget", condition: "used", brand: "Crucial" },
    ],
  },
};

// ════════════════════════════════════════════════════════════════════════════
// FALLBACK BUILD GENERATOR
// ════════════════════════════════════════════════════════════════════════════

function generateFallbackBuild(budget, usage, currency) {
  const currencyData = componentDatabase[currency] || componentDatabase.USD;
  const build = {
    summary: `High-performance ${usage} build optimized for value using market data.`,
    budgetAllocation: {
      CPU: 18,
      GPU: 38,
      Motherboard: 10,
      RAM: 12,
      Storage: 8,
      PSU: 6,
      Cooling: 4,
      Case: 3,
      Monitor: 1,
    },
    components: [],
    peripherals: {
      keyboard: currencyData.Keyboard ? currencyData.Keyboard[1] : null,
      mouse: currencyData.Mouse ? currencyData.Mouse[1] : null,
      headphones: currencyData.Headphones ? currencyData.Headphones[1] : null,
    },
    gamingPerformance: [
      { title: "Valorant", preset: "High", avg_fps: "240+", low1_fps: "180+" },
      { title: "Counter-Strike 2", preset: "High", avg_fps: "200+", low1_fps: "150+" },
      { title: "GTA V", preset: "High", avg_fps: "120+", low1_fps: "90+" },
      { title: "Fortnite", preset: "High", avg_fps: "160+", low1_fps: "120+" },
      { title: "Cyberpunk 2077", preset: "Medium", avg_fps: "70+", low1_fps: "50+" },
      { title: "Resident Evil 4", preset: "High", avg_fps: "100+", low1_fps: "75+" },
      { title: "Apex Legends", preset: "High", avg_fps: "140+", low1_fps: "100+" },
      { title: "Forza Horizon 5", preset: "High", avg_fps: "100+", low1_fps: "80+" },
    ],
  };

  // Add components - select best option for budget
  const categories = ["CPU", "GPU", "Motherboard", "RAM", "Storage", "PSU", "Cooling", "Case", "Monitor"];
  
  categories.forEach(cat => {
    if (currencyData[cat] && currencyData[cat].length > 0) {
      // Pick option based on budget tier
      let selected;
      if (budget < 100000 && currency === "PKR") {
        selected = currencyData[cat][2] || currencyData[cat][0]; // Used option for low budget
      } else if (budget < 300000 && currency === "PKR") {
        selected = currencyData[cat][0] || currencyData[cat][1]; // Mid option
      } else {
        selected = currencyData[cat][1] || currencyData[cat][0]; // New option for high budget
      }
      
      build.components.push(selected);
    }
  });

  return build;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN API HANDLER
// ════════════════════════════════════════════════════════════════════════════

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Rate limiting
  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Rate limit exceeded. Try again later." });
  }

  // Validate input
  const validationError = validateInput(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const {
    budget = 150000,
    usage = "gaming",
    currency = "PKR",
    preferences = "None",
    customerName = "Guest"
  } = req.body;

  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    
    if (!groqApiKey) {
      console.warn("Groq API key not found. Using fallback build.");
      const fallback = generateFallbackBuild(budget, usage, currency);
      fallback.customerName = customerName;
      fallback.note = "Using fallback recommendations - API key not configured";
      return res.status(200).json(fallback);
    }

    // Build prompt for Groq
    const systemPrompt = `You are FORGE, an expert PC builder recommending hardware for ${usage} builds in ${currency} markets.

Generate a detailed PC build with 3 OPTIONS FOR EACH COMPONENT (mix of new and used):
- Budget: ${budget} ${currency}
- Usage: ${usage}
- Preferences: ${preferences}

Return VALID JSON with this structure:
{
  "summary": "Build overview",
  "budgetAllocation": { "CPU": X, "GPU": X, "Motherboard": X, "RAM": X, "Storage": X, "PSU": X, "Cooling": X, "Case": X, "Monitor": X },
  "components": [
    { "category": "CPU", "name": "Model", "price": 0, "spec": "Specs", "condition": "new/used", "brand": "Brand" },
    { "category": "CPU", "name": "Model2", "price": 0, "spec": "Specs", "condition": "new", "brand": "Brand" },
    { "category": "CPU", "name": "Model3 (Used)", "price": 0, "spec": "Specs", "condition": "used", "brand": "Brand" },
    ...more categories with 3 options each...
  ],
  "peripherals": { "keyboard": {...}, "mouse": {...}, "headphones": {...} },
  "gamingPerformance": [{ "title": "Game", "preset": "Settings", "avg_fps": "X", "low1_fps": "X" }]
}

Provide 3 options for: CPU, GPU, Motherboard, RAM, Storage, PSU, Cooling, Case, Monitor (27 total components).
Mix new and used items appropriately for the budget.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3-70b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Create a ${usage} PC build for ${budget} ${currency}. Include 3 options for each component category (CPU, GPU, Motherboard, RAM, Storage, PSU, Cooling, Case, Monitor).`,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Groq API Error:", errorData);
      throw new Error("Groq API failed");
    }

    const result = await response.json();
    let jsonContent = result.choices[0].message.content.trim();

    // Remove markdown wrapping
    if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");
    }

    const build = JSON.parse(jsonContent);
    build.customerName = customerName;

    return res.status(200).json(build);

  } catch (error) {
    console.error("Build generation error:", error);

    // Use fallback
    const fallback = generateFallbackBuild(budget, usage, currency);
    fallback.customerName = customerName;
    fallback.note = `Fallback build due to: ${error.message}`;

    return res.status(200).json(fallback);
  }
};