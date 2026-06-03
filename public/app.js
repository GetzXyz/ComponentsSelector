cat > /home/claude/forge_output/app.js << 'JSEOF'
/* =============================================================
   FORGE — AI PC Builder  |  app.js  (v2 — Full Integration)
   =============================================================
   Changes vs v1:
   1. Gemini API wired directly from browser (client-side fetch)
   2. Loading screen uses replaceState — NOT pushState —
      so Back button skips it entirely (single click → home)
   3. Customer name field captured & shown on invoice
   4. Technician fee: PKR=1500, others=~40 USD equivalent
   5. Invoice: professional layout, full scrolling, Print button
   6. Session-only data — no localStorage, no persistence
   7. API key stored only in sessionStorage (clears on tab close)
   8. Fallback to local COMPONENT_DB if Gemini unavailable
   ============================================================= */

"use strict";

/* ─── REGIONS ──────────────────────────────────────────────── */
const REGIONS = {
  PK: { currency: "PKR", symbol: "₨",  rate: 278.5, minBudget: 30000 },
  US: { currency: "USD", symbol: "$",  rate: 1.0,   minBudget: 120   },
  GB: { currency: "GBP", symbol: "£",  rate: 0.79,  minBudget: 95    },
  EU: { currency: "EUR", symbol: "€",  rate: 0.92,  minBudget: 110   },
  IN: { currency: "INR", symbol: "₹",  rate: 83.5,  minBudget: 10000 },
};

/* ─── TECHNICIAN FEE ───────────────────────────────────────── */
const TECHNICIAN_FEE_USD = 40; // ~40 USD for non-PK
function getTechnicianFee(region) {
  if (region === "PK") return 1500; // fixed PKR
  return Math.round(TECHNICIAN_FEE_USD * REGIONS[region].rate);
}

/* ─── COMPONENT METADATA ───────────────────────────────────── */
const COMPONENT_META = {
  cpu:        { icon: "🔲", label: "Processor (CPU)"        },
  gpu:        { icon: "🎮", label: "Graphics Card (GPU)"     },
  mb:         { icon: "🔌", label: "Motherboard"             },
  ram:        { icon: "💾", label: "Memory (RAM)"            },
  storage:    { icon: "💿", label: "Storage (SSD)"           },
  psu:        { icon: "⚡", label: "Power Supply (PSU)"     },
  cooler:     { icon: "❄️", label: "CPU Cooler"             },
  case_:      { icon: "🖥️", label: "PC Case"                },
  monitor:    { icon: "🖵",  label: "Monitor"                 },
  keyboard:   { icon: "⌨️", label: "Keyboard"               },
  mouse:      { icon: "🖱️", label: "Mouse"                  },
  headset:    { icon: "🎧", label: "Headset / Audio"         },
  networking: { icon: "📡", label: "Networking (WiFi)"       },
  os:         { icon: "💻", label: "Operating System"        },
};

/* ─── APP STATE (session-only, no persistence) ─────────────── */
const state = {
  region:       "PK",
  budgetLocal:  150000,
  budgetUSD:    0,
  purpose:      "gaming",
  customerName: "",
  components:   {},
  allOptions:   {},
  usedGemini:   false,
};

/* ─── HELPERS ──────────────────────────────────────────────── */
const $  = id => document.getElementById(id);
const fmt = n => Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

/* ─── LOCAL FALLBACK DATABASE ──────────────────────────────── */
const COMPONENT_DB = {
  cpu: {
    scrappy:     { name:"Intel Core i3-9100F (Used)",    specs:"4c/4t · 65W",         priceUSD:30   },
    ultraBudget: { name:"Intel Core i3-10100F",          specs:"4c/8t · 65W",         priceUSD:55   },
    budget:      { name:"AMD Ryzen 5 5600",              specs:"6c/12t · Zen3",        priceUSD:100  },
    mid:         { name:"Intel Core i5-13400F",          specs:"10c/16t · B660",       priceUSD:170  },
    high:        { name:"AMD Ryzen 7 7800X3D",           specs:"8c/16t · 3D V-Cache",  priceUSD:370  },
    flagship:    { name:"AMD Ryzen 9 9950X3D",           specs:"16c/32t · Zen5",       priceUSD:649  },
  },
  gpu: {
    scrappy:     { name:"NVIDIA GTX 1050 Ti 4GB (Used)", specs:"1080p Low",            priceUSD:50   },
    ultraBudget: { name:"AMD RX 6600 8GB",               specs:"1080p High · GDDR6",   priceUSD:150  },
    budget:      { name:"NVIDIA RTX 3060 12GB",          specs:"1080p/1440p · DLSS",   priceUSD:220  },
    mid:         { name:"NVIDIA RTX 4070 12GB",          specs:"1440p · DLSS 3",       priceUSD:550  },
    high:        { name:"NVIDIA RTX 4080 Super 16GB",    specs:"4K High · Frame Gen",  priceUSD:999  },
    flagship:    { name:"NVIDIA RTX 5090 32GB",          specs:"4K Max · DLSS 4",      priceUSD:1999 },
  },
  mb: {
    scrappy:     { name:"Gigabyte H310M S2 2.0",         specs:"LGA1151 · 2xDDR4",    priceUSD:28   },
    ultraBudget: { name:"ASRock B450M-HDV",              specs:"AM4 · 2xDDR4",        priceUSD:55   },
    budget:      { name:"ASRock B550M Pro4",             specs:"AM4 · Dual M.2",       priceUSD:85   },
    mid:         { name:"Gigabyte B660M DS3H",           specs:"LGA1700 · DDR4",       priceUSD:100  },
    high:        { name:"ASUS TUF B650-Plus WiFi",       specs:"AM5 · DDR5 · 2.5G",   priceUSD:175  },
    flagship:    { name:"ASUS ROG Crosshair X870E",      specs:"AM5 · PCIe 5 · WiFi7", priceUSD:550  },
  },
  ram: {
    scrappy:     { name:"8GB DDR4 2666MHz",              specs:"Single Channel",       priceUSD:14   },
    ultraBudget: { name:"16GB DDR4 3200MHz",             specs:"Dual Channel · CL16",  priceUSD:32   },
    budget:      { name:"16GB DDR4 3600MHz CL16",        specs:"Low Latency Kit",      priceUSD:42   },
    mid:         { name:"32GB DDR4 3600MHz",             specs:"Dual Channel · CL18",  priceUSD:65   },
    high:        { name:"32GB DDR5 6000MHz CL30",        specs:"Sweet-spot DDR5",      priceUSD:105  },
    flagship:    { name:"64GB DDR5 6400MHz",             specs:"Enthusiast Kit",       priceUSD:210  },
  },
  storage: {
    scrappy:     { name:"256GB SATA SSD",                specs:"Boot Drive",           priceUSD:15   },
    ultraBudget: { name:"512GB NVMe Gen3 SSD",           specs:"3500 MB/s",            priceUSD:28   },
    budget:      { name:"1TB NVMe Gen4 SSD",             specs:"7000 MB/s",            priceUSD:55   },
    mid:         { name:"2TB NVMe Gen4 SSD",             specs:"7000 MB/s · Large",    priceUSD:100  },
    high:        { name:"2TB NVMe + 4TB HDD",            specs:"Speed + Mass Storage", priceUSD:180  },
    flagship:    { name:"4TB PCIe 5.0 NVMe",             specs:"14000 MB/s",           priceUSD:499  },
  },
  psu: {
    scrappy:     { name:"400W 80+ Bronze PSU",           specs:"Basic",                priceUSD:18   },
    ultraBudget: { name:"550W 80+ Bronze",               specs:"Corsair CV550",        priceUSD:40   },
    budget:      { name:"650W 80+ Bronze",               specs:"Mid Headroom",         priceUSD:55   },
    mid:         { name:"750W 80+ Gold Modular",         specs:"Fully Modular",        priceUSD:90   },
    high:        { name:"850W 80+ Gold ATX3",            specs:"PCIe 5 Ready",         priceUSD:120  },
    flagship:    { name:"1000W 80+ Platinum Mod",        specs:"Future-Proof",         priceUSD:200  },
  },
  cooler: {
    scrappy:     { name:"Stock Cooler (Boxed)",          specs:"Adequate at stock",    priceUSD:0    },
    ultraBudget: { name:"Thermalright Assassin 120",     specs:"4 Heatpipe · 120mm",   priceUSD:18   },
    budget:      { name:"DeepCool AK400",                specs:"4 Heatpipe · 120mm",   priceUSD:25   },
    mid:         { name:"Thermalright Peerless Assassin",specs:"6 Heatpipe · 120mm",   priceUSD:40   },
    high:        { name:"240mm Liquid AIO",              specs:"RGB AIO · 2x120mm",    priceUSD:80   },
    flagship:    { name:"360mm Premium AIO",             specs:"LCD Head · 3x120mm",   priceUSD:150  },
  },
  case_: {
    scrappy:     { name:"Generic ATX Case",              specs:"Basic Steel",          priceUSD:18   },
    ultraBudget: { name:"Ant Esports ICE-100 Mesh",      specs:"Mesh Airflow",         priceUSD:32   },
    budget:      { name:"Montech AIR 903 Base",          specs:"Airflow Chassis",      priceUSD:60   },
    mid:         { name:"Corsair 4000D Airflow",         specs:"Premium Mesh",         priceUSD:90   },
    high:        { name:"Lian Li O11 Dynamic Evo",       specs:"Glass Window",         priceUSD:150  },
    flagship:    { name:"HYTE Y70 Touch",                specs:"LCD Dashboard",        priceUSD:280  },
  },
  monitor: {
    scrappy:     { name:"20\" 1080p 60Hz LCD",           specs:"Basic Office Panel",   priceUSD:30   },
    ultraBudget: { name:"22\" 1080p 75Hz IPS",           specs:"IPS · HDMI",           priceUSD:60   },
    budget:      { name:"24\" 1080p 144Hz IPS",          specs:"1ms · FreeSync",       priceUSD:110  },
    mid:         { name:"27\" 1440p 165Hz IPS",          specs:"2K · FreeSync Prem",   priceUSD:220  },
    high:        { name:"27\" 4K 144Hz OLED",            specs:"0.03ms OLED",          priceUSD:500  },
    flagship:    { name:"34\" QD-OLED Ultrawide",        specs:"175Hz Ultrawide",      priceUSD:900  },
  },
  keyboard: {
    scrappy:     { name:"Membrane Keyboard",             specs:"Standard Layout",      priceUSD:6    },
    ultraBudget: { name:"Redragon K552 Mech",            specs:"Brown Switch · TKL",   priceUSD:18   },
    budget:      { name:"RK84 Wireless Mech",            specs:"Hot-swap · BT5.0",     priceUSD:45   },
    mid:         { name:"Keychron K2 Pro",               specs:"QMK · Hot-swap · BT",  priceUSD:90   },
    high:        { name:"Wooting 60HE Analog",           specs:"Rapid Trigger · Mag",  priceUSD:175  },
    flagship:    { name:"Custom GMK67 Build",            specs:"Lubed Linear · Gasket", priceUSD:350  },
  },
  mouse: {
    scrappy:     { name:"Basic Optical Mouse",           specs:"USB Wired",            priceUSD:5    },
    ultraBudget: { name:"Logitech G102 Lightsync",       specs:"8000 DPI · RGB",       priceUSD:20   },
    budget:      { name:"Logitech G304 Wireless",        specs:"12000 DPI · 2.4G",     priceUSD:35   },
    mid:         { name:"Logitech G502 X Plus",          specs:"Lightspeed · 25K DPI", priceUSD:90   },
    high:        { name:"Razer DeathAdder V3 Pro",       specs:"Wireless · 63g",       priceUSD:140  },
    flagship:    { name:"Finalmouse Carbon Mg",          specs:"Competitive · 41g",    priceUSD:299  },
  },
  headset: {
    scrappy:     { name:"Basic 3.5mm Headset",           specs:"Stereo Mic",           priceUSD:6    },
    ultraBudget: { name:"Redragon H510 Zeus",            specs:"7.1 Surround USB",     priceUSD:20   },
    budget:      { name:"HyperX Cloud Stinger 2",        specs:"50mm Drivers",         priceUSD:40   },
    mid:         { name:"HyperX Cloud III Wireless",     specs:"Wireless · 120hr",     priceUSD:130  },
    high:        { name:"SteelSeries Arctis Nova Pro W", specs:"ANC · Dual Wireless",  priceUSD:299  },
    flagship:    { name:"Sennheiser HD 800S + Amp",      specs:"Studio Audiophile",    priceUSD:1699 },
  },
  networking: {
    scrappy:     { name:"CAT6 Ethernet Cable 5m",        specs:"Direct 1Gbps",         priceUSD:4    },
    ultraBudget: { name:"TP-Link USB WiFi Adapter",      specs:"AC600 Dual Band",      priceUSD:10   },
    budget:      { name:"PCIe WiFi 5 BT 4.2 Card",       specs:"867Mbps · BT",         priceUSD:18   },
    mid:         { name:"PCIe WiFi 6E BT 5.3",           specs:"2.4Gbps · Tri-Band",   priceUSD:40   },
    high:        { name:"WiFi 7 PCIe Adapter",           specs:"5.8Gbps · BT5.4",      priceUSD:80   },
    flagship:    { name:"ROG Rapture GT-BE98 Router",    specs:"WiFi 7 · 10G Gaming",  priceUSD:649  },
  },
  os: {
    scrappy:     { name:"Ubuntu 24.04 LTS",              specs:"Open Source · Stable", priceUSD:0    },
    ultraBudget: { name:"Windows 11 Home OEM Key",       specs:"Digital Activation",   priceUSD:12   },
    budget:      { name:"Windows 11 Home Digital",       specs:"Authentic License",    priceUSD:20   },
    mid:         { name:"Windows 11 Pro Digital",        specs:"BitLocker · RDP",      priceUSD:28   },
    high:        { name:"Windows 11 Pro Retail",         specs:"Transferable License", priceUSD:45   },
    flagship:    { name:"Windows 11 Pro + Office Bundle",specs:"Full Suite",           priceUSD:180  },
  },
};

const ALLOCATION_WEIGHTS = {
  gaming:      { gpu:0.30, cpu:0.14, mb:0.08, ram:0.07, storage:0.07, psu:0.07, cooler:0.04, case_:0.06, monitor:0.08, keyboard:0.03, mouse:0.03, headset:0.02, networking:0.01, os:0.00 },
  creative:    { gpu:0.27, cpu:0.15, mb:0.08, ram:0.09, storage:0.10, psu:0.06, cooler:0.04, case_:0.05, monitor:0.09, keyboard:0.03, mouse:0.02, headset:0.01, networking:0.01, os:0.00 },
  workstation: { gpu:0.20, cpu:0.20, mb:0.09, ram:0.12, storage:0.10, psu:0.06, cooler:0.05, case_:0.04, monitor:0.07, keyboard:0.03, mouse:0.02, headset:0.01, networking:0.01, os:0.00 },
};

const TIERS = ["scrappy","ultraBudget","budget","mid","high","flagship"];

/* ================================================================
   GEMINI API INTEGRATION
   Direct browser → Gemini call. No proxy needed for client-side.
   API key stored only in memory (sessionStorage cleared on close).
   ================================================================ */
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

function getApiKey() {
  // Only from sessionStorage — never localStorage, never hardcoded
  return sessionStorage.getItem("forge_gemini_key") || "";
}

function buildGeminiPrompt() {
  const r = REGIONS[state.region];
  const purposeMap = { gaming:"High FPS Gaming", creative:"Rendering & Production", workstation:"AI & Workstation" };
  return `You are a professional PC builder. A customer in ${state.region} has a TOTAL build budget of ${r.symbol}${fmt(state.budgetLocal)} ${r.currency} (approximately $${Math.round(state.budgetUSD)} USD) for a ${purposeMap[state.purpose] || state.purpose} PC.

Distribute the budget intelligently across ALL components. Never spend the full budget on one part. Return ONLY valid JSON (no markdown, no explanation) in this EXACT schema:

{
  "cpu":        { "name": "...", "specs": "...", "priceUSD": 0 },
  "gpu":        { "name": "...", "specs": "...", "priceUSD": 0 },
  "mb":         { "name": "...", "specs": "...", "priceUSD": 0 },
  "ram":        { "name": "...", "specs": "...", "priceUSD": 0 },
  "storage":    { "name": "...", "specs": "...", "priceUSD": 0 },
  "psu":        { "name": "...", "specs": "...", "priceUSD": 0 },
  "cooler":     { "name": "...", "specs": "...", "priceUSD": 0 },
  "case_":      { "name": "...", "specs": "...", "priceUSD": 0 },
  "monitor":    { "name": "...", "specs": "...", "priceUSD": 0 },
  "keyboard":   { "name": "...", "specs": "...", "priceUSD": 0 },
  "mouse":      { "name": "...", "specs": "...", "priceUSD": 0 },
  "headset":    { "name": "...", "specs": "...", "priceUSD": 0 },
  "networking": { "name": "...", "specs": "...", "priceUSD": 0 },
  "os":         { "name": "...", "specs": "...", "priceUSD": 0 }
}

Rules:
- Total of all priceUSD values must NOT exceed $${Math.round(state.budgetUSD)}
- For ${state.region}: recommend real products available in local market
- Include used/refurbished where appropriate for tight budgets
- Each component must be compatible with the others
- specs field: short description like "6c/12t · Zen3" or "1080p · 144Hz"
- Return ONLY the JSON object, nothing else`;
}

async function fetchGeminiRecommendations() {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const resp = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildGeminiPrompt() }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
      })
    });

    if (!resp.ok) {
      console.warn("Gemini API error:", resp.status);
      return null;
    }

    const data = await resp.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!raw) return null;

    // Strip any accidental markdown fences
    const clean = raw.replace(/```json|```/gi, "").trim();
    const parsed = JSON.parse(clean);

    // Validate: must have at least cpu + gpu
    if (!parsed.cpu || !parsed.gpu) return null;

    return parsed;
  } catch (err) {
    console.warn("Gemini parse/fetch error:", err);
    return null;
  }
}

/* ─── BUILD OPTIONS FROM GEMINI RESULT ─────────────────────── */
function buildOptionsFromGemini(geminiData) {
  const region = REGIONS[state.region];
  const raw = {};

  Object.keys(COMPONENT_META).forEach(cat => {
    const item = geminiData[cat];
    if (!item) return;

    const baseUSD = Number(item.priceUSD) || 0;
    const mkOpt = (multiplier, tierLabel, tierClass) => ({
      name:       item.name + (multiplier < 1 ? " (Used/Alt)" : multiplier > 1 ? " +" : ""),
      specs:      item.specs || "",
      priceUSD:   baseUSD * multiplier,
      priceLocal: Math.round(baseUSD * multiplier * region.rate),
      tier:       tierClass,
      tierLabel,
      isUsed:     multiplier < 1,
    });

    raw[cat] = [
      mkOpt(0.82, "Entry",    "budget"),
      mkOpt(1.00, "Standard", "mid"),
      mkOpt(1.22, "Premium",  "high"),
    ];
  });

  return raw;
}

/* ─── BUILD OPTIONS FROM LOCAL DB (fallback) ───────────────── */
function buildSmartRecommendations() {
  const totalBudgetUSD = state.budgetUSD;
  const weights = ALLOCATION_WEIGHTS[state.purpose] || ALLOCATION_WEIGHTS.gaming;
  const region  = REGIONS[state.region];
  const raw = {};

  Object.keys(COMPONENT_META).forEach(cat => {
    const db = COMPONENT_DB[cat];
    if (!db) return;

    const allocated = totalBudgetUSD * (weights[cat] || 0.04);
    let chosen = db["scrappy"];

    for (const tier of TIERS) {
      if (!db[tier]) continue;
      if (db[tier].priceUSD <= allocated * 1.25) chosen = db[tier];
    }

    const mkOpt = (multiplier, tierLabel, tierClass) => ({
      ...chosen,
      name:       chosen.name + (multiplier < 1 ? " (Used/Alt)" : multiplier > 1 ? " +" : ""),
      priceUSD:   chosen.priceUSD * multiplier,
      priceLocal: Math.round(chosen.priceUSD * multiplier * region.rate),
      tier:       tierClass,
      tierLabel,
      isUsed:     multiplier < 1,
    });

    raw[cat] = [
      mkOpt(0.82, "Entry",    "budget"),
      mkOpt(1.00, "Standard", "mid"),
      mkOpt(1.22, "Premium",  "high"),
    ];
  });

  state.allOptions = raw;
  state.usedGemini = false;
}

/* ================================================================
   HISTORY API — KEY FIX
   Loading screen uses replaceState (not pushState).
   History stack: [onboarding] → [builder]
   Back button: builder → onboarding in ONE click. Loading never
   appears in the history stack at all.
   ================================================================ */
function pushHistory(screenName) {
  history.pushState(
    { screen: screenName, region: state.region, budgetLocal: state.budgetLocal, purpose: state.purpose },
    "",
    "#" + screenName
  );
}

function replaceHistory(screenName) {
  history.replaceState(
    { screen: screenName, region: state.region, budgetLocal: state.budgetLocal, purpose: state.purpose },
    "",
    "#" + screenName
  );
}

function showScreen(name, historyAction = "push") {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const map = { onboarding:"screen-onboarding", loading:"screen-loading", builder:"screen-builder" };
  const el = $(map[name]);
  if (el) el.classList.add("active");

  if (historyAction === "push")    pushHistory(name);
  else if (historyAction === "replace") replaceHistory(name);
  // "none" = don't touch history (popstate restores)
}

window.addEventListener("popstate", e => {
  const data = e.state;
  if (!data || !data.screen) { showScreen("onboarding", "none"); return; }

  state.region      = data.region      || state.region;
  state.budgetLocal = data.budgetLocal || state.budgetLocal;
  state.purpose     = data.purpose     || state.purpose;
  state.budgetUSD   = state.budgetLocal / REGIONS[state.region].rate;

  if (data.screen === "onboarding") {
    showScreen("onboarding", "none");
    restoreOnboardingForm();
  } else if (data.screen === "builder") {
    buildSmartRecommendations();
    renderBuilder();
    showScreen("builder", "none");
    setTimeout(initScrollReveal, 100);
  }
});

function restoreOnboardingForm() {
  const rSel = $("region-select"), bInp = $("budget-input");
  if (rSel) rSel.value = state.region;
  if (bInp) bInp.value = state.budgetLocal;
  updateCurrencySymbols();
}

/* ─── CURRENCY SYMBOLS ─────────────────────────────────────── */
function updateCurrencySymbols() {
  const r = REGIONS[state.region];
  if ($("budget-symbol"))  $("budget-symbol").textContent  = r.symbol;
  if ($("currency-label")) $("currency-label").textContent = r.currency;
  const noteEl = $("budget-note-text");
  const examples = {
    PK: "e.g. ₨150,000 → RTX 3060, i5-12400F, 16GB RAM, 1TB SSD, PSU, Case & Monitor",
    US: "e.g. $500 → RTX 3060, Ryzen 5 5600, 16GB DDR4, 1TB NVMe, B550 MB",
    GB: "e.g. £400 → RTX 3060, i5-12400F, 16GB DDR4, 1TB NVMe",
    EU: "e.g. €450 → RTX 3060, Ryzen 5 5600, 16GB RAM, 1TB NVMe",
    IN: "e.g. ₹40,000 → RX 6600, Ryzen 5 5600, 16GB DDR4, 512GB NVMe",
  };
  if (noteEl) noteEl.textContent = examples[state.region] || "Budget distributed across all parts.";
}

/* ─── ONBOARDING SETUP ─────────────────────────────────────── */
function setupOnboarding() {
  const rSel = $("region-select"), bInp = $("budget-input");
  if (!rSel || !bInp) return;

  rSel.onchange = () => { state.region = rSel.value; updateCurrencySymbols(); };

  document.querySelectorAll(".purpose-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".purpose-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.purpose = btn.dataset.purpose;
    };
  });

  // API key toggle visibility
  const keyInput = $("api-key-input"), toggleBtn = $("toggle-key-btn");
  if (keyInput && toggleBtn) {
    toggleBtn.onclick = () => {
      keyInput.type = keyInput.type === "password" ? "text" : "password";
      toggleBtn.textContent = keyInput.type === "password" ? "👁" : "🙈";
    };
  }

  const startBtn = $("start-btn");
  if (!startBtn) return;

  startBtn.onclick = async e => {
    triggerRipple(startBtn, e);

    state.region       = rSel.value;
    state.budgetLocal  = parseFloat(bInp.value) || 0;
    state.budgetUSD    = state.budgetLocal / REGIONS[state.region].rate;
    state.customerName = ($("customer-name")?.value || "").trim() || "Guest";
    state.components   = {};

    const r = REGIONS[state.region];
    if (state.budgetLocal < r.minBudget) { showBudgetModal(r.minBudget, r.symbol); return; }

    // Save API key to sessionStorage (session-only, clears on tab close)
    const apiKeyVal = ($("api-key-input")?.value || "").trim();
    if (apiKeyVal) sessionStorage.setItem("forge_gemini_key", apiKeyVal);
    else           sessionStorage.removeItem("forge_gemini_key");

    // Loading screen uses replaceState so it does NOT enter history
    showScreen("loading", "replace");
    runLoadingSequence();

    let geminiResult = null;
    const hasKey = !!getApiKey();

    if (hasKey) {
      try {
        geminiResult = await fetchGeminiRecommendations();
      } catch (_) { geminiResult = null; }
    }

    if (geminiResult) {
      state.allOptions = buildOptionsFromGemini(geminiResult);
      state.usedGemini = true;
    } else {
      buildSmartRecommendations();
      state.usedGemini = false;
    }

    renderBuilder();
    // Builder is pushed to history — Back goes straight to onboarding
    showScreen("builder", "push");
    setTimeout(initScrollReveal, 100);
  };
}

/* ─── LOADING SEQUENCE ─────────────────────────────────────── */
function runLoadingSequence() {
  const hasKey = !!getApiKey();
  const steps  = ["ls1","ls2","ls3","ls4"];
  const labels = hasKey
    ? ["Analysing budget","Querying Gemini AI","Matching compatibility","Generating build"]
    : ["Analysing budget","Loading component DB","Matching compatibility","Calculating tiers"];

  if ($("loading-headline")) $("loading-headline").textContent = hasKey ? "Consulting Gemini AI..." : "Optimising Your Build...";
  if ($("loading-subtext"))  $("loading-subtext").textContent  = hasKey ? "Fetching live AI recommendations" : "Using local component database";

  steps.forEach(id => { const el=$(id); if(el){ el.className=""; el.textContent=labels[steps.indexOf(id)]; } });
  let i = 0;
  const iv = setInterval(() => {
    if (i > 0 && $(steps[i-1])) { $(steps[i-1]).classList.remove("active"); $(steps[i-1]).classList.add("done"); $(steps[i-1]).textContent = "✓ " + labels[i-1]; }
    if (i < steps.length && $(steps[i])) { $(steps[i]).classList.add("active"); i++; }
    else clearInterval(iv);
  }, 500);
}

/* ─── RENDER BUILDER ───────────────────────────────────────── */
function renderBuilder() {
  const container = $("categories-container");
  if (!container) return;
  container.innerHTML = "";

  const region = REGIONS[state.region];
  const purposeLabels = { gaming:"🎮 Gaming", creative:"🎬 Creative", workstation:"🤖 Workstation" };

  if ($("topbar-budget-label")) $("topbar-budget-label").textContent = region.symbol + " " + fmt(state.budgetLocal) + " " + region.currency;
  if ($("topbar-purpose-label")) $("topbar-purpose-label").textContent = purposeLabels[state.purpose] || state.purpose;
  if ($("header-budget-display")) $("header-budget-display").textContent = region.symbol + " " + fmt(state.budgetLocal);
  if ($("sidebar-budget-of")) $("sidebar-budget-of").textContent = "of " + region.symbol + " " + fmt(state.budgetLocal);

  const aiBadge = $("topbar-ai-badge");
  if (aiBadge) aiBadge.classList.toggle("hidden", !state.usedGemini);

  Object.keys(state.allOptions).forEach(cat => {
    const meta = COMPONENT_META[cat], options = state.allOptions[cat];
    if (!meta || !options) return;

    const block = document.createElement("div");
    block.className = "category-block scroll-reveal";
    block.innerHTML = `
      <div class="category-header">
        <div class="category-title">
          <span class="category-icon">${meta.icon}</span>
          <h3>${meta.label}</h3>
        </div>
        <span class="selection-badge" id="badge-${cat}">No selection</span>
      </div>
      <div class="options-grid" id="grid-${cat}">
        ${options.map((opt, i) => renderOptionCard(cat, opt, i)).join("")}
      </div>`;
    container.appendChild(block);
  });

  container.addEventListener("click", e => {
    const card = e.target.closest(".option-card");
    if (card) { triggerRipple(card, e); selectComponent(card.dataset.cat, parseInt(card.dataset.idx)); }
  });

  const backBtn = $("back-btn");
  if (backBtn) backBtn.onclick = () => { state.components = {}; history.back(); };

  const saveBtn = $("save-btn");
  if (saveBtn) saveBtn.onclick = () => saveBuild();

  updateSummary();
}

/* ─── OPTION CARD ──────────────────────────────────────────── */
function renderOptionCard(cat, opt, idx) {
  const r = REGIONS[state.region];
  const tierClass = { budget:"tier-budget", mid:"tier-mid", high:"tier-high" }[opt.tier] || "tier-mid";
  const condClass = opt.isUsed ? "cond-used" : "cond-new";
  const condLabel = opt.isUsed ? "♻ Used/Alt" : "✦ New";
  const priceText = opt.priceUSD === 0 ? "Free" : r.symbol + " " + fmt(opt.priceLocal);
  return `<div class="option-card" data-cat="${cat}" data-idx="${idx}">
    <span class="option-tier ${tierClass}">${opt.tierLabel || opt.tier}</span>
    <div class="option-name">${opt.name}</div>
    <div class="option-specs">${opt.specs}</div>
    <div class="option-footer">
      <span class="option-condition ${condClass}">${condLabel}</span>
      <span class="option-price">${priceText}</span>
    </div>
  </div>`;
}

/* ─── SELECT COMPONENT ─────────────────────────────────────── */
function selectComponent(cat, idx) {
  const option = state.allOptions[cat]?.[idx];
  if (!option) return;
  state.components[cat] = option;
  $(`grid-${cat}`)?.querySelectorAll(".option-card").forEach((c, i) => c.classList.toggle("selected", i === idx));
  const badge = $(`badge-${cat}`);
  if (badge) { badge.textContent = option.name.split(" ").slice(0,3).join(" "); badge.classList.add("visible"); }
  updateSummary();
}

/* ─── UPDATE SUMMARY ───────────────────────────────────────── */
function updateSummary() {
  const list = $("summary-list");
  if (!list) return;
  list.innerHTML = "";
  const r = REGIONS[state.region];
  let totalLocal = 0, selected = 0;

  Object.keys(COMPONENT_META).forEach(cat => {
    const opt = state.components[cat];
    if (!opt) return;
    selected++;
    totalLocal += opt.priceLocal;
    list.innerHTML += `<div class="summary-item">
      <span class="sum-icon">${COMPONENT_META[cat].icon}</span>
      <div class="sum-info">
        <div class="sum-cat">${COMPONENT_META[cat].label}</div>
        <div class="sum-name">${opt.name}</div>
      </div>
      <span class="sum-price">${opt.priceUSD===0?"Free":r.symbol+" "+fmt(opt.priceLocal)}</span>
    </div>`;
  });

  const pct = Math.min((totalLocal / state.budgetLocal) * 100, 100);
  const bar = $("budget-progress-bar");
  if (bar) { bar.style.width = pct + "%"; bar.classList.toggle("over-budget", totalLocal > state.budgetLocal * 1.05); }
  if ($("sidebar-total-display")) $("sidebar-total-display").textContent = r.symbol + " " + fmt(totalLocal);
  if ($("sidebar-budget-pct"))    $("sidebar-budget-pct").textContent    = Math.round(pct) + "%";
  if ($("save-btn"))              $("save-btn").disabled = selected === 0;
}

/* ─── GENERATE INVOICE ─────────────────────────────────────── */
function saveBuild() {
  const r = REGIONS[state.region];
  let totalLocal = 0;

  // Fill customer info
  const now = new Date();
  const dtStr = now.toLocaleDateString("en-PK", { year:"numeric", month:"long", day:"numeric" })
               + " · " + now.toLocaleTimeString("en-PK", { hour:"2-digit", minute:"2-digit" });

  if ($("invoice-customer")) $("invoice-customer").textContent = state.customerName || "Guest";
  if ($("invoice-datetime")) $("invoice-datetime").textContent = dtStr;
  if ($("invoice-currency")) $("invoice-currency").textContent = r.currency + " (" + r.symbol + ")";
  const pl = { gaming:"High FPS Gaming", creative:"Rendering & Production", workstation:"AI & Workstation" };
  if ($("invoice-purpose"))  $("invoice-purpose").textContent  = pl[state.purpose] || state.purpose;

  // Component rows
  let itemsHTML = "";
  Object.keys(state.components).forEach(cat => {
    const opt = state.components[cat];
    totalLocal += opt.priceLocal;
    const priceStr = opt.priceUSD === 0 ? "Free" : r.symbol + " " + fmt(opt.priceLocal);
    itemsHTML += `<div class="invoice-row">
      <span class="irow-cat">${COMPONENT_META[cat].icon} ${COMPONENT_META[cat].label}</span>
      <span class="irow-name">${opt.name}<br><small class="irow-specs">${opt.specs}</small></span>
      <span class="irow-price">${priceStr}</span>
    </div>`;
  });
  $("receipt-items").innerHTML = itemsHTML;

  // Technician fee
  const techFee = getTechnicianFee(state.region);
  const grandTotal = totalLocal + techFee;

  $("receipt-totals").innerHTML = `
    <div class="invoice-total-row"><span>Components Subtotal</span><span>${r.symbol} ${fmt(totalLocal)}</span></div>
    <div class="invoice-total-row tech-fee"><span>Technician / Assembly Fee</span><span>${r.symbol} ${fmt(techFee)}</span></div>
    <div class="invoice-total-row grand"><span>GRAND TOTAL</span><span>${r.symbol} ${fmt(grandTotal)}</span></div>`;

  $("receipt-modal")?.classList.remove("hidden");
}

/* ─── PRINT INVOICE ────────────────────────────────────────── */
function printInvoice() {
  window.print();
}

/* ─── MODAL HELPERS ────────────────────────────────────────── */
function showBudgetModal(min, sym) {
  const el = $("modal-min-amount");
  if (el) el.textContent = sym + " " + Math.round(min).toLocaleString();
  $("budget-modal")?.classList.remove("hidden");
}
function hideBudgetModal() { $("budget-modal")?.classList.add("hidden"); }

/* ─── RIPPLE ───────────────────────────────────────────────── */
function triggerRipple(btn, event) {
  const ripple = btn.querySelector(".btn-ripple");
  if (!ripple) return;
  const rect = btn.getBoundingClientRect();
  ripple.style.left = (event.clientX - rect.left) + "px";
  ripple.style.top  = (event.clientY - rect.top)  + "px";
  btn.classList.remove("rippling"); void btn.offsetWidth; btn.classList.add("rippling");
  btn.addEventListener("animationend", () => btn.classList.remove("rippling"), { once: true });
}

/* ─── CURSOR GLOW ──────────────────────────────────────────── */
function initCursor() {
  const glow = $("cursor-glow");
  if (!glow) return;
  let mx=0, my=0, cx=0, cy=0;
  document.addEventListener("mousemove", e => { mx=e.clientX; my=e.clientY; });
  (function loop(){ cx+=(mx-cx)*0.08; cy+=(my-cy)*0.08; glow.style.left=cx+"px"; glow.style.top=cy+"px"; requestAnimationFrame(loop); })();
}

/* ─── PARTICLES ────────────────────────────────────────────── */
function initParticles() {
  const canvas = $("particle-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W = canvas.width = window.innerWidth, H = canvas.height = window.innerHeight;
  window.addEventListener("resize", () => { W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight; });
  const dots = [
    ...Array.from({length:30}, () => ({ x:Math.random()*W, y:Math.random()*H, r:Math.random()*1.5+0.4, dx:(Math.random()-.5)*.3, dy:(Math.random()-.5)*.3, o:Math.random()*.25+.05, type:"red" })),
    ...Array.from({length:15}, () => ({ x:Math.random()*W, y:Math.random()*H, r:Math.random()*.8+.2,   dx:(Math.random()-.5)*.2, dy:(Math.random()-.5)*.2, o:Math.random()*.12+.03, type:"white" })),
  ];
  (function frame(){ ctx.clearRect(0,0,W,H); dots.forEach(d=>{ d.x+=d.dx; d.y+=d.dy; if(d.x<0)d.x=W; if(d.x>W)d.x=0; if(d.y<0)d.y=H; if(d.y>H)d.y=0; ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,Math.PI*2); ctx.fillStyle=d.type==="red"?`rgba(232,0,26,${d.o})`:`rgba(255,255,255,${d.o})`; ctx.fill(); }); requestAnimationFrame(frame); })();
}

/* ─── FLOATING ICONS ───────────────────────────────────────── */
function initFloatingIcons() {
  const container = $("floating-icons");
  if (!container) return;
  const icons = ["🖥️","💻","⌨️","🖱️","🎮","💾","🔲","📡","⚡","🎧","❄️","🔌","💿"];
  for (let i = 0; i < 14; i++) {
    const el = document.createElement("div");
    el.className = "float-icon";
    el.textContent = icons[Math.floor(Math.random()*icons.length)];
    const dur = 18 + Math.random()*24;
    el.style.cssText = `left:${Math.random()*100}%;font-size:${1.4+Math.random()*1.8}rem;animation-duration:${dur}s;animation-delay:${-(Math.random()*dur)}s;`;
    container.appendChild(el);
  }
}

/* ─── SCROLL REVEAL ────────────────────────────────────────── */
function initScrollReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add("revealed"); obs.unobserve(e.target); } });
  }, { threshold: 0.07 });
  document.querySelectorAll(".category-block").forEach((el, i) => { el.style.transitionDelay=(i*.04)+"s"; obs.observe(el); });
}

/* ─── INIT ─────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  initCursor();
  initParticles();
  initFloatingIcons();
  setupOnboarding();

  // Seed history with onboarding as the root — no going further back
  history.replaceState({ screen:"onboarding", region:"PK", budgetLocal:150000, purpose:"gaming" }, "", "#onboarding");

  $("modal-close-btn")?.addEventListener("click", hideBudgetModal);
  $("budget-modal")?.addEventListener("click", e => { if(e.target===$("budget-modal")) hideBudgetModal(); });

  $("receipt-close-btn")?.addEventListener("click", () => $("receipt-modal")?.classList.add("hidden"));
  $("receipt-modal")?.addEventListener("click", e => { if(e.target===$("receipt-modal")) $("receipt-modal").classList.add("hidden"); });

  $("print-btn")?.addEventListener("click", printInvoice);
});
