/* =============================================
   FORGE — AI PC Builder  v5.0
   Gemini AI powered + smart static fallback
   ============================================= */

// ── REGION CONFIG ──────────────────────────────
const REGIONS = {
  PK: { currency: "PKR", symbol: "₨",  rate: 278.5, minBudget: 20000 },
  US: { currency: "USD", symbol: "$",  rate: 1.0,   minBudget: 80    },
  GB: { currency: "GBP", symbol: "£",  rate: 0.79,  minBudget: 65    },
  EU: { currency: "EUR", symbol: "€",  rate: 0.92,  minBudget: 75    },
  IN: { currency: "INR", symbol: "₹",  rate: 83.5,  minBudget: 6000  },
  CA: { currency: "CAD", symbol: "C$", rate: 1.36,  minBudget: 110   },
  AU: { currency: "AUD", symbol: "A$", rate: 1.52,  minBudget: 120   },
};

const COMPONENT_META = {
  cpu:        { icon: "🔲", label: "Processor (CPU)"         },
  gpu:        { icon: "🎮", label: "Graphics Card (GPU)"      },
  mb:         { icon: "🔌", label: "Motherboard"               },
  ram:        { icon: "💾", label: "Memory (RAM)"              },
  storage:    { icon: "💿", label: "Storage (SSD/HDD)"        },
  psu:        { icon: "⚡", label: "Power Supply (PSU)"       },
  cooler:     { icon: "❄️", label: "CPU Cooler"               },
  case:       { icon: "🖥️", label: "PC Case"                  },
  monitor:    { icon: "🖵",  label: "Monitor"                  },
  keyboard:   { icon: "⌨️", label: "Keyboard"                 },
  mouse:      { icon: "🖱️", label: "Mouse"                    },
  headset:    { icon: "🎧", label: "Headset / Audio"          },
  networking: { icon: "📡", label: "Networking (WiFi/Router)" },
  os:         { icon: "💻", label: "Operating System"         },
};

// ── APP STATE ──────────────────────────────────
const state = {
  region: "PK",
  budgetLocal: 150000,
  budgetUSD: 0,
  purpose: "gaming",
  components: {},
  allOptions: {},
  totalCategories: 0,
};

const $ = id => document.getElementById(id);

// ══════════════════════════════════════════════
//  BUDGET TIER CALCULATOR
//  All thresholds in USD for internal logic.
//  Input budgetUSD is derived from budgetLocal / rate.
// ══════════════════════════════════════════════
function getBudgetTier(budgetUSD) {
  if (budgetUSD < 120)  return "scrappy";    // ~33,000 PKR — old used parts only
  if (budgetUSD < 220)  return "ultraBudget";// ~61,000 PKR
  if (budgetUSD < 400)  return "budget";     // ~111,000 PKR
  if (budgetUSD < 800)  return "mid";
  if (budgetUSD < 1800) return "high";
  return "flagship";
}

// ══════════════════════════════════════════════
//  CURSOR GLOW + PARTICLES
// ══════════════════════════════════════════════
function initCursor() {
  const glow = $("cursor-glow");
  let mx = -999, my = -999;
  document.addEventListener("mousemove", e => {
    mx = e.clientX; my = e.clientY;
    glow.style.left = mx + "px";
    glow.style.top  = my + "px";
  });
}

function initParticles() {
  const canvas = $("particle-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W = canvas.width  = window.innerWidth;
  let H = canvas.height = window.innerHeight;

  window.addEventListener("resize", () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });

  const DOTS = 55;
  const dots = Array.from({ length: DOTS }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.2 + 0.3,
    dx: (Math.random() - 0.5) * 0.25,
    dy: (Math.random() - 0.5) * 0.25,
    o: Math.random() * 0.4 + 0.1,
  }));

  function frame() {
    ctx.clearRect(0, 0, W, H);
    dots.forEach(d => {
      d.x += d.dx; d.y += d.dy;
      if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
      if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212,240,74,${d.o})`;
      ctx.fill();
    });
    for (let i = 0; i < DOTS; i++) {
      for (let j = i + 1; j < DOTS; j++) {
        const dx = dots[i].x - dots[j].x;
        const dy = dots[i].y - dots[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(dots[i].x, dots[i].y);
          ctx.lineTo(dots[j].x, dots[j].y);
          ctx.strokeStyle = `rgba(212,240,74,${0.06 * (1 - dist/100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(frame);
  }
  frame();
}

// ══════════════════════════════════════════════
//  SCROLL REVEAL
// ══════════════════════════════════════════════
function initScrollReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("revealed");
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });

  document.querySelectorAll(".scroll-reveal, .category-block").forEach(el => {
    observer.observe(el);
  });
}

// ══════════════════════════════════════════════
//  BUDGET MODAL
// ══════════════════════════════════════════════
function showBudgetModal(minAmount, symbol) {
  $("modal-min-amount").textContent = symbol + " " + Math.round(minAmount).toLocaleString();
  $("budget-modal").classList.remove("hidden");
}
function hideBudgetModal() {
  $("budget-modal").classList.add("hidden");
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  initCursor();
  initParticles();
  setupOnboarding();

  $("modal-close-btn").addEventListener("click", hideBudgetModal);
  $("budget-modal").addEventListener("click", e => {
    if (e.target === $("budget-modal")) hideBudgetModal();
  });
  $("receipt-close-btn").addEventListener("click", () => {
    $("receipt-modal").classList.add("hidden");
  });
  $("receipt-modal").addEventListener("click", e => {
    if (e.target === $("receipt-modal")) $("receipt-modal").classList.add("hidden");
  });
});

// ══════════════════════════════════════════════
//  ONBOARDING
// ══════════════════════════════════════════════
function setupOnboarding() {
  const regionSel = $("region-select");
  const budgetInp = $("budget-input");

  regionSel.addEventListener("change", () => {
    const r = REGIONS[regionSel.value];
    $("budget-symbol").textContent  = r.symbol;
    $("currency-label").textContent = r.currency;
  });

  document.querySelectorAll(".purpose-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".purpose-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.purpose = btn.dataset.purpose;
    });
  });

  $("start-btn").addEventListener("click", () => {
    state.region      = regionSel.value;
    state.budgetLocal = parseFloat(budgetInp.value) || 0;
    state.budgetUSD   = state.budgetLocal / REGIONS[state.region].rate;
    const r = REGIONS[state.region];

    if (state.budgetLocal < r.minBudget) {
      showBudgetModal(r.minBudget, r.symbol);
      return;
    }

    showScreen("loading");
    runLoadingSequence();
    fetchComponents();
  });
}

// ══════════════════════════════════════════════
//  SCREEN TRANSITIONS
// ══════════════════════════════════════════════
function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const map = { onboarding: "screen-onboarding", loading: "screen-loading", builder: "screen-builder" };
  $(map[name]).classList.add("active");
}

// ══════════════════════════════════════════════
//  LOADING SEQUENCE
// ══════════════════════════════════════════════
function runLoadingSequence() {
  const steps  = ["ls1","ls2","ls3","ls4"];
  const labels = [
    "Analysing budget range",
    "Fetching component data",
    "Matching compatibility",
    "Calculating value tiers",
  ];
  let i = 0;
  const iv = setInterval(() => {
    if (i > 0) {
      $(steps[i-1]).classList.remove("active");
      $(steps[i-1]).classList.add("done");
      $(steps[i-1]).textContent = "✓ " + labels[i-1];
    }
    if (i < steps.length) {
      $(steps[i]).classList.add("active");
      $(steps[i]).textContent = labels[i];
      i++;
    } else {
      clearInterval(iv);
    }
  }, 900);
}

// ══════════════════════════════════════════════
//  BUDGET DISTRIBUTION HELPER
//  Returns how much of the total budget each
//  category can realistically spend, so the
//  prompt gives Gemini concrete price ceilings.
// ══════════════════════════════════════════════
function getBudgetDistribution(budgetUSD, purpose, tier) {
  // Peripheral budget caps by tier (USD)
  const peripheralCaps = {
    scrappy:     { monitor: 40, keyboard: 3,  mouse: 3,  headset: 4,  networking: 5  },
    ultraBudget: { monitor: 60, keyboard: 6,  mouse: 5,  headset: 8,  networking: 8  },
    budget:      { monitor: 90, keyboard: 15, mouse: 12, headset: 18, networking: 15 },
    mid:         { monitor: 180,keyboard: 55, mouse: 45, headset: 60, networking: 40 },
    high:        { monitor: 400,keyboard: 120,mouse: 100,headset: 150,networking: 100},
    flagship:    { monitor: 800,keyboard: 250,mouse: 180,headset: 300,networking: 250},
  };

  // Core component allocation (% of budget)
  const alloc = {
    scrappy:     { cpu: 0.22, gpu: 0.28, mb: 0.12, ram: 0.10, storage: 0.08, psu: 0.08, cooler: 0.04, case: 0.08 },
    ultraBudget: { cpu: 0.22, gpu: 0.28, mb: 0.12, ram: 0.10, storage: 0.08, psu: 0.08, cooler: 0.04, case: 0.08 },
    budget:      { cpu: 0.20, gpu: 0.30, mb: 0.10, ram: 0.10, storage: 0.08, psu: 0.08, cooler: 0.04, case: 0.10 },
    mid:         { cpu: 0.18, gpu: 0.32, mb: 0.10, ram: 0.08, storage: 0.08, psu: 0.07, cooler: 0.05, case: 0.12 },
    high:        { cpu: 0.16, gpu: 0.35, mb: 0.10, ram: 0.08, storage: 0.08, psu: 0.07, cooler: 0.06, case: 0.10 },
    flagship:    { cpu: 0.14, gpu: 0.38, mb: 0.10, ram: 0.08, storage: 0.08, psu: 0.07, cooler: 0.06, case: 0.09 },
  };

  // Creative builds shift more to RAM/storage
  if (purpose === "creative") {
    const a = alloc[tier];
    if (a) {
      const shift = 0.06;
      a.gpu     = Math.max(0.12, a.gpu - shift);
      a.ram     = Math.min(0.18, a.ram + shift * 0.5);
      a.storage = Math.min(0.16, a.storage + shift * 0.5);
    }
  }

  const a = alloc[tier] || alloc.budget;
  const p = peripheralCaps[tier] || peripheralCaps.budget;

  const coreTotal = Object.values(a).reduce((s, v) => s + v, 0);
  const peripheralTotal = Object.values(p).reduce((s, v) => s + v, 0);
  const osAlloc = tier === "scrappy" ? 0 : 15;

  const coreUSD = Math.max(0, budgetUSD - peripheralTotal - osAlloc);

  return {
    cpu:        Math.round(coreUSD * (a.cpu / coreTotal)),
    gpu:        Math.round(coreUSD * (a.gpu / coreTotal)),
    mb:         Math.round(coreUSD * (a.mb  / coreTotal)),
    ram:        Math.round(coreUSD * (a.ram / coreTotal)),
    storage:    Math.round(coreUSD * (a.storage / coreTotal)),
    psu:        Math.round(coreUSD * (a.psu / coreTotal)),
    cooler:     Math.round(coreUSD * (a.cooler / coreTotal)),
    case:       Math.round(coreUSD * (a.case / coreTotal)),
    monitor:    p.monitor,
    keyboard:   p.keyboard,
    mouse:      p.mouse,
    headset:    p.headset,
    networking: p.networking,
    os:         osAlloc,
  };
}

// ══════════════════════════════════════════════
//  COMPONENT FETCH — Gemini AI powered
// ══════════════════════════════════════════════
async function fetchComponents() {
  const region   = state.region;
  const budget   = state.budgetLocal;
  const purpose  = state.purpose;
  const currency = REGIONS[region].currency;
  const symbol   = REGIONS[region].symbol;
  const r        = REGIONS[region];
  const tier     = getBudgetTier(state.budgetUSD);
  const dist     = getBudgetDistribution(state.budgetUSD, purpose, tier);

  // Convert distribution back to local currency for prompt clarity
  const distLocal = {};
  Object.keys(dist).forEach(k => { distLocal[k] = Math.round(dist[k] * r.rate); });

  // Human-readable tier descriptions for Gemini
  const tierDescriptions = {
    scrappy:     "very tight — must use 5th/6th gen Intel (i3/i5/i7 LGA1151) or AMD Ryzen 1000/2000 series used CPUs, used GTX 900/1000 series or RX 470/480/570/580 GPUs from local marketplaces. Peripherals must be ultra-cheap local brands.",
    ultraBudget: "low — use 8th–10th gen Intel or AMD Ryzen 3000/4000 used CPUs, used GTX 1060/1650 or RX 580/5500 XT GPUs. Budget local brand peripherals.",
    budget:      "moderate — use 10th–12th gen Intel or AMD Ryzen 5000 series CPUs, RTX 3060 / RX 6600 XT range GPUs. Mid-tier keyboards and mice.",
    mid:         "mid-range — 12th/13th gen Intel or Ryzen 7000 CPUs, RTX 4070 / RX 7900 XT range GPUs. Decent peripherals.",
    high:        "high-end — latest Intel or AMD CPUs, RTX 4080/4090 range. Premium peripherals.",
    flagship:    "flagship/no-compromise — best available CPUs and GPUs, RTX 5090 / enthusiast tier. Luxury peripherals.",
  };

  const prompt = `You are an expert PC builder for the ${region} market. A customer has a TOTAL budget of ${symbol}${budget} ${currency} for a ${purpose} PC. The budget tier is: ${tierDescriptions[tier]}

CRITICAL BUDGET RULES — read carefully:
- The TOTAL PRICE of ALL selected mid-tier components across all 14 categories MUST NOT exceed ${symbol}${budget} ${currency}
- Peripherals (monitor, keyboard, mouse, headset, networking) must be cheap for low budgets — do NOT recommend expensive peripherals when the total budget is tight
- For scrappy/ultraBudget tiers: keyboards ≤${symbol}${distLocal.keyboard} ${currency}, mice ≤${symbol}${distLocal.mouse} ${currency}, headsets ≤${symbol}${distLocal.headset} ${currency}
- These are LOCAL market prices for ${region} — account for import taxes, local availability, and currency

Per-category price CEILINGS for the MID-tier option (the most important option):
- CPU: ${symbol}${distLocal.cpu} ${currency}
- GPU: ${symbol}${distLocal.gpu} ${currency}  
- Motherboard: ${symbol}${distLocal.mb} ${currency}
- RAM: ${symbol}${distLocal.ram} ${currency}
- Storage: ${symbol}${distLocal.storage} ${currency}
- PSU: ${symbol}${distLocal.psu} ${currency}
- Cooler: ${symbol}${distLocal.cooler} ${currency}
- Case: ${symbol}${distLocal.case} ${currency}
- Monitor: ${symbol}${distLocal.monitor} ${currency}
- Keyboard: ${symbol}${distLocal.keyboard} ${currency}
- Mouse: ${symbol}${distLocal.mouse} ${currency}
- Headset: ${symbol}${distLocal.headset} ${currency}
- Networking: ${symbol}${distLocal.networking} ${currency}
- OS: ${symbol}${distLocal.os} ${currency}

COMPONENT SELECTION RULES for ${tier} tier:
${tier === "scrappy" ? `
- CPU: MUST be 5th/6th gen Intel (i3-6100, i5-6400, i5-6500, i7-6700) or AMD Ryzen 3 1200/1300X / Ryzen 5 1600 — all USED from local marketplace
- GPU: MUST be used GTX 950/960/1050Ti/1060 OR used RX 470/480/570/580 — these are widely available used in PK for 8,000–18,000 PKR
- Keyboard: local cheap membrane keyboard (e.g. Rapoo, A4Tech, local brands) — 300–600 PKR
- Mouse: local optical wired mouse (e.g. A4Tech, Rapoo) — 300–500 PKR
- Headset: basic local wired headset (e.g. Redragon H120, Havit) — 800–1500 PKR
- Monitor: second-hand 20"–22" 1080p LCD — 5,000–9,000 PKR
` : ""}
${tier === "ultraBudget" ? `
- CPU: 8th–10th gen Intel used (i3-8100, i5-8400, i5-9400F, i5-10400F) OR AMD Ryzen 5 3600 used
- GPU: Used GTX 1060 6GB, GTX 1650 Super, or RX 5500 XT — available locally used
- Keyboard: budget local brands 600–1500 PKR
- Mouse: budget wired 500–1200 PKR
- Headset: basic 1500–2500 PKR
` : ""}
- For the "os" category always include: Ubuntu (free), Windows 11 Home OEM (cheapest), Windows 11 Pro
- Use REAL product model names actually available in the ${region} market
- Mark used/second-hand items with condition: "used"

Return ONLY a valid JSON array — no markdown, no backticks, no explanation.
Each object must have exactly these fields:
{
  "category": "cpu",
  "name": "Intel Core i5-6500",
  "priceLocal": 8500,
  "priceUSD": 30,
  "specs": "4c/4t · 3.2–3.6GHz · 6MB · LGA1151 · 6th gen",
  "condition": "used",
  "brand": "Intel",
  "tier": "budget"
}

Tier values: exactly "budget" (entry/cheapest), "mid" (middle), "high" (best option within budget ceiling)
Generate all 42 items (3 per category × 14 categories). The 3 tiers within each category should still respect the budget ceilings above — "high" option can be 20–40% above the mid ceiling but NOT wildly expensive.`;

  let geminiSucceeded = false;

  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) throw new Error("API response " + res.status);

    const data = await res.json();
    if (data.error) throw new Error(JSON.stringify(data.error));

    let raw = data.result.trim();
    raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    const items = JSON.parse(raw);
    if (!Array.isArray(items) || items.length === 0) throw new Error("Empty or invalid array from Gemini");

    const grouped = {};

    items.forEach(item => {
      const cat = item.category?.toLowerCase();
      if (!cat || !COMPONENT_META[cat]) return;
      if (!grouped[cat]) grouped[cat] = [];

      if (!item.priceLocal && item.priceUSD != null) {
        item.priceLocal = Math.round(item.priceUSD * r.rate);
      }
      if (!item.priceUSD && item.priceLocal) {
        item.priceUSD = Math.round(item.priceLocal / r.rate);
      }
      if (item.priceLocal == null) item.priceLocal = 0;
      if (item.priceUSD  == null) item.priceUSD  = 0;

      const tierMap = {
        "entry": "budget", "entry-level": "budget", "budget": "budget",
        "mid": "mid", "mid-range": "mid", "midrange": "mid",
        "premium": "high", "high": "high", "flagship": "high",
      };
      item.tier = tierMap[item.tier?.toLowerCase()] || "mid";
      if (!item.condition) item.condition = "new";

      grouped[cat].push(item);
    });

    // Fill any missing categories from static DB
    const missingCats = Object.keys(COMPONENT_META).filter(cat => !grouped[cat] || grouped[cat].length === 0);
    if (missingCats.length > 0) {
      console.warn("Gemini missing categories:", missingCats, "— filling from static DB");
      buildSmartRecommendations();
      missingCats.forEach(cat => {
        if (state.allOptions[cat]) grouped[cat] = state.allOptions[cat];
      });
    }

    Object.keys(grouped).forEach(cat => {
      const opts = grouped[cat];
      const tierOrder = { budget: 0, mid: 1, high: 2 };
      opts.sort((a, b) => (tierOrder[a.tier] || 0) - (tierOrder[b.tier] || 0));
      while (opts.length < 3) opts.push({ ...opts[opts.length - 1] });
      grouped[cat] = opts.slice(0, 3);
    });

    state.allOptions      = grouped;
    state.totalCategories = Object.keys(grouped).length;
    geminiSucceeded = true;
    console.log("✅ Gemini AI build loaded —", items.length, "items across", state.totalCategories, "categories | tier:", tier);

  } catch (err) {
    console.warn("⚠️ Gemini fetch failed, using static DB:", err.message);
    buildSmartRecommendations();
  }

  renderBuilder();
  showScreen("builder");
  setTimeout(initScrollReveal, 100);
}

// ══════════════════════════════════════════════
//  MASTER COMPONENT DATABASE  (v5 — full tiers)
//  Fallback when Gemini is unavailable.
//  "scrappy" tier added for very low budgets.
// ══════════════════════════════════════════════
const COMPONENT_DB = {

  /* ─── CPU ─── */
  cpu: {
    scrappy: [
      { name: "Intel Core i5-6500",       specs: "4c/4t · 3.2–3.6GHz · 6MB · LGA1151 · 6th gen",    condition: "used", priceUSD: 22, brand: "Intel" },
      { name: "Intel Core i3-6100",       specs: "2c/4t · 3.7GHz · 3MB · LGA1151 · 6th gen",         condition: "used", priceUSD: 14, brand: "Intel" },
      { name: "AMD Ryzen 5 1600",         specs: "6c/12t · 3.2–3.6GHz · 16MB · AM4 · 1st gen",       condition: "used", priceUSD: 28, brand: "AMD"   },
    ],
    ultraBudget: [
      { name: "Intel Core i5-9400F",      specs: "6c/6t · 2.9–4.1GHz · 9MB · LGA1151 · 9th gen",    condition: "used", priceUSD: 42, brand: "Intel" },
      { name: "Intel Core i3-10100F",     specs: "4c/8t · 3.6–4.3GHz · 6MB · LGA1200 · 10th gen",   condition: "used", priceUSD: 45, brand: "Intel" },
      { name: "AMD Ryzen 5 3600",         specs: "6c/12t · 3.6–4.2GHz · 32MB · AM4 · 3rd gen",       condition: "used", priceUSD: 55, brand: "AMD"   },
    ],
    budget: [
      { name: "Intel Core i3-12100F",     specs: "4c/8t · 3.3–4.3GHz · 12MB · LGA1700 · 12th gen",  condition: "new",  priceUSD: 72, brand: "Intel" },
      { name: "AMD Ryzen 5 5600",         specs: "6c/12t · 3.5–4.4GHz · 32MB · AM4 · Zen 3",         condition: "new",  priceUSD: 100, brand: "AMD"  },
      { name: "Intel Core i5-12400F",     specs: "6c/12t · 2.5–4.4GHz · 18MB · LGA1700 · 12th gen",  condition: "new",  priceUSD: 110, brand: "Intel"},
    ],
    mid: [
      { name: "AMD Ryzen 5 5600X",        specs: "6c/12t · 3.7–4.6GHz · 35MB · AM4",                 condition: "new", priceUSD: 130, brand: "AMD"   },
      { name: "Intel Core i5-13600K",     specs: "14c/20t · 3.5–5.1GHz · 24MB · LGA1700",            condition: "new", priceUSD: 250, brand: "Intel" },
      { name: "AMD Ryzen 7 7700X",        specs: "8c/16t · 4.5–5.4GHz · 40MB · AM5",                 condition: "new", priceUSD: 280, brand: "AMD"   },
    ],
    high: [
      { name: "AMD Ryzen 7 7800X3D",      specs: "8c/16t · 4.5–5.0GHz · 96MB 3D V-Cache · AM5",      condition: "new", priceUSD: 370, brand: "AMD"   },
      { name: "Intel Core i9-14900KS",    specs: "24c/32t · 3.2–6.2GHz · 36MB · LGA1700",            condition: "new", priceUSD: 499, brand: "Intel" },
      { name: "AMD Ryzen 9 9950X",        specs: "16c/32t · 4.3–5.7GHz · 80MB · AM5 · Zen 5",        condition: "new", priceUSD: 649, brand: "AMD"   },
    ],
    flagship: [
      { name: "AMD Ryzen 9 9950X3D",      specs: "16c/32t · 5.7GHz · 128MB 3D V-Cache · AM5",        condition: "new", priceUSD: 850,  brand: "AMD"   },
      { name: "Intel Core i9-14900KS",    specs: "24c/32t · 6.2GHz boost · 36MB · LGA1700",          condition: "new", priceUSD: 499,  brand: "Intel" },
      { name: "AMD Threadripper PRO 7985WX", specs: "64c/128t · 5.1GHz · 256MB · sWRX90",            condition: "new", priceUSD: 2499, brand: "AMD"   },
    ],
  },

  /* ─── GPU ─── */
  gpu: {
    scrappy: [
      { name: "NVIDIA GTX 1050 Ti 4GB",   specs: "4GB GDDR5 · 768 CUDA · 1080p entry · used",        condition: "used", priceUSD: 40, brand: "NVIDIA" },
      { name: "AMD RX 570 8GB",           specs: "8GB GDDR5 · 2048 shaders · 1080p solid · used",    condition: "used", priceUSD: 45, brand: "AMD"    },
      { name: "NVIDIA GTX 1060 6GB",      specs: "6GB GDDR5 · 1280 CUDA · 1080p capable · used",     condition: "used", priceUSD: 55, brand: "NVIDIA" },
    ],
    ultraBudget: [
      { name: "NVIDIA GTX 1060 6GB",      specs: "6GB GDDR5 · 1280 CUDA · 1080p capable · used",     condition: "used", priceUSD: 60, brand: "NVIDIA" },
      { name: "AMD RX 580 8GB",           specs: "8GB GDDR5 · 2304 shaders · 1080p solid · used",    condition: "used", priceUSD: 65, brand: "AMD"    },
      { name: "NVIDIA GTX 1650 Super",    specs: "4GB GDDR6 · 1280 CUDA · 1080p strong · used",      condition: "used", priceUSD: 80, brand: "NVIDIA" },
    ],
    budget: [
      { name: "AMD RX 6600 8GB",          specs: "8GB GDDR6 · 2048 shaders · 1080p/1440p",           condition: "new",  priceUSD: 170, brand: "AMD"    },
      { name: "NVIDIA RTX 3060 12GB",     specs: "12GB GDDR6 · 3584 CUDA · DLSS 2 · 1080p/1440p",   condition: "used", priceUSD: 190, brand: "NVIDIA" },
      { name: "AMD RX 7600 8GB",          specs: "8GB GDDR6 · 2048 shaders · PCIe 4.0 · 1080p/1440p",condition: "new",  priceUSD: 230, brand: "AMD"    },
    ],
    mid: [
      { name: "NVIDIA RTX 4070 12GB",     specs: "12GB GDDR6X · 5888 CUDA · DLSS 3 · 1440p",        condition: "new", priceUSD: 550, brand: "NVIDIA" },
      { name: "AMD Radeon RX 7900 XT",    specs: "20GB GDDR6 · 5376 shaders · PCIe 4.0 · 4K",       condition: "new", priceUSD: 650, brand: "AMD"    },
      { name: "NVIDIA RTX 4070 Ti Super", specs: "16GB GDDR6X · 8448 CUDA · DLSS 3.5 · 4K",         condition: "new", priceUSD: 780, brand: "NVIDIA" },
    ],
    high: [
      { name: "NVIDIA RTX 4080 Super",    specs: "16GB GDDR6X · 10240 CUDA · DLSS 3.5 · 4K ultra",  condition: "new", priceUSD: 999,  brand: "NVIDIA" },
      { name: "AMD Radeon RX 7900 XTX",   specs: "24GB GDDR6 · 6144 shaders · 4K ultra",            condition: "new", priceUSD: 950,  brand: "AMD"    },
      { name: "NVIDIA RTX 4090 24GB",     specs: "24GB GDDR6X · 16384 CUDA · DLSS 3.5 · 4K beast",  condition: "new", priceUSD: 1599, brand: "NVIDIA" },
    ],
    flagship: [
      { name: "NVIDIA GeForce RTX 5090",  specs: "32GB GDDR7 · 21760 CUDA · DLSS 4 · 8K ready",     condition: "new", priceUSD: 1999, brand: "NVIDIA" },
      { name: "NVIDIA GeForce RTX 5080",  specs: "16GB GDDR7 · 10752 CUDA · DLSS 4 · 4K ultra",     condition: "new", priceUSD: 1199, brand: "NVIDIA" },
      { name: "AMD Radeon RX 9070 XT",    specs: "16GB GDDR6 · RDNA 4 · AI supersampling · 4K",      condition: "new", priceUSD: 699,  brand: "AMD"    },
    ],
  },

  /* ─── MOTHERBOARD ─── */
  mb: {
    scrappy: [
      { name: "Gigabyte H110M-S2H",       specs: "LGA1151 · H110 · DDR4 · Micro-ATX · 6th/7th gen", condition: "used", priceUSD: 20, brand: "Gigabyte" },
      { name: "MSI H110M Pro-VD",         specs: "LGA1151 · H110 · DDR4 · Micro-ATX",               condition: "used", priceUSD: 22, brand: "MSI"      },
      { name: "Gigabyte A320M-S2H",       specs: "AM4 · A320 · DDR4 · Micro-ATX · Ryzen 1000/2000", condition: "used", priceUSD: 24, brand: "Gigabyte" },
    ],
    ultraBudget: [
      { name: "MSI H510M-A Pro",          specs: "LGA1200 · H510 · DDR4 · M.2 · Micro-ATX",         condition: "new", priceUSD: 60,  brand: "MSI"      },
      { name: "Gigabyte A520M S2H",       specs: "AM4 · A520 · DDR4 · M.2 · Micro-ATX",             condition: "new", priceUSD: 65,  brand: "Gigabyte" },
      { name: "ASRock B450M Pro4",        specs: "AM4 · B450 · DDR4 · M.2 · Micro-ATX",             condition: "new", priceUSD: 70,  brand: "ASRock"   },
    ],
    budget: [
      { name: "MSI Pro H610M-G",          specs: "LGA1700 · H610 · DDR4 · M.2 · Micro-ATX",         condition: "new", priceUSD: 72,  brand: "MSI"      },
      { name: "ASRock B550M Pro4",        specs: "AM4 · B550 · DDR4 · dual M.2 · Micro-ATX",        condition: "new", priceUSD: 85,  brand: "ASRock"   },
      { name: "Gigabyte B660M DS3H",      specs: "LGA1700 · B660 · DDR4 · M.2 · Micro-ATX",         condition: "new", priceUSD: 90,  brand: "Gigabyte" },
    ],
    mid: [
      { name: "ASUS TUF B650-Plus Wi-Fi", specs: "AM5 · B650 · DDR5 · M.2×4 · Wi-Fi 6 · USB-C",    condition: "new", priceUSD: 175, brand: "ASUS"     },
      { name: "MSI MAG X670E Tomahawk",   specs: "AM5 · X670E · DDR5 · M.2×4 · PCIe 5.0 · Wi-Fi 6E",condition: "new", priceUSD: 260, brand: "MSI"      },
      { name: "Gigabyte Z790 Aorus Elite",specs: "LGA1700 · Z790 · DDR5 · M.2×5 · USB4 · Wi-Fi 6E", condition: "new", priceUSD: 280, brand: "Gigabyte" },
    ],
    high: [
      { name: "ASUS ROG Crosshair X670E Hero", specs: "AM5 · X670E · DDR5 · M.2×5 · PCIe 5.0 · Wi-Fi 6E", condition: "new", priceUSD: 420, brand: "ASUS" },
      { name: "MSI MEG Z790 Godlike",     specs: "LGA1700 · Z790 · DDR5 · M.2×6 · 10G LAN · TB4",  condition: "new", priceUSD: 650, brand: "MSI"  },
      { name: "ASUS ROG Maximus Z790 Apex",specs: "LGA1700 · Z790 · DDR5 OC · PCIe 5.0 · extreme OC",condition: "new", priceUSD: 800, brand: "ASUS" },
    ],
    flagship: [
      { name: "ASUS ROG Crosshair X870E Hero",specs: "AM5 · X870E · DDR5 · M.2×5 · PCIe 5.0 · Wi-Fi 7", condition: "new", priceUSD: 550,  brand: "ASUS" },
      { name: "MSI MEG X870E Godlike",    specs: "AM5 · X870E · DDR5 · M.2×6 · 10G LAN · Wi-Fi 7", condition: "new", priceUSD: 750,  brand: "MSI"  },
      { name: "ASUS Pro WS TRX50-SAGE",   specs: "sWRX90 · TRX50 · DDR5 · 7× PCIe 5.0 x16 · Threadripper", condition: "new", priceUSD: 1200, brand: "ASUS" },
    ],
  },

  /* ─── RAM ─── */
  ram: {
    scrappy: [
      { name: "Kingston 8GB DDR4-2133",   specs: "1×8GB · DDR4-2133 · CL15 · compatible LGA1151/AM4", condition: "used", priceUSD: 12, brand: "Kingston" },
      { name: "Corsair 16GB DDR4-2400",   specs: "2×8GB · DDR4-2400 · CL17",                          condition: "used", priceUSD: 20, brand: "Corsair"  },
      { name: "G.Skill 8GB DDR4-2666",    specs: "2×4GB · DDR4-2666 · CL19",                          condition: "used", priceUSD: 14, brand: "G.Skill"  },
    ],
    ultraBudget: [
      { name: "Corsair Vengeance 8GB DDR4",   specs: "1×8GB · DDR4-3200 · CL16",                      condition: "new",  priceUSD: 22, brand: "Corsair"  },
      { name: "Kingston 16GB DDR4-2400",      specs: "2×8GB · DDR4-2400 · CL17",                      condition: "used", priceUSD: 25, brand: "Kingston" },
      { name: "G.Skill Aegis 16GB DDR4",      specs: "2×8GB · DDR4-3200 · CL16 · XMP 2.0",            condition: "new",  priceUSD: 35, brand: "G.Skill"  },
    ],
    budget: [
      { name: "G.Skill Aegis 16GB DDR4",      specs: "2×8GB · DDR4-3200 · CL16 · XMP 2.0",            condition: "new", priceUSD: 35,  brand: "G.Skill" },
      { name: "Corsair Vengeance 16GB DDR4",   specs: "2×8GB · DDR4-3600 · CL18 · XMP 2.0",            condition: "new", priceUSD: 38,  brand: "Corsair" },
      { name: "Kingston Fury Beast 32GB DDR4", specs: "2×16GB · DDR4-3200 · CL16 · XMP",               condition: "new", priceUSD: 60,  brand: "Kingston"},
    ],
    mid: [
      { name: "G.Skill Ripjaws V 32GB DDR4",  specs: "2×16GB · DDR4-3600 · CL18 · XMP 2.0",           condition: "new", priceUSD: 75,  brand: "G.Skill" },
      { name: "Corsair Vengeance 32GB DDR5",   specs: "2×16GB · DDR5-5200 · CL38 · XMP 3.0",           condition: "new", priceUSD: 90,  brand: "Corsair" },
      { name: "G.Skill Trident Z5 32GB DDR5",  specs: "2×16GB · DDR5-6000 · CL30 · RGB · XMP 3.0",     condition: "new", priceUSD: 120, brand: "G.Skill" },
    ],
    high: [
      { name: "G.Skill Trident Z5 64GB DDR5",        specs: "2×32GB · DDR5-6000 · CL30 · RGB · XMP 3.0", condition: "new", priceUSD: 190, brand: "G.Skill" },
      { name: "Corsair Dominator Titanium 64GB DDR5", specs: "2×32GB · DDR5-6400 · CL32 · RGB · XMP 3.0", condition: "new", priceUSD: 230, brand: "Corsair" },
      { name: "G.Skill Trident Z5 RGB 96GB DDR5",    specs: "2×48GB · DDR5-6400 · CL32 · RGB",            condition: "new", priceUSD: 380, brand: "G.Skill" },
    ],
    flagship: [
      { name: "G.Skill Trident Z5 RGB 96GB DDR5",    specs: "2×48GB · DDR5-6400 · CL32 · RGB",            condition: "new", priceUSD: 380,  brand: "G.Skill" },
      { name: "Corsair Dominator Titanium 128GB DDR5",specs: "4×32GB · DDR5-6000 · CL30 · RGB · workstation",condition: "new", priceUSD: 550,  brand: "Corsair" },
      { name: "G.Skill Zeta R5 192GB DDR5 ECC",      specs: "4×48GB · DDR5-6400 · ECC · Threadripper Pro", condition: "new", priceUSD: 1200, brand: "G.Skill" },
    ],
  },

  /* ─── STORAGE ─── */
  storage: {
    scrappy: [
      { name: "WD Blue 500GB HDD",        specs: "SATA · 7200 RPM · 32MB cache · 3.5\"",              condition: "used", priceUSD: 18, brand: "WD"       },
      { name: "Kingston A400 240GB SSD",  specs: "SATA 2.5\" · 500/350 MB/s · TLC",                   condition: "new",  priceUSD: 22, brand: "Kingston" },
      { name: "WD Blue 1TB HDD",          specs: "SATA · 7200 RPM · 64MB cache · 3.5\"",              condition: "new",  priceUSD: 30, brand: "WD"       },
    ],
    ultraBudget: [
      { name: "Kingston A400 480GB SSD",  specs: "SATA 2.5\" · 500/450 MB/s · TLC",                   condition: "new", priceUSD: 32, brand: "Kingston" },
      { name: "WD Blue 1TB HDD",          specs: "SATA · 7200 RPM · 64MB cache · 3.5\"",              condition: "new", priceUSD: 38, brand: "WD"       },
      { name: "Crucial BX500 1TB SSD",    specs: "SATA 2.5\" · 540/500 MB/s · TLC",                   condition: "new", priceUSD: 48, brand: "Crucial"  },
    ],
    budget: [
      { name: "WD Blue SN580 1TB NVMe",   specs: "PCIe 4.0 · 4150/4150 MB/s · M.2 2280",             condition: "new", priceUSD: 60,  brand: "WD"      },
      { name: "Kingston NV3 2TB NVMe",    specs: "PCIe 4.0 · 3500/2800 MB/s · M.2 2280",             condition: "new", priceUSD: 80,  brand: "Kingston"},
      { name: "Crucial P3 Plus 1TB NVMe", specs: "PCIe 4.0 · 5000/3600 MB/s · M.2 2280",             condition: "new", priceUSD: 55,  brand: "Crucial" },
    ],
    mid: [
      { name: "Samsung 990 Pro 2TB",      specs: "PCIe 4.0 · 7450/6900 MB/s · V-NAND MLC",           condition: "new", priceUSD: 160, brand: "Samsung" },
      { name: "Seagate FireCuda 530 2TB", specs: "PCIe 4.0 · 7300/6900 MB/s · heatsink edition",     condition: "new", priceUSD: 190, brand: "Seagate" },
      { name: "WD Black SN850X 2TB",      specs: "PCIe 4.0 · 7300/6600 MB/s · PS5 compatible",       condition: "new", priceUSD: 175, brand: "WD"      },
    ],
    high: [
      { name: "WD Black SN850X 4TB",      specs: "PCIe 4.0 · 7300/6600 MB/s · 4TB",                  condition: "new", priceUSD: 280, brand: "WD"      },
      { name: "Seagate FireCuda 530 4TB", specs: "PCIe 4.0 · 7300/6900 MB/s · 4TB · TLC",            condition: "new", priceUSD: 320, brand: "Seagate" },
      { name: "Crucial T705 2TB PCIe 5.0",specs: "PCIe 5.0 · 14,500/12,700 MB/s · fastest consumer", condition: "new", priceUSD: 280, brand: "Crucial" },
    ],
    flagship: [
      { name: "Samsung 990 Pro 4TB + WD Black SN850X 4TB", specs: "PCIe 4.0 · 8TB total NVMe dual drive",condition: "new", priceUSD: 560, brand: "Samsung/WD" },
      { name: "Crucial T705 2TB PCIe 5.0",specs: "PCIe 5.0 · 14,500/12,700 MB/s · Gen 5",            condition: "new", priceUSD: 280, brand: "Crucial"  },
      { name: "Samsung 990 EVO Plus 4TB", specs: "PCIe 5.0×2 · 7,250/6,300 MB/s · 4TB flagship",     condition: "new", priceUSD: 380, brand: "Samsung"  },
    ],
  },

  /* ─── PSU ─── */
  psu: {
    scrappy: [
      { name: "Seasonic S12III 430W",     specs: "80+ Bronze · non-modular · quiet · adequate for GTX 1050Ti", condition: "new", priceUSD: 40, brand: "Seasonic" },
      { name: "Corsair CV450 450W",       specs: "80+ Bronze · non-modular · ATX · 120mm",                     condition: "new", priceUSD: 42, brand: "Corsair"  },
      { name: "EVGA 500 W1 500W",         specs: "80+ White · non-modular · budget reliable",                   condition: "new", priceUSD: 38, brand: "EVGA"     },
    ],
    ultraBudget: [
      { name: "Corsair CV550 550W",       specs: "80+ Bronze · non-modular · ATX · 120mm",                     condition: "new", priceUSD: 48, brand: "Corsair"  },
      { name: "Seasonic S12III 550W",     specs: "80+ Bronze · semi-modular · quiet",                           condition: "new", priceUSD: 55, brand: "Seasonic" },
      { name: "be quiet! System Power 9 500W", specs: "80+ Bronze · non-modular · quiet",                       condition: "new", priceUSD: 50, brand: "be quiet!"},
    ],
    budget: [
      { name: "Seasonic Focus GX 650W",   specs: "80+ Gold · fully modular · 120mm FDB",                       condition: "new", priceUSD: 80,  brand: "Seasonic" },
      { name: "Corsair RM650x 650W",      specs: "80+ Gold · fully modular · zero-RPM mode",                   condition: "new", priceUSD: 90,  brand: "Corsair"  },
      { name: "MSI MAG A650BN 650W",      specs: "80+ Bronze · non-modular · budget gold alternative",         condition: "new", priceUSD: 55,  brand: "MSI"      },
    ],
    mid: [
      { name: "Corsair RM850x 850W",      specs: "80+ Gold · fully modular · zero-RPM",                        condition: "new", priceUSD: 120, brand: "Corsair"   },
      { name: "Seasonic Focus GX 850W",   specs: "80+ Gold · fully modular · 120mm FDB",                       condition: "new", priceUSD: 125, brand: "Seasonic"  },
      { name: "be quiet! Straight Power 12 850W", specs: "80+ Platinum · fully modular · silent",              condition: "new", priceUSD: 155, brand: "be quiet!" },
    ],
    high: [
      { name: "Corsair HX1000 1000W",     specs: "80+ Platinum · modular · ATX 3.0 · PCIe 5.0",               condition: "new", priceUSD: 180, brand: "Corsair"   },
      { name: "be quiet! Dark Power 13 1000W", specs: "80+ Titanium · modular · ATX 3.0 · PCIe 5.0",          condition: "new", priceUSD: 220, brand: "be quiet!" },
      { name: "Seasonic PRIME TX-1000 1000W", specs: "80+ Titanium · fully modular · 12-year warranty",        condition: "new", priceUSD: 260, brand: "Seasonic"  },
    ],
    flagship: [
      { name: "Corsair HX1500i 1500W",    specs: "80+ Platinum · modular · ATX 3.0 · PCIe 5.0 · RTX 5090 ready", condition: "new", priceUSD: 330, brand: "Corsair"   },
      { name: "be quiet! Dark Power Pro 13 1600W", specs: "80+ Titanium · modular · dual EPS · PCIe 5.0",      condition: "new", priceUSD: 420, brand: "be quiet!" },
      { name: "Seasonic PRIME TX-1300 1300W", specs: "80+ Titanium · ultra-premium · 135mm FDB · 12-year",     condition: "new", priceUSD: 360, brand: "Seasonic"  },
    ],
  },

  /* ─── COOLER ─── */
  cooler: {
    scrappy: [
      { name: "Intel/AMD Stock Cooler",   specs: "Air · bundled with CPU · adequate for stock clocks",  condition: "new", priceUSD: 0,  brand: "OEM"          },
      { name: "Cooler Master TX3 Evo",    specs: "Air · 92mm PWM · 95W TDP · budget",                  condition: "new", priceUSD: 18, brand: "Cooler Master" },
      { name: "Cooler Master Hyper 212",  specs: "Air · 120mm PWM · 150W TDP",                          condition: "new", priceUSD: 35, brand: "Cooler Master" },
    ],
    ultraBudget: [
      { name: "AMD Wraith Stealth (Stock)",specs: "Air · 65W TDP · bundled with Ryzen · silent",         condition: "new", priceUSD: 0,  brand: "AMD"          },
      { name: "Cooler Master Hyper 212",  specs: "Air · 120mm PWM · 150W TDP",                          condition: "new", priceUSD: 35, brand: "Cooler Master" },
      { name: "be quiet! Pure Rock 2",    specs: "Air · 120mm fan · 150W TDP · silent",                 condition: "new", priceUSD: 40, brand: "be quiet!"     },
    ],
    budget: [
      { name: "be quiet! Pure Rock 2",    specs: "Air · 120mm fan · 150W TDP · silent",                 condition: "new", priceUSD: 40, brand: "be quiet!" },
      { name: "Noctua NH-U12S",           specs: "Air · 120mm NF-F12 · 158W TDP · ultra-quiet",         condition: "new", priceUSD: 60, brand: "Noctua"    },
      { name: "Arctic Freezer 34 eSports",specs: "Air · 120mm · 150W TDP · dual fan option",            condition: "new", priceUSD: 35, brand: "Arctic"    },
    ],
    mid: [
      { name: "Noctua NH-D15",            specs: "Dual-tower air · 2×140mm · 250W TDP · GOAT",          condition: "new", priceUSD: 100, brand: "Noctua"    },
      { name: "Arctic Liquid Freezer III 240", specs: "240mm AIO · 2×120mm P12 · LGA1700 & AM5",        condition: "new", priceUSD: 85,  brand: "Arctic"    },
      { name: "Corsair iCUE H100i RGB",   specs: "240mm AIO · 2×120mm fans · ARGB · iCUE",              condition: "new", priceUSD: 120, brand: "Corsair"   },
    ],
    high: [
      { name: "Arctic Liquid Freezer III 360", specs: "360mm AIO · 3×120mm P12 · high perf",            condition: "new", priceUSD: 130, brand: "Arctic"  },
      { name: "Corsair iCUE H150i Elite LCD", specs: "360mm AIO · LCD pump head · ARGB · iCUE",         condition: "new", priceUSD: 200, brand: "Corsair" },
      { name: "NZXT Kraken Elite 360 RGB",specs: "360mm AIO · LCD display · ARGB fans · AM5/1700",      condition: "new", priceUSD: 230, brand: "NZXT"    },
    ],
    flagship: [
      { name: "Corsair iCUE LINK H170i LCD",  specs: "420mm AIO · iCUE LINK · 3×140mm ARGB · LCD head", condition: "new", priceUSD: 300, brand: "Corsair" },
      { name: "EKWB EK-AIO Elite 360 D-RGB",  specs: "360mm AIO · D-RGB · 3×120mm · copper cold plate",  condition: "new", priceUSD: 270, brand: "EKWB"    },
      { name: "Custom Loop: EKWB Quantum Kit", specs: "Full custom loop · 360mm rad · CPU+GPU blocks · RGB", condition: "new", priceUSD: 650, brand: "EKWB" },
    ],
  },

  /* ─── CASE ─── */
  case: {
    scrappy: [
      { name: "Generic ATX Mid Tower",    specs: "ATX · basic steel · USB 2.0 · no fans included · local brand", condition: "new",  priceUSD: 14, brand: "Local"    },
      { name: "Deepcool Matrexx 30",      specs: "Micro-ATX · TG side · USB 3.0",                                condition: "new",  priceUSD: 28, brand: "Deepcool" },
      { name: "Used ATX Case",            specs: "ATX · used · cleaned · adequate airflow",                      condition: "used", priceUSD: 10, brand: "Various"  },
    ],
    ultraBudget: [
      { name: "Deepcool Matrexx 30",      specs: "Micro-ATX · TG side · USB 3.0",                                condition: "new", priceUSD: 35, brand: "Deepcool"  },
      { name: "Fractal Design Core 1000", specs: "Micro-ATX · 2 fans · USB 3.0 · tool-free",                    condition: "new", priceUSD: 40, brand: "Fractal"   },
      { name: "Cooler Master MasterBox Q300L", specs: "Micro-ATX · magnetic filter · USB 3.0",                  condition: "new", priceUSD: 40, brand: "Cooler Master"},
    ],
    budget: [
      { name: "Corsair 4000D Airflow",    specs: "Mid-Tower · ATX · mesh front · USB-C · 2×120mm",              condition: "new", priceUSD: 80, brand: "Corsair"  },
      { name: "Lian Li Lancool 205",      specs: "Mid-Tower · ATX · 2×120mm · mesh front · USB 3.0",           condition: "new", priceUSD: 70, brand: "Lian Li"  },
      { name: "NZXT H510",               specs: "Mid-Tower · ATX · 2×120mm · USB-C · clean aesthetic",         condition: "new", priceUSD: 70, brand: "NZXT"     },
    ],
    mid: [
      { name: "Lian Li Lancool 216 RGB",  specs: "Mid-Tower · ATX · 2×160mm front · ARGB · USB-C",             condition: "new", priceUSD: 100, brand: "Lian Li"   },
      { name: "Fractal Design North XL",  specs: "Full Tower · ATX · wood + mesh · 2×180mm + 2×140mm",         condition: "new", priceUSD: 150, brand: "Fractal"   },
      { name: "be quiet! Dark Base 701",  specs: "Mid-Tower · ATX · ARGB · USB-C · modular layout",            condition: "new", priceUSD: 160, brand: "be quiet!" },
    ],
    high: [
      { name: "Lian Li O11 Dynamic EVO XL", specs: "Full Tower · E-ATX · dual chamber · USB-C · 9-fan",        condition: "new", priceUSD: 200, brand: "Lian Li"  },
      { name: "Fractal Design Torrent XL",  specs: "Full Tower · ATX · 180+180mm front · ultra airflow",        condition: "new", priceUSD: 210, brand: "Fractal"  },
      { name: "Corsair 7000D Airflow",      specs: "Full Tower · E-ATX · triple 140mm front · USB-C",          condition: "new", priceUSD: 220, brand: "Corsair"  },
    ],
    flagship: [
      { name: "Lian Li O11 Vision",       specs: "Mid-Tower · ATX · 4× tempered glass · triple-chamber · RGB",  condition: "new", priceUSD: 250, brand: "Lian Li"    },
      { name: "Thermaltake Core P8",      specs: "Full Tower · E-ATX · open-frame · extreme modding platform",  condition: "new", priceUSD: 350, brand: "Thermaltake" },
      { name: "HYTE Y70 Touch",           specs: "Mid-Tower · ATX · touch-screen panel · panoramic glass · RGB",condition: "new", priceUSD: 280, brand: "HYTE"       },
    ],
  },

  /* ─── MONITOR ─── */
  monitor: {
    scrappy: [
      { name: "Used 21.5\" 1080p LCD",    specs: "21.5\" · 1080p · 60Hz · TN/IPS · second-hand",              condition: "used", priceUSD: 38, brand: "Various" },
      { name: "AOC 22B2H 22\"",           specs: "21.5\" · 1080p · 60Hz · IPS · HDMI",                        condition: "new",  priceUSD: 80, brand: "AOC"     },
      { name: "Philips 223V7 22\"",       specs: "21.5\" · 1080p · 75Hz · IPS · FreeSync",                    condition: "new",  priceUSD: 90, brand: "Philips" },
    ],
    ultraBudget: [
      { name: "AOC 24B2H 24\"",           specs: "23.8\" · 1080p · 75Hz · IPS · HDMI",                        condition: "new", priceUSD: 100, brand: "AOC"  },
      { name: "Acer R240HY 24\"",         specs: "23.8\" · 1080p · 75Hz · IPS · HDMI+VGA",                    condition: "new", priceUSD: 110, brand: "Acer" },
      { name: "LG 24MK430H 24\"",         specs: "23.8\" · 1080p · 75Hz · IPS · FreeSync · HDMI",             condition: "new", priceUSD: 120, brand: "LG"   },
    ],
    budget: [
      { name: "AOC 24G2SP 24\"",          specs: "23.8\" · 1080p · 165Hz · IPS · 1ms · FreeSync",             condition: "new", priceUSD: 130, brand: "AOC"      },
      { name: "Gigabyte G27F 2 27\"",     specs: "27\" · 1080p · 165Hz · IPS · FreeSync · G-Sync",            condition: "new", priceUSD: 150, brand: "Gigabyte"  },
      { name: "MSI G2422 24\"",           specs: "23.8\" · 1080p · 170Hz · IPS · FreeSync · 1ms",             condition: "new", priceUSD: 140, brand: "MSI"       },
    ],
    mid: [
      { name: "ASUS TUF VG27AQ3A 27\"",  specs: "27\" · 1440p · 180Hz · IPS · G-Sync Compat · 1ms",          condition: "new", priceUSD: 280, brand: "ASUS"    },
      { name: "LG 27GP850-B 27\"",        specs: "27\" · 1440p · 180Hz · Nano IPS · 1ms · G-Sync",            condition: "new", priceUSD: 300, brand: "LG"      },
      { name: "Samsung Odyssey G5 32\"",  specs: "32\" · 1440p · 165Hz · VA curved · FreeSync",               condition: "new", priceUSD: 260, brand: "Samsung" },
    ],
    high: [
      { name: "ASUS ROG Swift PG279QM 27\"",  specs: "27\" · 1440p · 240Hz · IPS · G-Sync · 1ms",            condition: "new", priceUSD: 550,  brand: "ASUS"    },
      { name: "LG UltraGear 32GS95UE 32\"",   specs: "32\" · 4K/240Hz & 1080p/480Hz dual mode · OLED",        condition: "new", priceUSD: 1200, brand: "LG"      },
      { name: "Samsung Odyssey OLED G8 32\"",  specs: "32\" · 4K · 240Hz · QD-OLED · 0.03ms · G-Sync",        condition: "new", priceUSD: 1100, brand: "Samsung" },
    ],
    flagship: [
      { name: "ASUS ROG Swift OLED PG34WCDM 34\"", specs: "34\" · 1440p ultrawide · 240Hz · WOLED · HDR1000", condition: "new", priceUSD: 900,  brand: "ASUS"    },
      { name: "LG UltraGear OLED 45GR95QE 45\"",   specs: "45\" · 1440p curved ultrawide · 240Hz · QD-OLED",  condition: "new", priceUSD: 1500, brand: "LG"      },
      { name: "Samsung Odyssey Neo G9 57\"",         specs: "57\" · 7680×2160 Dual 4K · 240Hz · Mini-LED",     condition: "new", priceUSD: 2000, brand: "Samsung" },
    ],
  },

  /* ─── KEYBOARD ─── */
  keyboard: {
    scrappy: [
      // ~300–600 PKR / $1–2 — local cheap membranes
      { name: "A4Tech KB-8 Membrane",     specs: "Full size · PS2/USB · membrane · local brand · basic",        condition: "new", priceUSD: 2,  brand: "A4Tech"  },
      { name: "Rapoo E1050 Wired",        specs: "Full size · USB · membrane · spill-resistant · local market", condition: "new", priceUSD: 3,  brand: "Rapoo"   },
      { name: "Genius KB-116 USB",        specs: "Full size · USB · membrane · budget",                         condition: "new", priceUSD: 2,  brand: "Genius"  },
    ],
    ultraBudget: [
      { name: "Redragon K502 RGB",        specs: "Full size · membrane · RGB backlight · gaming",               condition: "new", priceUSD: 18, brand: "Redragon"    },
      { name: "Havit KB462L Membrane",    specs: "Full size · USB · RGB · gaming membrane · 25 anti-ghost",    condition: "new", priceUSD: 15, brand: "Havit"       },
      { name: "Redragon K552 Kumara",     specs: "TKL · Red switches · RGB backlight · compact",               condition: "new", priceUSD: 30, brand: "Redragon"    },
    ],
    budget: [
      { name: "Redragon K552 Kumara",     specs: "TKL · Red switches · RGB backlight · compact",               condition: "new", priceUSD: 30, brand: "Redragon"    },
      { name: "SteelSeries Apex 3 TKL",  specs: "TKL · membrane · RGB · IP32 splash · gaming",                condition: "new", priceUSD: 55, brand: "SteelSeries" },
      { name: "Keychron K2 V2",          specs: "75% · Red switches · hot-swap · RGB · USB",                   condition: "new", priceUSD: 70, brand: "Keychron"    },
    ],
    mid: [
      { name: "Logitech G915 TKL",        specs: "TKL · GL mechanical · RGB · wireless (Lightspeed) · slim",   condition: "new", priceUSD: 160, brand: "Logitech" },
      { name: "Corsair K100 Air",         specs: "Full · Cherry MX Ultra Low · wireless · RGB",                condition: "new", priceUSD: 200, brand: "Corsair"  },
      { name: "Keychron Q1 Pro",          specs: "75% · QMK/VIA · hot-swap · aluminum · wireless",             condition: "new", priceUSD: 175, brand: "Keychron" },
    ],
    high: [
      { name: "Razer BlackWidow V4 Pro",  specs: "Full · Razer Yellow mech · wireless · per-key RGB · rest",   condition: "new", priceUSD: 229, brand: "Razer"   },
      { name: "Wooting 60HE+",            specs: "60% · analog Hall-effect · rapid trigger · competitive",     condition: "new", priceUSD: 175, brand: "Wooting" },
      { name: "Wooting 80HE",             specs: "75% · Hall-effect · rapid trigger 0.1mm · esports",          condition: "new", priceUSD: 195, brand: "Wooting" },
    ],
    flagship: [
      { name: "Wooting 80HE",             specs: "75% · Hall-effect · 80-key · rapid trigger 0.1mm",           condition: "new", priceUSD: 195, brand: "Wooting"  },
      { name: "Ducky One 3 SF 65%",       specs: "65% · Cherry MX · Double-shot PBT · RGB · premium build",   condition: "new", priceUSD: 130, brand: "Ducky"    },
      { name: "Asus ROG Azoth Extreme",   specs: "75% · ROG NX switches · OLED display · CNC aluminum · gasket",condition: "new", priceUSD: 400, brand: "ASUS"    },
    ],
  },

  /* ─── MOUSE ─── */
  mouse: {
    scrappy: [
      // ~300–500 PKR / $1–2 — local optical mice
      { name: "A4Tech OP-720 Wired",      specs: "3-button · USB · optical · 800 DPI · local market",          condition: "new", priceUSD: 2, brand: "A4Tech"  },
      { name: "Rapoo N200 Wired",         specs: "3-button · USB · optical · 1000 DPI · silent click",         condition: "new", priceUSD: 3, brand: "Rapoo"   },
      { name: "Genius DX-120 Wired",      specs: "3-button · USB · optical · 1200 DPI",                        condition: "new", priceUSD: 2, brand: "Genius"  },
    ],
    ultraBudget: [
      { name: "Redragon M602 Griffin",    specs: "7 buttons · 7200 DPI · RGB · wired",                         condition: "new", priceUSD: 18, brand: "Redragon" },
      { name: "Havit MS733 RGB",          specs: "6 buttons · 1600 DPI · RGB · wired · gaming",                condition: "new", priceUSD: 15, brand: "Havit"    },
      { name: "Logitech G203 Lightsync",  specs: "6 buttons · 8000 DPI · LIGHTSYNC RGB · wired",               condition: "new", priceUSD: 30, brand: "Logitech" },
    ],
    budget: [
      { name: "Logitech G203 Lightsync",  specs: "6 buttons · 8000 DPI · LIGHTSYNC RGB · wired",               condition: "new", priceUSD: 30, brand: "Logitech" },
      { name: "Logitech G305",            specs: "6 buttons · 12000 DPI · HERO sensor · wireless",             condition: "new", priceUSD: 50, brand: "Logitech" },
      { name: "Razer Deathadder V3 HyperSpeed", specs: "Wireless · Focus X sensor · 14000 DPI · ergonomic",   condition: "new", priceUSD: 70, brand: "Razer"    },
    ],
    mid: [
      { name: "Logitech G Pro X Superlight 2", specs: "Wireless · 32000 DPI · HERO sensor · 60g · esports",   condition: "new", priceUSD: 160, brand: "Logitech" },
      { name: "Razer DeathAdder V3 Pro",  specs: "Wireless · 30000 DPI · Focus Pro · 63g · 90h battery",      condition: "new", priceUSD: 150, brand: "Razer"    },
      { name: "Pulsar X2H Wireless",      specs: "Wireless · 26000 DPI · PAW3395 · 52g · symmetrical",        condition: "new", priceUSD: 90,  brand: "Pulsar"   },
    ],
    high: [
      { name: "Logitech G Pro X Superlight 2 DEX", specs: "Wireless · 44000 DPI · HERO 2 · 60g · 300h battery", condition: "new", priceUSD: 180, brand: "Logitech" },
      { name: "Razer Viper V3 Pro",       specs: "Wireless · 35000 DPI · Focus Pro 35K · HyperSpeed · 82g",   condition: "new", priceUSD: 160, brand: "Razer"    },
      { name: "Pulsar X2V2 Wireless",     specs: "Wireless · 32000 DPI · PAW3395 · 47g · ultra premium",      condition: "new", priceUSD: 130, brand: "Pulsar"   },
    ],
    flagship: [
      { name: "Logitech G Pro X Superlight 2 DEX", specs: "Wireless flagship · 44000 DPI · 60g · 300h",       condition: "new", priceUSD: 180, brand: "Logitech" },
      { name: "Pulsar X2V2 Wireless",     specs: "Wireless · 32000 DPI · PAW3395 · 47g · ultra premium",      condition: "new", priceUSD: 130, brand: "Pulsar"   },
      { name: "Asus ROG Harpe Ace Aim Lab",specs: "Wireless · 36000 DPI · AimPoint Pro · 54g · Aim Lab collab",condition: "new", priceUSD: 149, brand: "ASUS"    },
    ],
  },

  /* ─── HEADSET ─── */
  headset: {
    scrappy: [
      // ~500–1500 PKR / $2–5 — basic local wired headsets
      { name: "Havit HV-H2002D Wired",    specs: "Stereo · 40mm drivers · wired · 3.5mm · mic · local brand", condition: "new", priceUSD: 4,  brand: "Havit"    },
      { name: "Redragon H120 Ares",       specs: "Stereo · 53mm drivers · USB+3.5mm · PC gaming",             condition: "new", priceUSD: 18, brand: "Redragon" },
      { name: "Fantech HG20 Foxy",        specs: "Stereo · 50mm · 3.5mm · mic · budget gaming · local avail", condition: "new", priceUSD: 8,  brand: "Fantech"  },
    ],
    ultraBudget: [
      { name: "Redragon H120 Ares",       specs: "Stereo · 53mm drivers · USB+3.5mm · PC gaming",             condition: "new", priceUSD: 18, brand: "Redragon" },
      { name: "HyperX Cloud Stinger 2",   specs: "Wired · 50mm drivers · 7.1 DTS · adjustable",               condition: "new", priceUSD: 40, brand: "HyperX"  },
      { name: "Corsair HS35 Stereo",      specs: "Wired · 50mm · 3.5mm · multi-platform · durable",           condition: "new", priceUSD: 35, brand: "Corsair" },
    ],
    budget: [
      { name: "HyperX Cloud Stinger 2",   specs: "Wired · 50mm drivers · 7.1 DTS · adjustable",               condition: "new", priceUSD: 40, brand: "HyperX"      },
      { name: "SteelSeries Arctis Nova 1",specs: "Wired · 40mm neodymium · retractable mic · multi-platform",  condition: "new", priceUSD: 60, brand: "SteelSeries" },
      { name: "HyperX Cloud II Wireless", specs: "Wireless · 7.1 DTS · 30h battery · USB-C",                  condition: "new", priceUSD: 100,brand: "HyperX"      },
    ],
    mid: [
      { name: "SteelSeries Arctis Nova Pro Wireless", specs: "Wireless · ANC · OLED base · premium build",    condition: "new", priceUSD: 250, brand: "SteelSeries" },
      { name: "Logitech G Pro X 2 Lightspeed",         specs: "Wireless · Blue VO!CE mic · LIGHTSPEED · DTS",  condition: "new", priceUSD: 200, brand: "Logitech"    },
      { name: "Razer BlackShark V2 Pro 2023",           specs: "Wireless · 50mm titanium drivers · 70h batt",  condition: "new", priceUSD: 180, brand: "Razer"       },
    ],
    high: [
      { name: "Sony WH-1000XM5 + Antlion ModMic",  specs: "Premium ANC headphones + clip-on mic · studio quality",condition: "new", priceUSD: 420, brand: "Sony+Antlion" },
      { name: "Astro A50 X Gen 5",                  specs: "Wireless · Dolby Atmos · HDMI ARC · 48h · pro",    condition: "new", priceUSD: 350, brand: "Astro"       },
      { name: "SteelSeries Arctis Nova Pro X",       specs: "Multi-system wireless · ANC · OLED · HiFi mode",   condition: "new", priceUSD: 350, brand: "SteelSeries" },
    ],
    flagship: [
      { name: "SteelSeries Arctis Nova Pro Wireless X", specs: "Multi-system wireless · ANC · OLED · HiFi",    condition: "new", priceUSD: 350, brand: "SteelSeries" },
      { name: "Beyerdynamic MMX 300 PRO Wireless",       specs: "Wireless · audiophile 300Ω · studio reference", condition: "new", priceUSD: 320, brand: "Beyerdynamic"},
      { name: "Creative SXFI TRIO + Sound BlasterX G6",  specs: "Wired · SXFI holographic + USB DAC/amp",       condition: "new", priceUSD: 230, brand: "Creative"    },
    ],
  },

  /* ─── NETWORKING ─── */
  networking: {
    scrappy: [
      { name: "Cat 5e Ethernet Cable (3m)", specs: "Gigabit · plug into router · best latency · no WiFi lag", condition: "new", priceUSD: 2, brand: "Generic"  },
      { name: "TP-Link TL-WN725N USB",    specs: "USB · 150Mbps · 2.4GHz · nano adapter · plug-and-play",     condition: "new", priceUSD: 5, brand: "TP-Link" },
      { name: "TP-Link TL-WN821N USB",    specs: "USB · 300Mbps · 2.4GHz · dual antenna · budget",            condition: "new", priceUSD: 6, brand: "TP-Link" },
    ],
    ultraBudget: [
      { name: "TP-Link TL-WN725N USB",    specs: "USB · 150Mbps · 2.4GHz · nano adapter · plug-and-play",     condition: "new", priceUSD: 8,  brand: "TP-Link" },
      { name: "Cat 6 Ethernet Cable (5m)",specs: "1Gbps · plug directly into router · best latency",          condition: "new", priceUSD: 10, brand: "Generic" },
      { name: "TP-Link Archer T2U Plus",  specs: "USB · WiFi 5 · AC600 · dual-band · small adapter",          condition: "new", priceUSD: 15, brand: "TP-Link" },
    ],
    budget: [
      { name: "TP-Link Archer T3U Plus",  specs: "USB · WiFi 5 · AC1300 · 2.4+5GHz · antenna",               condition: "new", priceUSD: 25,  brand: "TP-Link" },
      { name: "TP-Link AX5400 Archer AX73",specs: "WiFi 6 · AX5400 · dual-band · USB 3.0 · 6 antennas",      condition: "new", priceUSD: 120, brand: "TP-Link" },
      { name: "TP-Link RE605X Range Extender", specs: "WiFi 6 · AX1800 · boosts existing router coverage",    condition: "new", priceUSD: 50,  brand: "TP-Link" },
    ],
    mid: [
      { name: "ASUS PCE-AX58BT WiFi 6",  specs: "PCIe · WiFi 6 · AX3000 · Bluetooth 5.0 · desktop adapter",  condition: "new", priceUSD: 60,  brand: "ASUS"    },
      { name: "TP-Link Deco XE75 (2-pack)",specs: "WiFi 6E · AXE5400 · tri-band mesh · 2 nodes",              condition: "new", priceUSD: 250, brand: "TP-Link" },
      { name: "ASUS RT-AX86U Pro Router", specs: "WiFi 6 · AX5700 · dual-band · 2.5G LAN · gamer optimized", condition: "new", priceUSD: 220, brand: "ASUS"    },
    ],
    high: [
      { name: "ASUS ROG Rapture GT-AX11000 Pro", specs: "WiFi 6 · Tri-band · AX11000 · 2.5G WAN · gamer",    condition: "new", priceUSD: 380, brand: "ASUS"    },
      { name: "Netgear Orbi RBK863S WiFi 6E Mesh",specs: "WiFi 6E · AXE7800 · tri-band · 3-node · premium",   condition: "new", priceUSD: 600, brand: "Netgear" },
      { name: "ASUS ZenWiFi Pro ET12",    specs: "WiFi 6E mesh · AXE11000 · 2-node · whole home coverage",    condition: "new", priceUSD: 400, brand: "ASUS"    },
    ],
    flagship: [
      { name: "ASUS ROG Rapture GT-BE98 Pro", specs: "WiFi 7 · BE25600 · quad-band · 10G WAN+LAN · MLO",      condition: "new", priceUSD: 700,  brand: "ASUS"    },
      { name: "Netgear Orbi 970 WiFi 7 (2pk)",specs: "WiFi 7 · BE27000 · tri-band · 10G ports · flagship",    condition: "new", priceUSD: 1300, brand: "Netgear" },
      { name: "ASUS ZenWiFi Pro ET12 + ROG Hyper M.2", specs: "WiFi 6E mesh + M.2 2.5G NIC combo",            condition: "new", priceUSD: 350,  brand: "ASUS"    },
    ],
  },

  /* ─── OS ─── */
  os: {
    scrappy: [
      { name: "Ubuntu 24.04 LTS",         specs: "Free · open-source · gaming via Proton · full driver support", condition: "new", priceUSD: 0, brand: "Canonical"  },
      { name: "Windows 10 Home OEM",      specs: "Digital OEM key · Windows 10 · lifetime · cheapest option",    condition: "new", priceUSD: 8, brand: "Microsoft"  },
      { name: "Windows 11 Home OEM",      specs: "Digital OEM key · lifetime · not transferable",                condition: "new", priceUSD: 15,brand: "Microsoft"  },
    ],
    ultraBudget: [
      { name: "Ubuntu 24.04 LTS",         specs: "Free · open-source · gaming via Proton",                       condition: "new", priceUSD: 0,  brand: "Canonical" },
      { name: "Windows 11 Home OEM",      specs: "Digital OEM key · lifetime · not transferable",                condition: "new", priceUSD: 20, brand: "Microsoft" },
      { name: "Windows 11 Pro (Retail)",  specs: "Retail key · transferable · BitLocker · RDP",                  condition: "new", priceUSD: 40, brand: "Microsoft" },
    ],
    budget: [
      { name: "Ubuntu 24.04 LTS",         specs: "Free · open-source · gaming via Proton",                       condition: "new", priceUSD: 0,  brand: "Canonical" },
      { name: "Windows 11 Home OEM",      specs: "Digital OEM key · lifetime · not transferable",                condition: "new", priceUSD: 20, brand: "Microsoft" },
      { name: "Windows 11 Pro (Retail)",  specs: "Retail key · transferable · BitLocker · RDP",                  condition: "new", priceUSD: 40, brand: "Microsoft" },
    ],
    mid: [
      { name: "Ubuntu 24.04 LTS",         specs: "Free · open-source · gaming via Proton",                       condition: "new", priceUSD: 0,  brand: "Canonical" },
      { name: "Windows 11 Home OEM",      specs: "Digital OEM key · lifetime · not transferable",                condition: "new", priceUSD: 20, brand: "Microsoft" },
      { name: "Windows 11 Pro (Retail)",  specs: "Retail key · transferable · BitLocker · RDP",                  condition: "new", priceUSD: 40, brand: "Microsoft" },
    ],
    high: [
      { name: "Ubuntu 24.04 LTS",         specs: "Free · open-source · gaming via Proton",                       condition: "new", priceUSD: 0,  brand: "Canonical" },
      { name: "Windows 11 Home OEM",      specs: "Digital OEM key · lifetime · not transferable",                condition: "new", priceUSD: 20, brand: "Microsoft" },
      { name: "Windows 11 Pro (Retail)",  specs: "Retail key · transferable · BitLocker · RDP",                  condition: "new", priceUSD: 40, brand: "Microsoft" },
    ],
    flagship: [
      { name: "Ubuntu 24.04 LTS",         specs: "Free · open-source",                                           condition: "new", priceUSD: 0,  brand: "Canonical" },
      { name: "Windows 11 Home OEM",      specs: "Digital OEM key · lifetime",                                   condition: "new", priceUSD: 20, brand: "Microsoft" },
      { name: "Windows 11 Pro (Retail)",  specs: "Retail key · transferable · BitLocker · RDP",                  condition: "new", priceUSD: 40, brand: "Microsoft" },
    ],
  },
};

// ══════════════════════════════════════════════
//  SMART BUDGET-AWARE PICKER  (static fallback)
// ══════════════════════════════════════════════
function buildSmartRecommendations() {
  const rr   = REGIONS[state.region];
  const b    = state.budgetUSD;
  const p    = state.purpose;
  const tier = getBudgetTier(b);

  // Map tier string → DB tier keys for entry/mid/high within that budget tier
  const tierMap = {
    scrappy:     ["scrappy",     "scrappy",     "ultraBudget"],
    ultraBudget: ["scrappy",     "ultraBudget", "budget"     ],
    budget:      ["ultraBudget", "budget",      "mid"        ],
    mid:         ["budget",      "mid",         "high"       ],
    high:        ["mid",         "high",        "high"       ],
    flagship:    ["high",        "flagship",    "flagship"   ],
  };

  const [t0, t1, t2] = tierMap[tier] || tierMap.budget;

  function pickFromTier(cat, t) {
    const db = COMPONENT_DB[cat];
    if (!db) return null;
    const pool = db[t] || db.budget || db.mid || [];
    return pool.length > 0 ? pool[Math.floor(pool.length / 2)] || pool[0] : null;
  }

  function pickThree(cat) {
    const db = COMPONENT_DB[cat];
    if (!db) return null;

    const getFirst = t => { const pool = db[t]; return pool?.[0] || null; };
    const getMid   = t => { const pool = db[t]; return pool?.[Math.floor((pool.length-1)/2)] || pool?.[0] || null; };
    const getLast  = t => { const pool = db[t]; return pool?.[pool.length-1] || null; };

    let o0 = getFirst(t0) || getFirst(t1);
    let o1 = getMid(t1)   || getMid(t0);
    let o2 = getLast(t2)  || getLast(t1);

    o0 = o0 || getMid("budget") || getMid("ultraBudget");
    o1 = o1 || getMid("mid")    || o0;
    o2 = o2 || getLast("mid")   || o1;

    return [
      { ...o0, tier: "budget" },
      { ...o1, tier: "mid"    },
      { ...o2, tier: "high"   },
    ];
  }

  const raw = {};
  Object.keys(COMPONENT_META).forEach(cat => {
    if (COMPONENT_DB[cat]) raw[cat] = pickThree(cat);
  });

  // Purpose-specific overrides
  if (p === "gaming" && (tier === "high" || tier === "flagship")) {
    raw.gpu[2] = { ...(COMPONENT_DB.gpu.flagship?.[0] || COMPONENT_DB.gpu.high[2]), tier: "high" };
    raw.cpu[2] = { ...(COMPONENT_DB.cpu.flagship?.[0] || COMPONENT_DB.cpu.high[0]), tier: "high" };
  }
  if (p === "creative" && tier !== "scrappy") {
    raw.ram[2]     = { ...(COMPONENT_DB.ram.high?.[0]     || COMPONENT_DB.ram.mid[2]),     tier: "high" };
    raw.storage[2] = { ...(COMPONENT_DB.storage.high?.[0] || COMPONENT_DB.storage.mid[2]), tier: "high" };
  }

  // Convert prices to local currency
  Object.keys(raw).forEach(cat => {
    raw[cat].forEach(opt => {
      opt.priceLocal = Math.round((opt.priceUSD || 0) * rr.rate);
    });
  });

  state.allOptions      = raw;
  state.totalCategories = Object.keys(raw).length;

  console.log(`📦 Static DB fallback — tier: ${tier} | budget: $${Math.round(b)} USD`);
}

// ══════════════════════════════════════════════
//  RENDER BUILDER
// ══════════════════════════════════════════════
function renderBuilder() {
  const r = REGIONS[state.region];
  const purposeMap = { gaming: "Gaming", work: "Work", creative: "Creative", general: "General" };

  $("header-purpose").textContent = purposeMap[state.purpose] || "Custom";
  $("header-budget").textContent  = r.symbol + " " + formatLocal(state.budgetLocal);
  $("sum-budget").textContent     = r.symbol + " " + formatLocal(state.budgetLocal);

  const container = $("components-container");
  container.innerHTML = "";

  Object.keys(COMPONENT_META).forEach((cat) => {
    if (!state.allOptions[cat]) return;
    const meta    = COMPONENT_META[cat];
    const options = state.allOptions[cat];
    const block   = document.createElement("div");
    block.className = "category-block";

    block.innerHTML = `
      <div class="category-label">
        <div class="cat-icon">${meta.icon}</div>
        <span class="cat-name">${meta.label}</span>
        <span class="cat-selected-badge" id="badge-${cat}"></span>
      </div>
      <div class="options-grid" id="grid-${cat}">
        ${options.map((opt, i) => renderOptionCard(cat, opt, i)).join("")}
      </div>
    `;
    container.appendChild(block);
  });

  document.querySelectorAll(".option-card").forEach(card => {
    card.addEventListener("click", () => {
      selectComponent(card.dataset.cat, parseInt(card.dataset.idx));
    });
  });

  $("back-btn").addEventListener("click", () => {
    state.components = {};
    showScreen("onboarding");
  });

  $("save-btn").addEventListener("click", saveBuild);
  updateSummary();
}

function renderOptionCard(cat, opt, idx) {
  const r         = REGIONS[state.region];
  const tierClass = { budget: "tier-budget", mid: "tier-mid", high: "tier-high" }[opt.tier] || "tier-budget";
  const tierLabel = { budget: "Entry", mid: "Mid-Range", high: "Premium" }[opt.tier] || opt.tier;
  const condClass = opt.condition === "new" ? "cond-new" : "cond-used";
  const condLabel = opt.condition === "new" ? "✦ New" : "↻ Used";
  const priceStr  = (opt.priceUSD === 0 || opt.priceLocal === 0)
    ? "Free"
    : r.symbol + " " + formatLocal(opt.priceLocal || Math.round((opt.priceUSD || 0) * r.rate));
  const isPremium = opt.tier === "high";
  const usedWarn  = opt.condition === "used"
    ? `<div class="health-warning">🛡 Verify health &gt;85% before buying. Request diagnostic report from seller.</div>`
    : "";

  return `
    <div class="option-card${isPremium ? " premium-card" : ""}"
         data-cat="${cat}" data-idx="${idx}">
      <span class="option-tier ${tierClass}">${tierLabel}</span>
      <div class="option-name">${opt.name}</div>
      <div class="option-specs">${opt.specs}</div>
      ${usedWarn}
      <div class="option-footer">
        <span class="option-condition ${condClass}">${condLabel}</span>
        <span class="option-price">${priceStr}</span>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════
//  SELECTION
// ══════════════════════════════════════════════
function selectComponent(cat, idx) {
  const option = state.allOptions[cat][idx];
  state.components[cat] = option;

  $(`grid-${cat}`).querySelectorAll(".option-card").forEach((card, i) => {
    card.classList.toggle("selected", i === idx);
  });

  const badge = $(`badge-${cat}`);
  badge.textContent = option.name.split(" ").slice(0, 4).join(" ");
  badge.classList.add("visible");

  updateSummary();
}

// ══════════════════════════════════════════════
//  SUMMARY
// ══════════════════════════════════════════════
function updateSummary() {
  const r        = REGIONS[state.region];
  const selected = Object.keys(state.components).length;
  const total    = state.totalCategories;
  const pct      = total > 0 ? (selected / total) * 100 : 0;

  $("completeness-fill").style.width = pct + "%";
  $("completeness-text").textContent = `${selected} / ${total} selected`;

  let totalUSD = 0;
  Object.values(state.components).forEach(o => { totalUSD += (o.priceUSD || 0); });
  const totalLocal = Math.round(totalUSD * r.rate);
  const remaining  = state.budgetLocal - totalLocal;

  $("sum-total").textContent = r.symbol + " " + formatLocal(totalLocal);
  const remEl = $("sum-remaining");
  remEl.textContent = (remaining >= 0 ? "+" : "-") + r.symbol + " " + formatLocal(Math.abs(remaining));
  remEl.className   = remaining >= 0 ? "val-good" : "val-danger";

  const assemblyFee = Math.round(totalLocal * 0.07);
  $("tip-assembly").innerHTML = `Add approx. <strong>${r.symbol} ${formatLocal(assemblyFee)}</strong> (~7%) for technician assembly. Self-build saves this cost.`;

  const list = $("summary-list");
  list.innerHTML = "";
  Object.keys(COMPONENT_META).forEach(cat => {
    const opt = state.components[cat];
    if (!opt) return;
    const meta     = COMPONENT_META[cat];
    const priceStr = (opt.priceUSD === 0 || opt.priceLocal === 0)
      ? "Free"
      : r.symbol + " " + formatLocal(Math.round((opt.priceUSD || 0) * r.rate));
    list.innerHTML += `
      <div class="summary-item">
        <span class="sum-icon">${meta.icon}</span>
        <div class="sum-info">
          <div class="sum-cat">${meta.label}</div>
          <div class="sum-name">${opt.name}</div>
        </div>
        <span class="sum-price">${priceStr}</span>
      </div>
    `;
  });

  $("save-btn").disabled = selected === 0;
}

// ══════════════════════════════════════════════
//  SAVE → SHOW RECEIPT
// ══════════════════════════════════════════════
function saveBuild() {
  const r = REGIONS[state.region];

  let totalUSD = 0;
  Object.values(state.components).forEach(o => { totalUSD += (o.priceUSD || 0); });
  const totalLocal   = Math.round(totalUSD * r.rate);
  const assemblyFee  = Math.round(totalLocal * 0.07);
  const thermalPaste = state.region === "PK" ? 750 : Math.round(7 * r.rate);
  const grandTotal   = totalLocal + assemblyFee;

  const buildId = "FORGE-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  const now     = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
  const timeStr = now.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });

  try {
    const record   = { buildId, savedAt: now.toISOString(), region: state.region, components: state.components, totalLocal };
    const existing = JSON.parse(localStorage.getItem("forge_builds") || "[]");
    existing.push(record);
    localStorage.setItem("forge_builds", JSON.stringify(existing));
  } catch(e) {}

  $("receipt-id").textContent   = "Build ID: " + buildId;
  $("receipt-date").textContent = dateStr + " · " + timeStr;

  let itemsHTML = "";
  Object.keys(COMPONENT_META).forEach(cat => {
    const opt = state.components[cat];
    if (!opt) return;
    const meta     = COMPONENT_META[cat];
    const priceStr = (opt.priceUSD === 0 || opt.priceLocal === 0)
      ? "Free"
      : r.symbol + " " + formatLocal(Math.round((opt.priceUSD || 0) * r.rate));
    itemsHTML += `
      <div class="receipt-row">
        <div class="receipt-row-left">
          <div class="receipt-cat">${meta.label}</div>
          <div class="receipt-name">${opt.name}</div>
          <div class="receipt-cond">${opt.condition === "new" ? "New" : "Used / Marketplace"}</div>
        </div>
        <div class="receipt-price">${priceStr}</div>
      </div>
    `;
  });
  $("receipt-items").innerHTML = itemsHTML;

  $("receipt-totals").innerHTML = `
    <div class="receipt-total-row"><span>Components Subtotal</span><span>${r.symbol} ${formatLocal(totalLocal)}</span></div>
    <div class="receipt-total-row"><span>Assembly Fee (~7%)</span><span>${r.symbol} ${formatLocal(assemblyFee)}</span></div>
    <div class="receipt-total-row"><span>Thermal Paste (est.)</span><span>${r.symbol} ${formatLocal(thermalPaste)}</span></div>
    <div class="receipt-total-row grand"><span>TOTAL ESTIMATE</span><span>${r.symbol} ${formatLocal(grandTotal + thermalPaste)}</span></div>
    <div class="receipt-total-row" style="font-size:0.7rem;color:#888;margin-top:4px">
      <span>Budget</span><span>${r.symbol} ${formatLocal(state.budgetLocal)}</span>
    </div>
  `;

  $("receipt-modal").classList.remove("hidden");
}

// ══════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════
function formatLocal(n) {
  return Math.round(n).toLocaleString();
}