/**
 * FORGE Backend API - Groq Integration v7.3 FIXED
 * Complete error handling and Vercel compatibility
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
// COMPONENT DATABASE - FALLBACK (3 options each)
// ════════════════════════════════════════════════════════════════════════════

const componentDatabase = {
  PKR: {
    CPU: [
      { name: "AMD Ryzen 5 5600X", price: 42000, spec: "6C/12T, 3.7-4.6GHz, AM4", condition: "new", brand: "AMD" },
      { name: "Intel Core i5-12400F", price: 45000, spec: "6P+4E cores, LGA1700, DDR4/DDR5", condition: "new", brand: "Intel" },
      { name: "AMD Ryzen 5 7600X (Used)", price: 38000, spec: "6C/12T, 3.6-5.3GHz, AM5", condition: "used", brand: "AMD" },
    ],
    GPU: [
      { name: "NVIDIA RTX 4060 Ti 16GB", price: 195000, spec: "16GB GDDR6, 2535MHz, PCIe 4.0", condition: "new", brand: "NVIDIA" },
      { name: "AMD Radeon RX 7600 12GB", price: 118000, spec: "12GB GDDR6, RDNA 3 Architecture", condition: "new", brand: "AMD" },
      { name: "NVIDIA RTX 3070 Ti 8GB (Used)", price: 145000, spec: "8GB GDDR6X, Ampere Gen", condition: "used", brand: "NVIDIA" },
    ],
    Motherboard: [
      { name: "ASUS PRIME B550M-A", price: 28000, spec: "AM4, PCIe 4.0, WiFi 6E", condition: "new", brand: "ASUS" },
      { name: "MSI B650M Gaming WiFi", price: 32000, spec: "AM5, PCIe 5.0, DDR5 Ready", condition: "new", brand: "MSI" },
      { name: "Gigabyte B450M DS3H (Used)", price: 18000, spec: "AM4, Budget Friendly, Stable", condition: "used", brand: "Gigabyte" },
    ],
    RAM: [
      { name: "TeamGroup Elite DDR5 32GB 6000MHz", price: 65000, spec: "2x16GB Kit, CL30, High Speed", condition: "new", brand: "TeamGroup" },
      { name: "Corsair Vengeance DDR5 32GB 5600MHz", price: 68000, spec: "2x16GB, CL36, RGB Lighting", condition: "new", brand: "Corsair" },
      { name: "Kingston DDR4 16GB 3200MHz (Used)", price: 22000, spec: "2x8GB Kit, Budget Option", condition: "used", brand: "Kingston" },
    ],
    Storage: [
      { name: "Samsung 990 PRO 1TB NVMe", price: 18000, spec: "Gen4, 7100MB/s, PCIe 4.0", condition: "new", brand: "Samsung" },
      { name: "WD Black SN850X 1TB", price: 16500, spec: "Gen4, 7100MB/s, TLC NAND", condition: "new", brand: "Western Digital" },
      { name: "Crucial MX500 1TB SSD (Used)", price: 9000, spec: "2.5\" SATA, Reliable", condition: "used", brand: "Crucial" },
    ],
    PSU: [
      { name: "Corsair RM750x 750W", price: 15000, spec: "80+ Gold, Modular, 10 Year Warranty", condition: "new", brand: "Corsair" },
      { name: "EVGA SuperNOVA 750W GA", price: 14000, spec: "80+ Gold, Eco Mode, Efficient", condition: "new", brand: "EVGA" },
      { name: "Thermaltake 650W 80+ Bronze (Used)", price: 8500, spec: "Modular, Budget Friendly", condition: "used", brand: "Thermaltake" },
    ],
    Cooling: [
      { name: "NZXT Kraken X63 RGB", price: 12000, spec: "280mm AIO, CAM Software Control", condition: "new", brand: "NZXT" },
      { name: "Corsair H100i Elite Capellix", price: 13000, spec: "240mm AIO, RGB, Quiet", condition: "new", brand: "Corsair" },
      { name: "Noctua NH-D15 Air Cooler (Used)", price: 8000, spec: "Dual Tower, Silent Operation", condition: "used", brand: "Noctua" },
    ],
    Case: [
      { name: "NZXT H510 Flow", price: 9000, spec: "Mid-Tower, Tempered Glass, Good Airflow", condition: "new", brand: "NZXT" },
      { name: "Corsair 4000D Airflow", price: 9500, spec: "Mid-Tower, Good Cable Management", condition: "new", brand: "Corsair" },
      { name: "Fractal Design Core 1000 (Used)", price: 5500, spec: "Budget, Compact Design", condition: "used", brand: "Fractal Design" },
    ],
    Monitor: [
      { name: "LG 27GP850-B 1440p 144Hz", price: 42000, spec: "27\", 1440p, 144Hz, IPS Panel", condition: "new", brand: "LG" },
      { name: "Dell S2721DGF 1440p 165Hz", price: 45000, spec: "27\", 1440p, 165Hz, VA Panel", condition: "new", brand: "Dell" },
      { name: "ASUS VP228HE 1080p 75Hz (Used)", price: 18000, spec: "21.5\", Entry Level, IPS", condition: "used", brand: "ASUS" },
    ],
    Keyboard: [
      { name: "Corsair K95 RGB Platinum", price: 18000, spec: "Mechanical, Cherry MX, Wireless", condition: "new", brand: "Corsair" },
      { name: "SteelSeries Apex Pro", price: 16000, spec: "Adjustable Switches, OLED", condition: "new", brand: "SteelSeries" },
      { name: "Mechanical Gaming Keyboard (Used)", price: 8000, spec: "Budget, Reliable Switches", condition: "used", brand: "Generic" },
    ],
    Mouse: [
      { name: "Razer DeathAdder V2 Pro", price: 14000, spec: "30000 DPI, Wireless, Lightweight", condition: "new", brand: "Razer" },
      { name: "SteelSeries Rival 3", price: 6500, spec: "18000 DPI, Ergonomic Design", condition: "new", brand: "SteelSeries" },
      { name: "Logitech MX Master 2S (Used)", price: 5000, spec: "Professional, Multi-Device", condition: "used", brand: "Logitech" },
    ],
    Headphones: [
      { name: "SteelSeries Arctis 9 Wireless", price: 22000, spec: "Wireless, RGB, Surround Sound", condition: "new", brand: "SteelSeries" },
      { name: "HyperX Cloud Stinger 2", price: 11000, spec: "Comfortable, 30-hour Battery", condition: "new", brand: "HyperX" },
      { name: "Audio-Technica ATH-M50x (Used)", price: 8000, spec: "Professional Monitor, Wired", condition: "used", brand: "Audio-Technica" },
    ],
  },
};

function generateFallbackBuild(budget, usage, currency) {
  const currencyData = componentDatabase[currency] || componentDatabase.PKR;
  
  const build = {
    summary: `High-performance ${usage} build optimized for value and compatibility. This configuration balances gaming performance with productivity features.`,
    budgetAllocation: {
      CPU: 18,
      GPU: 38,
      Motherboard: 10,
      RAM: 12,
      Storage: 8,
      PSU: 6,
      Cooling: 4,
      Case: 3,
      Monitor: 3,
    },
    components: [],
    peripherals: {
      keyboard: currencyData.Keyboard?.[1] || { name: "Gaming Keyboard", price: 10000, spec: "Mechanical RGB", condition: "new", brand: "Generic" },
      mouse: currencyData.Mouse?.[1] || { name: "Gaming Mouse", price: 7000, spec: "16000 DPI Optical", condition: "new", brand: "Generic" },
      headphones: currencyData.Headphones?.[1] || { name: "Gaming Headset", price: 11000, spec: "Wireless 7.1 Surround", condition: "new", brand: "Generic" },
    },
    gamingPerformance: [
      { title: "Valorant", preset: "High", avg_fps: "240+", low1_fps: "180+" },
      { title: "Counter-Strike 2", preset: "High", avg_fps: "200+", low1_fps: "150+" },
      { title: "GTA V", preset: "High", avg_fps: "120+", low1_fps: "90+" },
      { title: "Fortnite", preset: "High", avg_fps: "160+", low1_fps: "120+" },
      { title: "Cyberpunk 2077", preset: "Medium", avg_fps: "70+", low1_fps: "50+" },
      { title: "Resident Evil 4 Remake", preset: "High", avg_fps: "100+", low1_fps: "75+" },
      { title: "Apex Legends", preset: "High", avg_fps: "140+", low1_fps: "100+" },
      { title: "Forza Horizon 5", preset: "High", avg_fps: "100+", low1_fps: "80+" },
    ],
  };

  const categories = ["CPU", "GPU", "Motherboard", "RAM", "Storage", "PSU", "Cooling", "Case", "Monitor"];
  
  categories.forEach(cat => {
    if (currencyData[cat] && currencyData[cat].length > 0) {
      let selected;
      
      // Smart selection based on budget
      if (budget < 100000 && currency === "PKR") {
        // Low budget: prefer used/budget options
        selected = currencyData[cat][2] || currencyData[cat][0];
      } else if (budget < 300000 && currency === "PKR") {
        // Mid budget: balanced mix
        selected = currencyData[cat][0];
      } else {
        // High budget: premium options
        selected = currencyData[cat][1] || currencyData[cat][0];
      }
      
      if (selected) {
        build.components.push(selected);
      }
    }
  });

  return build;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN API HANDLER - VERCEL COMPATIBLE
// ════════════════════════════════════════════════════════════════════════════

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  console.log("📨 Request received:", req.method);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate limiting
  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "global";
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Rate limit exceeded" });
  }

  // Validate input
  const validationError = validateInput(req.body);
  if (validationError) {
    console.error("❌ Validation error:", validationError);
    return res.status(400).json({ error: validationError });
  }

  const {
    budget = 150000,
    usage = "gaming",
    currency = "PKR",
    preferences = "None",
    customerName = "Guest"
  } = req.body;

  console.log("📦 Build request:", { budget, usage, currency, customerName });

  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    
    if (!groqApiKey) {
      console.warn("⚠️ GROQ_API_KEY not configured - using fallback");
      const fallback = generateFallbackBuild(budget, usage, currency);
      fallback.customerName = customerName;
      fallback.note = "Using fallback database - API key not configured";
      fallback.usedGroqAPI = false;
      return res.status(200).json(fallback);
    }

    console.log("🔑 Groq API key found (length:", groqApiKey.length, ")");
    console.log("🌐 Calling Groq API...");

    const systemPrompt = `You are FORGE PC Builder. Generate a COMPLETE PC build recommendation with exactly 27 components (3 options for each of 9 categories: CPU, GPU, Motherboard, RAM, Storage, PSU, Cooling, Case, Monitor).

Budget: ${budget} ${currency}
Usage: ${usage}
Preferences: ${preferences}

Mix new and used components appropriately for the budget.

Return ONLY valid JSON (no markdown, no explanations):`;

    const userPrompt = `Generate PC build for ${budget} ${currency} ${usage}. Include 3 options per category (27 total components). Mix new and used items.`;

    const requestBody = {
      model: "llama-3-70b-8192",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    };

    console.log("📤 Sending to Groq...");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      timeout: 30000,
    });

    console.log("📥 Groq response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || `HTTP ${response.status}`;
      throw new Error(`Groq API error: ${errorMsg}`);
    }

    const result = await response.json();
    console.log("✅ Groq response received");

    if (!result.choices || !result.choices[0]) {
      throw new Error("Invalid Groq response structure");
    }

    let jsonContent = result.choices[0].message.content.trim();

    // Remove markdown if present
    if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");
    }

    console.log("🔍 Parsing JSON...");
    const build = JSON.parse(jsonContent);

    // Validate build structure
    if (!build.components || !Array.isArray(build.components)) {
      throw new Error("Invalid build structure - missing components");
    }

    build.customerName = customerName;
    build.usedGroqAPI = true;

    console.log("✅ Build generated successfully:", build.components.length, "components");
    return res.status(200).json(build);

  } catch (error) {
    console.error("❌ Error:", error.message);

    // Use fallback
    const fallback = generateFallbackBuild(budget, usage, currency);
    fallback.customerName = customerName;
    fallback.note = `Fallback mode: ${error.message}`;
    fallback.usedGroqAPI = false;

    console.log("✅ Using fallback build");
    return res.status(200).json(fallback);
  }
};