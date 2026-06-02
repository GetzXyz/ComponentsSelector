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
// ══════════════════════════════════════════════
function getBudgetTier(budgetUSD) {
  if (budgetUSD < 120)  return "scrappy";    // Used parts entry line
  if (budgetUSD < 220)  return "ultraBudget";
  if (budgetUSD < 400)  return "budget";
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
    if (glow) {
      glow.style.left = mx + "px";
      glow.style.top  = my + "px";
    }
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
  fetchHotItems(); // ◄ Market ticker initialization routine attached
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

  if (!regionSel || !budgetInp) return;

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
  if ($(map[name])) $(map[name]).classList.add("active");
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
// ══════════════════════════════════════════════
function getBudgetDistribution(budgetUSD, purpose, tier) {
  const peripheralCaps = {
    scrappy:     { monitor: 40, keyboard: 3,  mouse: 3,  headset: 4,  networking: 5  },
    ultraBudget: { monitor: 60, keyboard: 6,  mouse: 5,  headset: 8,  networking: 8  },
    budget:      { monitor: 90, keyboard: 15, mouse: 12, headset: 18, networking: 15 },
    mid:         { monitor: 180,keyboard: 55, mouse: 45, headset: 60, networking: 40 },
    high:        { monitor: 400,keyboard: 120,mouse: 100,headset: 150,networking: 100},
    flagship:    { monitor: 800,keyboard: 250,mouse: 180,headset: 300,networking: 250},
  };

  const alloc = {
    scrappy:     { cpu: 0.22, gpu: 0.28, mb: 0.12, ram: 0.10, storage: 0.08, psu: 0.08, cooler: 0.04, case: 0.08 },
    ultraBudget: { cpu: 0.22, gpu: 0.28, mb: 0.12, ram: 0.10, storage: 0.08, psu: 0.08, cooler: 0.04, case: 0.08 },
    budget:      { cpu: 0.20, gpu: 0.30, mb: 0.10, ram: 0.10, storage: 0.08, psu: 0.08, cooler: 0.04, case: 0.10 },
    mid:         { cpu: 0.18, gpu: 0.32, mb: 0.10, ram: 0.08, storage: 0.08, psu: 0.07, cooler: 0.05, case: 0.12 },
    high:        { cpu: 0.16, gpu: 0.35, mb: 0.10, ram: 0.08, storage: 0.08, psu: 0.07, cooler: 0.06, case: 0.10 },
    flagship:    { cpu: 0.14, gpu: 0.38, mb: 0.10, ram: 0.08, storage: 0.08, psu: 0.07, cooler: 0.06, case: 0.09 },
  };

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

  const distLocal = {};
  Object.keys(dist).forEach(k => { distLocal[k] = Math.round(dist[k] * r.rate); });

  const tierDescriptions = {
    scrappy:     "very tight — must use 5th/6th gen Intel or AMD Ryzen 1000/2000 series used parts.",
    ultraBudget: "low — use 8th–10th gen Intel or AMD Ryzen 3000 series used parts.",
    budget:      "moderate — use 10th–12th gen Intel or AMD Ryzen 5000 series.",
    mid:         "mid-range — 12th/13th gen Intel or Ryzen 7000 CPUs.",
    high:        "high-end — premium consumer setups.",
    flagship:    "flagship/no-compromise — enthusiast tier setups.",
  };

  const prompt = `You are an expert PC builder for the ${region} market. Total budget: ${symbol}${budget} ${currency} (${purpose}). Tier ceilings local: ${JSON.stringify(distLocal)}`;

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
    const grouped = {};

    items.forEach(item => {
      const cat = item.category?.toLowerCase();
      if (!cat || !COMPONENT_META[cat]) return;
      if (!grouped[cat]) grouped[cat] = [];

      if (!item.priceLocal && item.priceUSD != null) item.priceLocal = Math.round(item.priceUSD * r.rate);
      if (!item.priceUSD && item.priceLocal) item.priceUSD = Math.round(item.priceLocal / r.rate);

      const tierMap = { "entry": "budget", "budget": "budget", "mid": "mid", "high": "high", "premium": "high" };
      item.tier = tierMap[item.tier?.toLowerCase()] || "mid";
      if (!item.condition) item.condition = "new";

      grouped[cat].push(item);
    });

    const missingCats = Object.keys(COMPONENT_META).filter(cat => !grouped[cat] || grouped[cat].length === 0);
    if (missingCats.length > 0) {
      buildSmartRecommendations();
      missingCats.forEach(cat => { if (state.allOptions[cat]) grouped[cat] = state.allOptions[cat]; });
    }

    Object.keys(grouped).forEach(cat => {
      const opts = grouped[cat];
      opts.sort((a, b) => (a.priceUSD - b.priceUSD));
      while (opts.length < 3) opts.push({ ...opts[opts.length - 1] });
      grouped[cat] = opts.slice(0, 3);
    });

    state.allOptions      = grouped;
    state.totalCategories = Object.keys(grouped).length;
  } catch (err) {
    console.warn("⚠️ Falling back to static architecture matrix:", err.message);
    buildSmartRecommendations();
  }

  renderBuilder();
  showScreen("builder");
  setTimeout(initScrollReveal, 100);
}

// ══════════════════════════════════════════════
//  HOT ITEMS TICKER — fetches from /api/hot-items
// ══════════════════════════════════════════════
async function fetchHotItems() {
  const inner = $("ticker-inner");
  if (!inner) return;
  try {
    const res = await fetch("/api/hot-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const items = data.items;
    if (!Array.isArray(items) || items.length === 0) throw new Error("No items");
    const badgeColors = {
      "NEW RELEASE":    "#e02020",
      "PRICE DROP":     "#ff8800",
      "BEST SELLER":    "#22cc66",
      "HOT DEAL":       "#ff44aa",
      "JUST ANNOUNCED": "#4488ff",
    };
    const makeItems = () => items.map(item => {
      const color = badgeColors[item.badge] || "#e02020";
      return `
        <span class="ticker-item">
          <span class="ticker-hot" style="color:${color}">${item.badge}</span>
          <span class="ticker-name">${item.name}</span>
          <span style="color:#888;font-size:0.65rem">${item.category}</span>
          <span style="color:#a06060">· ${item.reason}</span>
        </span>`;
    }).join('<span class="ticker-sep">🔥</span>');
    inner.innerHTML = makeItems() + makeItems(); // Doubled loop footprint
    startTickerAnimation(inner);
  } catch (err) {
    console.warn("Ticker API offline, shifting to static buffer:", err.message);
    const placeholder = `
      <span class="ticker-item"><span class="ticker-hot" style="color:#e02020">NEW RELEASE</span> <span class="ticker-name">RTX 5090</span> <span style="color:#888;font-size:0.65rem">GPU</span> <span style="color:#a06060">· Fastest GPU ever made</span></span>
      <span class="ticker-sep">🔥</span>
      <span class="ticker-item"><span class="ticker-hot" style="color:#ff8800">HOT DEAL</span> <span class="ticker-name">Ryzen 9 9950X</span> <span style="color:#888;font-size:0.65rem">CPU</span> <span style="color:#a06060">· AMD flagship CPU</span></span>
      <span class="ticker-sep">🔥</span>
      <span class="ticker-item"><span class="ticker-hot" style="color:#4488ff">JUST ANNOUNCED</span> <span class="ticker-name">RX 9070 XT</span> <span style="color:#888;font-size:0.65rem">GPU</span> <span style="color:#a06060">· AMD RDNA 4 flagship</span></span>
      <span class="ticker-sep">🔥</span>
      <span class="ticker-item"><span class="ticker-hot" style="color:#22cc66">BEST SELLER</span> <span class="ticker-name">Samsung 990 Pro</span> <span style="color:#888;font-size:0.65rem">SSD</span> <span style="color:#a06060">· Top NVMe pick</span></span>
      <span class="ticker-sep">🔥</span>
      <span class="ticker-item"><span class="ticker-hot" style="color:#ff44aa">PRICE DROP</span> <span class="ticker-name">RTX 4090</span> <span style="color:#888;font-size:0.65rem">GPU</span> <span style="color:#a06060">· Prices falling fast</span></span>
    `;
    inner.innerHTML = placeholder + placeholder;
    startTickerAnimation(inner);
  }
}

function startTickerAnimation(inner) {
  let pos = 0, totalWidth = 0;
  function measure() { totalWidth = inner.scrollWidth / 2; }
  function tick() {
    pos += 0.5;
    if (pos >= totalWidth) pos = 0;
    inner.style.transform = `translateX(-${pos}px)`;
    requestAnimationFrame(tick);
  }
  setTimeout(() => {
    measure();
    window.addEventListener("resize", measure);
    requestAnimationFrame(tick);
  }, 200);
}

// ══════════════════════════════════════════════
//  MASTER COMPONENT DATABASE
// ══════════════════════════════════════════════
const COMPONENT_DB = {
  cpu: {
    scrappy: [
      { name: "Intel Core i5-6500", specs: "4c/4t · 3.2–3.6GHz · LGA1151", condition: "used", priceUSD: 22, brand: "Intel" },
      { name: "Intel Core i3-6100", specs: "2c/4t · 3.7GHz · LGA1151", condition: "used", priceUSD: 14, brand: "Intel" },
      { name: "AMD Ryzen 5 1600", specs: "6c/12t · 3.2–3.6GHz · AM4", condition: "used", priceUSD: 28, brand: "AMD" }
    ],
    ultraBudget: [
      { name: "Intel Core i5-9400F", specs: "6c/6t · 2.9–4.1GHz · LGA1151", condition: "used", priceUSD: 42, brand: "Intel" },
      { name: "Intel Core i3-10100F", specs: "4c/8t · 3.6–4.3GHz · LGA1200", condition: "used", priceUSD: 45, brand: "Intel" },
      { name: "AMD Ryzen 5 3600", specs: "6c/12t · 3.6–4.2GHz · AM4", condition: "used", priceUSD: 55, brand: "AMD" }
    ],
    budget: [
      { name: "Intel Core i3-12100F", specs: "4c/8t · 3.3–4.3GHz · LGA1700", condition: "new", priceUSD: 72, brand: "Intel" },
      { name: "AMD Ryzen 5 5600", specs: "6c/12t · 3.5–4.4GHz · AM4", condition: "new", priceUSD: 100, brand: "AMD" },
      { name: "Intel Core i5-12400F", specs: "6c/12t · 2.5–4.4GHz · LGA1700", condition: "new", priceUSD: 110, brand: "Intel" }
    ],
    mid: [
      { name: "AMD Ryzen 5 5600X", specs: "6c/12t · 3.7–4.6GHz · AM4", condition: "new", priceUSD: 130, brand: "AMD" },
      { name: "Intel Core i5-13600K", specs: "14c/20t · 3.5–5.1GHz · LGA1700", condition: "new", priceUSD: 250, brand: "Intel" },
      { name: "AMD Ryzen 7 7700X", specs: "8c/16t · 4.5–5.4GHz · AM5", condition: "new", priceUSD: 280, brand: "AMD" }
    ],
    high: [
      { name: "AMD Ryzen 7 7800X3D", specs: "8c/16t · 3D V-Cache · AM5", condition: "new", priceUSD: 370, brand: "AMD" },
      { name: "Intel Core i9-14900KS", specs: "24c/32t · 3.2–6.2GHz · LGA1700", condition: "new", priceUSD: 499, brand: "Intel" },
      { name: "AMD Ryzen 9 9950X", specs: "16c/32t · 4.3–5.7GHz · AM5", condition: "new", priceUSD: 649, brand: "AMD" }
    ],
    flagship: [
      { name: "AMD Ryzen 9 9950X3D", specs: "16c/32t · 128MB Cache · AM5", condition: "new", priceUSD: 850, brand: "AMD" },
      { name: "Intel Core i9-14900KS", specs: "24c/32t · 6.2GHz · LGA1700", condition: "new", priceUSD: 499, brand: "Intel" },
      { name: "AMD Threadripper PRO 7985WX", specs: "64c/128t · sWRX90", condition: "new", priceUSD: 2499, brand: "AMD" }
    ]
  },
  gpu: {
    scrappy: [
      { name: "NVIDIA GTX 1050 Ti 4GB", specs: "4GB GDDR5 · Used entry", condition: "used", priceUSD: 40, brand: "NVIDIA" },
      { name: "AMD RX 570 8GB", specs: "8GB GDDR5 · Used 1080p", condition: "used", priceUSD: 45, brand: "AMD" },
      { name: "NVIDIA GTX 1060 6GB", specs: "6GB GDDR5 · Used budget", condition: "used", priceUSD: 55, brand: "NVIDIA" }
    ],
    ultraBudget: [
      { name: "NVIDIA GTX 1060 6GB", specs: "6GB GDDR5 · Capable", condition: "used", priceUSD: 60, brand: "NVIDIA" },
      { name: "AMD RX 580 8GB", specs: "8GB GDDR5 · Target 1080p", condition: "used", priceUSD: 65, brand: "AMD" },
      { name: "NVIDIA GTX 1650 Super", specs: "4GB GDDR6 · Reliable", condition: "used", priceUSD: 80, brand: "NVIDIA" }
    ],
    budget: [
      { name: "AMD RX 6600 8GB", specs: "8GB GDDR6 · RDNA 2", condition: "new", priceUSD: 170, brand: "AMD" },
      { name: "NVIDIA RTX 3060 12GB", specs: "12GB GDDR6 · DLSS 2", condition: "used", priceUSD: 190, brand: "NVIDIA" },
      { name: "AMD RX 7600 8GB", specs: "8GB GDDR6 · RDNA 3", condition: "new", priceUSD: 230, brand: "AMD" }
    ],
    mid: [
      { name: "NVIDIA RTX 4070 12GB", specs: "12GB GDDR6X · DLSS 3", condition: "new", priceUSD: 550, brand: "NVIDIA" },
      { name: "AMD Radeon RX 7900 XT", specs: "20GB GDDR6 · 4K beast", condition: "new", priceUSD: 650, brand: "AMD" },
      { name: "NVIDIA RTX 4070 Ti Super", specs: "16GB GDDR6X · 256-bit", condition: "new", priceUSD: 780, brand: "NVIDIA" }
    ],
    high: [
      { name: "NVIDIA RTX 4080 Super", specs: "16GB GDDR6X · 4K Ultra", condition: "new", priceUSD: 999, brand: "NVIDIA" },
      { name: "AMD Radeon RX 7900 XTX", specs: "24GB GDDR6 · Native speed", condition: "new", priceUSD: 950, brand: "AMD" },
      { name: "NVIDIA RTX 4090 24GB", specs: "24GB GDDR6X · Enthusiast", condition: "new", priceUSD: 1599, brand: "NVIDIA" }
    ],
    flagship: [
      { name: "NVIDIA GeForce RTX 5090", specs: "32GB GDDR7 · Next-gen flagship", condition: "new", priceUSD: 1999, brand: "NVIDIA" },
      { name: "NVIDIA GeForce RTX 5080", specs: "16GB GDDR7 · 4K Premium", condition: "new", priceUSD: 1199, brand: "NVIDIA" },
      { name: "AMD Radeon RX 9070 XT", specs: "16GB GDDR6 · RDNA 4 architecture", condition: "new", priceUSD: 699, brand: "AMD" }
    ]
  },
  mb: {
    scrappy: [
      { name: "Gigabyte H110M-S2H", specs: "LGA1151 · H110 chip", condition: "used", priceUSD: 20, brand: "Gigabyte" },
      { name: "MSI H110M Pro-VD", specs: "LGA1151 · Compact", condition: "used", priceUSD: 22, brand: "MSI" },
      { name: "Gigabyte A320M-S2H", specs: "AM4 · A320 chipset", condition: "used", priceUSD: 24, brand: "Gigabyte" }
    ],
    ultraBudget: [
      { name: "ASUS Prime H410M-E", specs: "LGA1200 · Micro-ATX", condition: "used", priceUSD: 38, brand: "ASUS" },
      { name: "MSI H410M PRO", specs: "LGA1200 · Essential layout", condition: "used", priceUSD: 40, brand: "MSI" },
      { name: "Gigabyte B450M DS3H", specs: "AM4 · B450 · Dual Channel", condition: "used", priceUSD: 52, brand: "Gigabyte" }
    ],
    budget: [
      { name: "ASUS Prime B450M-A II", specs: "AM4 · BIOS Flashback", condition: "new", priceUSD: 68, brand: "ASUS" },
      { name: "Gigabyte B550M DS3H AC", specs: "AM4 · B550 · PCIe 4.0 · WiFi", condition: "new", priceUSD: 88, brand: "Gigabyte" },
      { name: "ASUS Prime B660M-A WiFi", specs: "LGA1700 · DDR4 · AX WiFi", condition: "new", priceUSD: 105, brand: "ASUS" }
    ],
    mid: [
      { name: "MSI MAG B550 Tomahawk", specs: "AM4 · Premium VRMs", condition: "new", priceUSD: 135, brand: "MSI" },
      { name: "Gigabyte B650 GAMING X AX", specs: "AM5 · DDR5 · ATX", condition: "new", priceUSD: 175, brand: "Gigabyte" },
      { name: "ASUS ROG Strix B760-F Gaming", specs: "LGA1700 · DDR5 · Clear Audio", condition: "new", priceUSD: 215, brand: "ASUS" }
    ],
    high: [
      { name: "MSI MAG B650 Tomahawk WiFi", specs: "AM5 · Robust Phase Array", condition: "new", priceUSD: 199, brand: "MSI" },
      { name: "ASUS ROG Strix Z790-E Gaming", specs: "LGA1700 · PCIe 5.0 · Multi M.2", condition: "new", priceUSD: 360, brand: "ASUS" },
      { name: "Gigabyte X670E AORUS Master", specs: "AM5 · Premium Overclocking", condition: "new", priceUSD: 399, brand: "Gigabyte" }
    ],
    flagship: [
      { name: "ASUS ROG Maximus Z790 Hero", specs: "LGA1700 · Thunderbolt 4", condition: "new", priceUSD: 549, brand: "ASUS" },
      { name: "MSI MEG X670E GODLIKE", specs: "AM5 · Dashboard M-Vision Panel", condition: "new", priceUSD: 1199, brand: "MSI" },
      { name: "ASUS ROG Maximus Z790 Apex", specs: "LGA1700 · OC Kingpin layout", condition: "new", priceUSD: 670, brand: "ASUS" }
    ]
  },
  ram: {
    scrappy: [
      { name: "Crucial 8GB DDR4 2400MHz", specs: "1x8GB · CL17 · Basic green", condition: "used", priceUSD: 10, brand: "Crucial" },
      { name: "Samsung 8GB DDR4 2666MHz", specs: "1x8GB · Server grade stable", condition: "used", priceUSD: 12, brand: "Samsung" },
      { name: "Kingston ValueRAM 16GB DDR4", specs: "2x8GB dual module configuration", condition: "used", priceUSD: 20, brand: "Kingston" }
    ],
    ultraBudget: [
      { name: "Kingston ValueRAM 8GB DDR4", specs: "1x8GB · 2666MHz desk pull", condition: "used", priceUSD: 13, brand: "Kingston" },
      { name: "G.Skill Aegis 16GB DDR4", specs: "2x8GB · 3200MHz · Stealth profile", condition: "new", priceUSD: 32, brand: "G.Skill" },
      { name: "Corsair Vengeance LPX 16GB", specs: "2x8GB · 3200MHz · Aluminum spreaders", condition: "new", priceUSD: 38, brand: "Corsair" }
    ],
    budget: [
      { name: "Silicon Power Value 16GB", specs: "2x8GB · DDR4-3200 · CL16", condition: "new", priceUSD: 34, brand: "Silicon Power" },
      { name: "Corsair Vengeance LPX 16GB DDR4", specs: "2x8GB · DDR4-3600 · Low profile", condition: "new", priceUSD: 42, brand: "Corsair" },
      { name: "Teamgroup T-Force VulcanZ 32GB", specs: "2x16GB · DDR4-3200 heavy capacity", condition: "new", priceUSD: 58, brand: "Teamgroup" }
    ],
    mid: [
      { name: "Corsair Vengeance LPX 32GB DDR4", specs: "2x16GB · DDR4-3600 kit", condition: "new", priceUSD: 72, brand: "Corsair" },
      { name: "Crucial Classic 32GB DDR5", specs: "2x16GB · DDR5-5600 · Stock speeds", condition: "new", priceUSD: 90, brand: "Crucial" },
      { name: "G.Skill Flare X5 32GB DDR5", specs: "2x16GB · DDR5-6000 · AMD EXPO", condition: "new", priceUSD: 105, brand: "G.Skill" }
    ],
    high: [
      { name: "G.Skill Trident Z5 Neo RGB 32GB", specs: "2x16GB · DDR5-6000 · CL30 optimized", condition: "new", priceUSD: 118, brand: "G.Skill" },
      { name: "Corsair Vengeance RGB 64GB DDR5", specs: "2x32GB · DDR5-6400 ultra headroom", condition: "new", priceUSD: 215, brand: "Corsair" },
      { name: "G.Skill Trident Z5 RGB 96GB DDR5", specs: "2x48GB · DDR5-6400 high-density", condition: "new", priceUSD: 380, brand: "G.Skill" }
    ],
    flagship: [
      { name: "G.Skill Trident Z5 RGB 96GB DDR5", specs: "2x48GB · DDR5-6400 · CL32", condition: "new", priceUSD: 380, brand: "G.Skill" },
      { name: "Corsair Dominator Titanium 128GB", specs: "4x32GB · DDR5-6600 elite tier", condition: "new", priceUSD: 590, brand: "Corsair" },
      { name: "G.Skill Zeta R5 DL 128GB Registered", specs: "4x32GB · DDR5-5600 · Workstation RDIMM", condition: "new", priceUSD: 799, brand: "G.Skill" }
    ]
  },
  storage: {
    scrappy: [
      { name: "Kingston A400 120GB SSD", specs: "SATA 3 · 2.5 inch internal boot", condition: "used", priceUSD: 8, brand: "Kingston" },
      { name: "Seagate Pipeline 500GB HDD", specs: "3.5 inch · 5900RPM mass storage", condition: "used", priceUSD: 9, brand: "Seagate" },
      { name: "WD Blue 1TB Desktop HDD", specs: "3.5 inch · 7200RPM mechanically verified", condition: "used", priceUSD: 16, brand: "WD" }
    ],
    ultraBudget: [
      { name: "Teamgroup AX2 512GB SSD", specs: "SATA III · SLC Caching", condition: "new", priceUSD: 26, brand: "Teamgroup" },
      { name: "Kingston NV2 500GB NVMe", specs: "PCIe 4.0 x4 M.2 solid speed", condition: "new", priceUSD: 34, brand: "Kingston" },
      { name: "Crucial P3 1TB NVMe M.2", specs: "PCIe 3.0 x4 · 3500MB/s read pull", condition: "used", priceUSD: 44, brand: "Crucial" }
    ],
    budget: [
      { name: "Kingston NV2 1TB M.2 NVMe", specs: "Gen 4x4 · 3500 MB/s performance", condition: "new", priceUSD: 54, brand: "Kingston" },
      { name: "Teamgroup MP44L 1TB NVMe", specs: "Gen 4x4 · 5000 MB/s high durability", condition: "new", priceUSD: 62, brand: "Teamgroup" },
      { name: "Crucial P3 Plus 2TB NVMe", specs: "Gen 4x4 · 5000 MB/s huge entry drive", condition: "new", priceUSD: 105, brand: "Crucial" }
    ],
    mid: [
      { name: "Samsung 980 1TB M.2 NVMe", specs: "PCIe 3.0 · DRAMless host memory buffer", condition: "new", priceUSD: 85, brand: "Samsung" },
      { name: "Western Digital Black SN850X 1TB", specs: "Gen 4x4 · DRAM Cache · 7300 MB/s", condition: "new", priceUSD: 99, brand: "WD" },
      { name: "Crucial T500 2TB NVMe M.2", specs: "Gen 4x4 · Pro level gaming drive", condition: "new", priceUSD: 145, brand: "Crucial" }
    ],
    high: [
      { name: "Samsung 990 Pro 2TB NVMe", specs: "Gen 4x4 · 2GB LPDDR4 Cache elite tier", condition: "new", priceUSD: 165, brand: "Samsung" },
      { name: "Crucial T700 2TB Gen5 NVMe", specs: "PCIe 5.0 ultra speed · 12400 MB/s", condition: "new", priceUSD: 260, brand: "Crucial" },
      { name: "WD Black SN850X 4TB NVMe", specs: "Gen 4x4 · Massive array high density", condition: "new", priceUSD: 299, brand: "WD" }
    ],
    flagship: [
      { name: "Samsung 990 Pro 4TB NVMe", specs: "Gen 4x4 · Ultimate storage configuration", condition: "new", priceUSD: 310, brand: "Samsung" },
      { name: "Crucial T705 4TB PCIe 5.0", specs: "Next-generation layout · 14500 MB/s", condition: "new", priceUSD: 520, brand: "Crucial" },
      { name: "Sabrent Rocket 4 Plus 8TB", specs: "Enormous capacity enterprise grading", condition: "new", priceUSD: 999, brand: "Sabrent" }
    ]
  },
  psu: {
    scrappy: [
      { name: "Huntkey 400W Power Unit", specs: "Standard office power block OEM", condition: "used", priceUSD: 7, brand: "Huntkey" },
      { name: "Antec VP450 450W Unit", specs: "Dual rail basic efficiency standard", condition: "used", priceUSD: 12, brand: "Antec" },
      { name: "Corsair VS450 450W Power Supply", specs: "Orange label classic desktop unit", condition: "used", priceUSD: 15, brand: "Corsair" }
    ],
    ultraBudget: [
      { name: "EVGA 400W N1 Basic PSU", specs: "Heavy duty cables layout native", condition: "new", priceUSD: 28, brand: "EVGA" },
      { name: "Thermaltake Smart 500W", specs: "80+ White rated continuous delivery", condition: "new", priceUSD: 36, brand: "Thermaltake" },
      { name: "Corsair CV550 550W Unit", specs: "80+ Bronze certified dual tracking", condition: "new", priceUSD: 44, brand: "Corsair" }
    ],
    budget: [
      { name: "EVGA 500 W1 500W Supply", specs: "80+ White entry layout build", condition: "new", priceUSD: 40, brand: "EVGA" },
      { name: "Apevia Prestige 600W", specs: "80+ Gold certified highly functional", condition: "new", priceUSD: 52, brand: "Apevia" },
      { name: "Corsair CX650M 650W PSU", specs: "80+ Bronze semi-modular cabling", condition: "new", priceUSD: 68, brand: "Corsair" }
    ],
    mid: [
      { name: "Thermaltake Toughpower GX2 600W", specs: "80+ Gold native compact build", condition: "new", priceUSD: 62, brand: "Thermaltake" },
      { name: "Corsair RM750e 750W Mod", specs: "80+ Gold full modular ATX 3.0 PCIe 5", condition: "new", priceUSD: 99, brand: "Corsair" },
      { name: "MSI MAG A850GL 850W Unit", specs: "80+ Gold compact modular ATX 3.0", condition: "new", priceUSD: 110, brand: "MSI" }
    ],
    high: [
      { name: "Corsair RM850x 850W Modular", specs: "80+ Gold premium magnetic fan", condition: "new", priceUSD: 124, brand: "Corsair" },
      { name: "be quiet! Pure Power 12 M 1000W", specs: "80+ Gold silent operational curves", condition: "new", priceUSD: 145, brand: "be quiet!" },
      { name: "SeaSonic Vertex GX-1200 Fully", specs: "80+ Gold elite tier ATX 3.0 modular", condition: "new", priceUSD: 210, brand: "SeaSonic" }
    ],
    flagship: [
      { name: "Corsair HX1500i 1500W Modular", specs: "80+ Platinum digital software monitor", condition: "new", priceUSD: 320, brand: "Corsair" },
      { name: "SeaSonic PRIME PX-1600 Elite", specs: "80+ Platinum clean heavy line rail", condition: "new", priceUSD: 420, brand: "SeaSonic" },
      { name: "Corsair AX1600i Digital Titanium", specs: "80+ Titanium totem pole GaN flagship", condition: "new", priceUSD: 649, brand: "Corsair" }
    ]
  },
  cooler: {
    scrappy: [
      { name: "Intel Stock Cooler Copper base", specs: "Classic bundle downward circular fan", condition: "used", priceUSD: 2, brand: "Intel" },
      { name: "AMD Wraith Stealth Cooler AM4", specs: "Original aluminum horizontal layout", condition: "used", priceUSD: 3, brand: "AMD" },
      { name: "Deepcool Alta 9 Air Cooler", specs: "92mm entry fan matrix configuration", condition: "new", priceUSD: 6, brand: "Deepcool" }
    ],
    ultraBudget: [
      { name: "Intel Stock Cooler Standard", specs: "Aluminum stock entry heat dissipator", condition: "new", priceUSD: 5, brand: "Intel" },
      { name: "Deepcool Gammaxx 400 V2", specs: "Blue LED single 120mm tower layout", condition: "new", priceUSD: 20, brand: "Deepcool" },
      { name: "Thermalright Assassin X 120 Refined", specs: "4 direct heatpipes AGHP technology", condition: "new", priceUSD: 18, brand: "Thermalright" }
    ],
    budget: [
      { name: "Thermalright Assassin X 120", specs: "Single tower quiet entry bracket", condition: "new", priceUSD: 19, brand: "Thermalright" },
      { name: "ID-COOLING SE-214-XT ARGB", specs: "Addressable RGB sync tower block", condition: "new", priceUSD: 22, brand: "ID-COOLING" },
      { name: "Thermalright Peerless Assassin 120 SE", specs: "Dual tower heavy performance 6 pipes", condition: "new", priceUSD: 34, brand: "Thermalright" }
    ],
    mid: [
      { name: "Thermalright Peerless Assassin 120", specs: "Standard grey robust fin architecture", condition: "new", priceUSD: 36, brand: "Thermalright" },
      { name: "Deepcool AK400 Digital Display", specs: "Real-time CPU temperature monitor top", condition: "new", priceUSD: 44, brand: "Deepcool" },
      { name: "Deepcool LS520 SE 240mm AIO", specs: "Liquid cooler infinity mirror pump block", condition: "new", priceUSD: 79, brand: "Deepcool" }
    ],
    high: [
      { name: "Noctua NH-D15 chromax.black", specs: "Enormous dual tower silent acoustic elite", condition: "new", priceUSD: 119, brand: "Noctua" },
      { name: "Deepcool LT720 360mm Liquid AIO", specs: "Geometric multi-dimensional visual array", condition: "new", priceUSD: 125, brand: "Deepcool" },
      { name: "ARCTIC Liquid Freezer III 360", specs: "High performance VRM dedicated fan block", condition: "new", priceUSD: 110, brand: "ARCTIC" }
    ],
    flagship: [
      { name: "Corsair iCUE Link H150i LCD", specs: "360mm AIO customized IPS display track", condition: "new", priceUSD: 280, brand: "Corsair" },
      { name: "ASUS ROG Ryujin III 360 ARGB", specs: "Asetek 8th Gen pump Anime Matrix layout", condition: "new", priceUSD: 349, brand: "ASUS" },
      { name: "Custom Open Loop Liquid System", specs: "EKWB reservoir blocks compression setup", condition: "new", priceUSD: 650, brand: "EKWB" }
    ]
  },
  case: {
    scrappy: [
      { name: "Giga-Byte Vintage ATX Tower", specs: "Beige or black standard layout steel", condition: "used", priceUSD: 4, brand: "Gigabyte" },
      { name: "Standard Office OEM Chassis", specs: "Stripped clean basic sheet structure", condition: "used", priceUSD: 5, brand: "OEM" },
      { name: "Delux Classic ATX Case", specs: "Side panels solid dual mesh tracks", condition: "used", priceUSD: 8, brand: "Delux" }
    ],
    ultraBudget: [
      { name: "Rosewill FBM-01 Dual Fan Micro", specs: "Mini tower pre-installed ventilation", condition: "new", priceUSD: 29, brand: "Rosewill" },
      { name: "Antec NX200 M-ATX Mesh", specs: "Front airflow tracking mesh pattern", condition: "new", priceUSD: 36, brand: "Antec" },
      { name: "Zalman T6 ATX Mid Tower", specs: "Hairline finish front textured design", condition: "new", priceUSD: 42, brand: "Zalman" }
    ],
    budget: [
      { name: "Montech X3 Mesh Black ATX", specs: "6 pre-installed static RGB fans elite air", condition: "new", priceUSD: 54, brand: "Montech" },
      { name: "Phanteks Eclipse G300A Mesh", specs: "Tempered glass window clean engineering", condition: "new", priceUSD: 60, brand: "Phanteks" },
      { name: "NZXT H5 Flow Compact ATX", specs: "Perforated top floor angled intake tracking", condition: "new", priceUSD: 85, brand: "NZXT" }
    ],
    mid: [
      { name: "Fractal Design Pop Air Solid", specs: "Honeycomb pattern vibrant front layout", condition: "new", priceUSD: 79, brand: "Fractal Design" },
      { name: "Corsair 4000D Airflow Tempered", specs: "RapidRoute cable tracking steel matrix front", condition: "new", priceUSD: 89, brand: "Corsair" },
      { name: "Lian Li Lancaster 216 RGB Mesh", specs: "Dual 160mm monster front intake tracking", condition: "new", priceUSD: 99, brand: "Lian Li" }
    ],
    high: [
      { name: "NZXT H9 Flow Dual-Chamber Elite", specs: "Panoramic seamless glass wrapped panel", condition: "new", priceUSD: 154, brand: "NZXT" },
      { name: "Lian Li O11 Dynamic EVO ATX", specs: "Modular dual direction layout frame setup", condition: "new", priceUSD: 169, brand: "Lian Li" },
      { name: "Fractal Design North Walnut Wood", specs: "FSC certified real walnut timber slats front", condition: "new", priceUSD: 140, brand: "Fractal Design" }
    ],
    flagship: [
      { name: "Lian Li O11 Vision Premium", specs: "3-sided borderless glass pillarless display", condition: "new", priceUSD: 250, brand: "Lian Li" },
      { name: "HYTE Y70 Touch Panoramic Panel", specs: "Integrated 4K multi-touch secondary monitor", condition: "new", priceUSD: 280, brand: "HYTE" },
      { name: "Thermaltake Core P8 Open Frame Flight", specs: "Wall-mountable convertible transforming layout", condition: "new", priceUSD: 350, brand: "Thermaltake" }
    ]
  },
  monitor: {
    scrappy: [
      { name: "Dell 19 inch Square Monitor", specs: "1280x1024 office standard pull VGA", condition: "used", priceUSD: 10, brand: "Dell" },
      { name: "HP LE2002xi 20 inch Backlit", specs: "1600x900 widescreen reliable panel", condition: "used", priceUSD: 16, brand: "HP" },
      { name: "Samsung SyncMaster 22 inch Full", specs: "1920x1080 solid base response matrix", condition: "used", priceUSD: 24, brand: "Samsung" }
    ],
    ultraBudget: [
      { name: "Sceptre E205W-16003R Widescreen", specs: "20 inch LED built-in speakers office line", condition: "new", priceUSD: 58, brand: "Sceptre" },
      { name: "Acer SB220Q bi 21.5 IPS 75Hz", specs: "Ultra-thin bezels sharp profile color tracking", condition: "new", priceUSD: 69, brand: "Acer" },
      { name: "ASUS VP228HE 21.5 Eye Care", specs: "1ms response rate Blue light filter tracking", condition: "new", priceUSD: 79, brand: "ASUS" }
    ],
    budget: [
      { name: "KOORUI 24 inch Gaming Monitor", specs: "1080p · 165Hz · IPS panel ultra speed", condition: "new", priceUSD: 94, brand: "KOORUI" },
      { name: "Sceptre E248W-19203R 24 Professional", specs: "Full HD sleek framing standard profile", condition: "new", priceUSD: 85, brand: "Sceptre" },
      { name: "GIGABYTE G24F 2 23.8 165Hz Super", specs: "SS IPS panel rich spectrum color gamut", condition: "new", priceUSD: 125, brand: "Gigabyte" }
    ],
    mid: [
      { name: "ASUS TUF Gaming VG27AQ 27", specs: "1440p · 165Hz · G-Sync compatible elite", condition: "new", priceUSD: 230, brand: "ASUS" },
      { name: "Gigabyte M27Q 27 inch KVM Quad", specs: "170Hz SuperSpeed IPS built-in utility", condition: "new", priceUSD: 249, brand: "Gigabyte" },
      { name: "LG UltraGear 27GR75Q-B high speed", specs: "QHD IPS 1ms response competitive tracking", condition: "new", priceUSD: 220, brand: "LG" }
    ],
    high: [
      { name: "Alienware AW2725DF QD-OLED Elite", specs: "27 inch · 1440p · 360Hz breakneck speed", condition: "new", priceUSD: 799, brand: "Alienware" },
      { name: "Gigabyte M32U 32 inch 4K Gaming", specs: "144Hz · HDMI 2.1 console ready matrix", condition: "new", priceUSD: 480, brand: "Gigabyte" },
      { name: "ASUS ROG Strix XG27AQMR High speed", specs: "27 inch WQHD 300Hz sports level accuracy", condition: "new", priceUSD: 520, brand: "ASUS" }
    ],
    flagship: [
      { name: "ASUS ROG Swift OLED PG32UCDM", specs: "32 inch · 4K · 240Hz QD-OLED infinite dark", condition: "new", priceUSD: 1299, brand: "ASUS" },
      { name: "Samsung Odyssey OLED G9 Ultrawide", specs: "49 inch curved curved dual QHD panel 240Hz", condition: "new", priceUSD: 1199, brand: "Samsung" },
      { name: "ASUS ROG Swift Pro PG248QP Matrix", specs: "540Hz esports world fastest refresh tracking", condition: "new", priceUSD: 899, brand: "ASUS" }
    ]
  },
  keyboard: {
    scrappy: [
      { name: "A4Tech ComfortKey Membrane", specs: "Wired basic black silent layout keypads", condition: "used", priceUSD: 2, brand: "A4Tech" },
      { name: "Dell KB216 Quiet Key Desktop", specs: "Standard office typing apparatus rugged build", condition: "used", priceUSD: 3, brand: "Dell" },
      { name: "Rapoo N1200 Entry Black Keypad", specs: "Spill resistant layout native standard track", condition: "new", priceUSD: 5, brand: "Rapoo" }
    ],
    ultraBudget: [
      { name: "Logitech K120 Ergonomic Comfort", specs: "Low profile keys USB interface standard", condition: "new", priceUSD: 12, brand: "Logitech" },
      { name: "Redragon K552 Mechanical Outemu Blue", specs: "87 keys small layout clicky mechanical", condition: "new", priceUSD: 29, brand: "Redragon" },
      { name: "E-Yooso Z-11 60% Compact Board", specs: "Yellow backlighting linear red switch track", condition: "new", priceUSD: 24, brand: "E-Yooso" }
    ],
    budget: [
      { name: "Redragon K552 KUMARA Mech", specs: "Metal ABS construction heavy duty clicky", condition: "new", priceUSD: 32, brand: "Redragon" },
      { name: "Evga Z12 RGB Water Resistant Gamer", specs: "5 macro keys zone control backlights", condition: "new", priceUSD: 25, brand: "EVGA" },
      { name: "Keychron C3 Pro Tenkeyless Layout", specs: "Gasket mount typing feel red linear switch", condition: "new", priceUSD: 36, brand: "Keychron" }
    ],
    mid: [
      { name: "Keychron V1 Custom Mechanical", specs: "QMK/VIA re-mappable volume knob elite layout", condition: "new", priceUSD: 79, brand: "Keychron" },
      { name: "Logitech G413 Carbon Backlit Game", specs: "Romer-G high speed tactile mechanical switch", condition: "new", priceUSD: 64, brand: "Logitech" },
      { name: "SteelSeries Apex 3 RGB Whisper Keys", specs: "10-zone luminous panel magnetic wrist pad", condition: "new", priceUSD: 49, brand: "SteelSeries" }
    ],
    high: [
      { name: "Wooting 60HE Hall Effect Analog", specs: "Rapid trigger technology extreme accuracy tracking", condition: "new", priceUSD: 175, brand: "Wooting" },
      { name: "Logitech G915 TKL Wireless Mechanical", specs: "Lightspeed interface low-profile elite click", condition: "new", priceUSD: 199, brand: "Logitech" },
      { name: "Corsair K100 RGB Optical-Mechanical", specs: "OPX linear switches 4000Hz hyper polling", condition: "new", priceUSD: 215, brand: "Corsair" }
    ],
    flagship: [
      { name: "Wooting 80HE Module Analog Board", specs: "Enthusiast PCR casing custom adjustable travel", condition: "new", priceUSD: 290, brand: "Wooting" },
      { name: "ASUS ROG Azoth Custom 75 Wireless", specs: "Gasket mount structure lube station kit OLED screen", condition: "new", priceUSD: 249, brand: "ASUS" },
      { name: "Angry Miao Cyberboard R4 Futuristic", specs: "Custom LED matrix structural masterpiece chassis", condition: "new", priceUSD: 650, brand: "Angry Miao" }
    ]
  },
  mouse: {
    scrappy: [
      { name: "A4Tech OP-620D Optical Mouse", specs: "Standard click wheel tracking resolution", condition: "used", priceUSD: 1, brand: "A4Tech" },
      { name: "Dell MS116 Wired Desktop Tracker", specs: "Matte plastic ergonomic control build", condition: "used", priceUSD: 2, brand: "Dell" },
      { name: "Logitech B100 Optical Tracking", specs: "Ambidextrous shape USB office basic utility", condition: "new", priceUSD: 4, brand: "Logitech" }
    ],
    ultraBudget: [
      { name: "Logitech G102 Lightsync Dynamic", specs: "8000 DPI gaming grade optical sensor tracker", condition: "new", priceUSD: 22, brand: "Logitech" },
      { name: "Razer DeathAdder Essential Classic", specs: "6400 DPI ergonomic shape green lighting", condition: "new", priceUSD: 19, brand: "Razer" },
      { name: "SteelSeries Rival 3 Core Engine", specs: "TrueMove Core tracking brilliant split trigger", condition: "new", priceUSD: 25, brand: "SteelSeries" }
    ],
    budget: [
      { name: "Razer DeathAdder Essential Multi", specs: "Hyper durable mechanical switches standard", condition: "new", priceUSD: 20, brand: "Razer" },
      { name: "Logitech G305 Lightspeed Wireless", specs: "HERO sensor 250 hour battery duration efficiency", condition: "new", priceUSD: 38, brand: "Logitech" },
      { name: "VGN Dragonfly F1 Ultra Lightweight", specs: "49 grams competitive tracking raw performance", condition: "new", priceUSD: 44, brand: "VGN" }
    ],
    mid: [
      { name: "Logitech G502 HERO High Performance", specs: "25600 DPI accurate sensor tunable tracking weights", condition: "new", priceUSD: 48, brand: "Logitech" },
      { name: "Razer Basilisk V3 Ergonomic Frame", specs: "HyperScroll tilt wheel multi-zone RGB underglow", condition: "new", priceUSD: 59, brand: "Razer" },
      { name: "Pulsar X2V2 Wireless Esports Engine", specs: "Symmetrical design premium tracking accuracy switch", condition: "new", priceUSD: 95, brand: "Pulsar" }
    ],
    high: [
      { name: "Logitech G PRO X SUPERLIGHT 2", specs: "LIGHTFORCE hybrid switches 60 grams pro standard", condition: "new", priceUSD: 145, brand: "Logitech" },
      { name: "Razer Viper V3 Pro Ultra Light", specs: "True 8000Hz polling rate tracking precision beast", condition: "new", priceUSD: 155, brand: "Razer" },
      { name: "Finalmouse UltralightX Carbon Fiber", specs: "Composite material frame 29g extreme tracking layout", condition: "new", priceUSD: 189, brand: "Finalmouse" }
    ],
    flagship: [
      { name: "Razer Viper Mini Signature Edition", specs: "Magnesium alloy exoskeleton premium collectors line", condition: "new", priceUSD: 279, brand: "Razer" },
      { name: "Logitech G PRO X SUPERLIGHT 2 Dex", specs: "Ergonomic asymmetrical precision esports tracker", condition: "new", priceUSD: 159, brand: "Logitech" },
      { name: "Finalmouse UltralightX Guardian Elite", specs: "Limited batch carbon matrix flight speed tracker", condition: "new", priceUSD: 240, brand: "Finalmouse" }
    ]
  },
  headset: {
    scrappy: [
      { name: "Havit H139 basic wired earphone", specs: "Simple dual track stereo connector lines", condition: "new", priceUSD: 2, brand: "Havit" },
      { name: "A4Tech Comfort Stereo Earhook", specs: "Over the ear sponge padding voice micro", condition: "used", priceUSD: 3, brand: "A4Tech" },
      { name: "Redragon H120 Wired Basic Headset", specs: "Adjustable slider frame clear acoustic track", condition: "new", priceUSD: 6, brand: "Redragon" }
    ],
    ultraBudget: [
      { name: "Redragon H120 Wired Comfort audio", specs: "Dual 3.5mm input connection gaming template", condition: "new", priceUSD: 8, brand: "Redragon" },
      { name: "Havit H2002d Premium Budget Set", specs: "50mm speakers detachable voice condenser clarity", condition: "new", priceUSD: 32, brand: "Havit" },
      { name: "JBL Quantum 100 Comfortable Over-Ear", specs: "QuantumSOUND signature directional audio curve", condition: "new", priceUSD: 29, brand: "JBL" }
    ],
    budget: [
      { name: "Razer Kraken X Ultra Light Frame", specs: "7.1 positional surround software card tracking", condition: "new", priceUSD: 38, brand: "Razer" },
      { name: "HyperX Cloud Stinger 2 Core Gaming", specs: "Swivel-to-mute microphone tracking dynamic slider", condition: "new", priceUSD: 34, brand: "HyperX" },
      { name: "SteelSeries Arctis Nova 1 Multi-platform", specs: "Nova Acoustic Engine premium software suite equalizer", condition: "new", priceUSD: 52, brand: "SteelSeries" }
    ],
    mid: [
      { name: "HyperX Cloud II Pro Studio Classic", specs: "Memory foam headband aluminum inline driver control", condition: "new", priceUSD: 79, brand: "HyperX" },
      { name: "Logitech G435 Lightspeed Wireless TKL", specs: "Low latency beamforming internal mic structural light", condition: "new", priceUSD: 68, brand: "Logitech" },
      { name: "Audio-Technica ATH-M50x Monitor Studio", specs: "Pro grading studio monitoring folding structural loops", condition: "new", priceUSD: 140, brand: "Audio-Technica" }
    ],
    high: [
      { name: "HyperX Cloud III Wireless Pro Track", specs: "Up to 120 hour runtime extreme durability structure", condition: "new", priceUSD: 129, brand: "HyperX" },
      { name: "SteelSeries Arctis Nova 7 Wireless Mesh", specs: "Simultaneous Bluetooth 2.4GHz dual stream tracking", condition: "new", priceUSD: 165, brand: "SteelSeries" },
      { name: "Sennheiser HD 560S Open-Back Audiophile", specs: "Linear acoustic accurate dispersion diagnostic monitor", condition: "new", priceUSD: 180, brand: "Sennheiser" }
    ],
    flagship: [
      { name: "Audeze Maxwell Planar Magnetic Studio", specs: "90mm planar drivers massive spatial localization pro", condition: "new", priceUSD: 299, brand: "Audeze" },
      { name: "SteelSeries Arctis Nova Pro Wireless ANC", specs: "Dual DAC audio station hot-swap power cell tracking", condition: "new", priceUSD: 329, brand: "SteelSeries" },
      { name: "Sennheiser HD 800 S Reference Acoustic", specs: "Enormous transducers hand crafted sound stage flagship", condition: "new", priceUSD: 1599, brand: "Sennheiser" }
    ]
  },
  networking: {
    scrappy: [
      { name: "LB-Link 150Mbps Wireless Adapter", specs: "USB Nano antenna realtek configuration drivers", condition: "new", priceUSD: 2, brand: "LB-Link" },
      { name: "Tenda 300Mbps Basic Desktop Receiver", specs: "External 2dBi whip layout configuration line", condition: "used", priceUSD: 3, brand: "Tenda" },
      { name: "Cat5e Ethernet Cable 10 Meter Blue", specs: "Copper solid standard connection direct path terminal", condition: "new", priceUSD: 4, brand: "Generic" }
    ],
    ultraBudget: [
      { name: "TP-Link TL-WN725N Nano Gold Adapter", specs: "Sleek miniature profile desktop receiver terminal", condition: "new", priceUSD: 9, brand: "TP-Link" },
      { name: "Mercury 300Mbps High Gain dual structural", specs: "Twin high projection external receptors module", condition: "new", priceUSD: 12, brand: "Mercury" },
      { name: "TP-Link Archer T2U Plus High Gain AC", specs: "600Mbps dual band flexible target antenna track", condition: "new", priceUSD: 18, brand: "TP-Link" }
    ],
    budget: [
      { name: "TP-Link Archer T3U Plus AC1300", specs: "High speed USB 3.0 interface dual band tracking", condition: "new", priceUSD: 24, brand: "TP-Link" },
      { name: "Intel AX200 Pro PCIe Desktop Kit", specs: "WiFi 6 · Bluetooth 5.2 base board installation M.2", condition: "new", priceUSD: 28, brand: "Intel" },
      { name: "TP-Link Archer TX20E AX1800 Interface", specs: "PCIe adapter low profile bracket included tower tracking", condition: "new", priceUSD: 36, brand: "TP-Link" }
    ],
    mid: [
      { name: "ASUS PCE-AX58BT AX3000 PCIe Module", specs: "External antenna base placement optimization tracking", condition: "new", priceUSD: 58, brand: "ASUS" },
      { name: "TP-Link Deco XE75 Mesh Single Node", specs: "WiFi 6E · AXE5400 tri-band wireless network bubble", condition: "new", priceUSD: 120, brand: "TP-Link" },
      { name: "ASUS RT-AX86U Pro Router Gaming Platform", specs: "AX5700 speed engine 2.5G custom port acceleration", condition: "new", priceUSD: 210, brand: "ASUS" }
    ],
    high: [
      { name: "ASUS ROG Rapture GT-AX11000 Pro Router", specs: "Tri-band performance radar mesh acceleration network", condition: "new", priceUSD: 360, brand: "ASUS" },
      { name: "TP-Link Deco XE75 Mesh Array 2-Pack", specs: "Whole house coverage AI-driven mesh tracking lines", condition: "new", priceUSD: 240, brand: "TP-Link" },
      { name: "Netgear Orbi RBK863S Premium Setup Mesh", specs: "AX7800 mega performance coverage array configuration", condition: "new", priceUSD: 599, brand: "Netgear" }
    ],
    flagship: [
      { name: "ASUS ROG Rapture GT-BE98 Pro WiFi 7", specs: "Quad-band BE25000 speed routing computation engine", condition: "new", priceUSD: 749, brand: "ASUS" },
      { name: "Netgear Orbi Quad-Band WiFi 7 Mesh 3-Pack", specs: "Enormous enterprise scale whole estate coverage link", condition: "new", priceUSD: 2299, brand: "Netgear" },
      { name: "Ubiquiti UniFi Dream Machine SE Console", specs: "10G SFP+ ports enterprise routing cloud management", condition: "new", priceUSD: 499, brand: "Ubiquiti" }
    ]
  },
  os: {
    scrappy: [
      { name: "Ubuntu 24.04 LTS Desktop Platform", specs: "Free open-source Linux kernel gaming via Proton layer", condition: "new", priceUSD: 0, brand: "Canonical" }
    ],
    ultraBudget: [
      { name: "Ubuntu 24.04 LTS Desktop Platform", specs: "Free open-source system fully operational matrix", condition: "new", priceUSD: 0, brand: "Canonical" },
      { name: "Windows 11 Home Digital Key entry", specs: "Digital registration system continuous validation key", condition: "new", priceUSD: 14, brand: "Microsoft" }
    ],
    budget: [
      { name: "Ubuntu 24.04 LTS", specs: "Free · Linux open system alternative environment", condition: "new", priceUSD: 0, brand: "Canonical" },
      { name: "Windows 11 Home OEM License activation", specs: "Digital OEM verification lock system non transferable", condition: "new", priceUSD: 20, brand: "Microsoft" },
      { name: "Windows 11 Pro Retail Single activation", specs: "Transferable license path BitLocker network management", condition: "new", priceUSD: 38, brand: "Microsoft" }
    ],
    mid: [
      { name: "Ubuntu 24.04 LTS", specs: "Free · open platform terminal workspace asset", condition: "new", priceUSD: 0, brand: "Canonical" },
      { name: "Windows 11 Home OEM", specs: "Lifetime validation locked onto localized bios board hardware", condition: "new", priceUSD: 20, brand: "Microsoft" },
      { name: "Windows 11 Pro (Retail box setup key)", specs: "Full permissions framework remote desktop services enabled", condition: "new", priceUSD: 40, brand: "Microsoft" }
    ],
    high: [
      { name: "Ubuntu 24.04 LTS Core environment", specs: "Free open infrastructure asset zero performance overhead", condition: "new", priceUSD: 0, brand: "Canonical" },
      { name: "Windows 11 Home OEM Standard licensing", specs: "Digital deployment key lifetime local hardware validation", condition: "new", priceUSD: 20, brand: "Microsoft" },
      { name: "Windows 11 Pro (Full active key digital)", specs: "Corporate standard enterprise data validation security", condition: "new", priceUSD: 40, brand: "Microsoft" }
    ],
    flagship: [
      { name: "Ubuntu 24.04 LTS Open Environment", specs: "Free structural alternative framework multi-task tool", condition: "new", priceUSD: 0, brand: "Canonical" },
      { name: "Windows 11 Pro Retail Lifetime license", specs: "Complete administrative toolkit deployment infrastructure", condition: "new", priceUSD: 45, brand: "Microsoft" },
      { name: "Windows 11 Enterprise Volume dynamic path", specs: "Advanced security endpoint identity subsystem verification", condition: "new", priceUSD: 110, brand: "Microsoft" }
    ]
  }
};

// ══════════════════════════════════════════════
//  STATIC CONFIG FALLBACK ENGINE
// ══════════════════════════════════════════════
function buildSmartRecommendations() {
  const p = state.purpose;
  const tier = getBudgetTier(state.budgetUSD);
  const r = REGIONS[state.region];

  const tierMap = {
    scrappy:     ["scrappy",     "scrappy",     "ultraBudget"],
    ultraBudget: ["ultraBudget", "ultraBudget", "budget"],
    budget:      ["budget",      "budget",      "mid"],
    mid:         ["mid",         "mid",         "high"],
    high:        ["high",        "high",        "flagship"],
    flagship:    ["flagship",    ["flagship", 0], ["flagship", 2]]
  };

  const currentMap = tierMap[tier] || tierMap.budget;
  const t0 = currentMap[0], t1 = currentMap[1], t2 = currentMap[2];

  function pickThree(cat) {
    const db = COMPONENT_DB[cat];
    if (!db) return null;

    const getFirst = t => {
      const pool = Array.isArray(t) ? db[t[0]] : db[t];
      return pool ? pool[0] : null;
    };
    const getMid = t => {
      const pool = Array.isArray(t) ? db[t[0]] : db[t];
      return pool ? pool[Math.floor((pool.length - 1) / 2)] : null;
    };
    const getLast = t => {
      const pool = Array.isArray(t) ? db[t[0]] : db[t];
      return pool ? pool[pool.length - 1] : null;
    };

    let o0 = getFirst(t0) || getFirst(t1);
    let o1 = getMid(t1) || getMid(t0);
    let o2 = getLast(t2) || getLast(t1);

    o0 = o0 || getMid("budget") || getMid("ultraBudget");
    o1 = o1 || getMid("mid") || o0;
    o2 = o2 || getLast("mid") || o1;

    return [
      { ...o0, tier: "budget", priceLocal: Math.round(o0.priceUSD * r.rate) },
      { ...o1, tier: "mid",    priceLocal: Math.round(o1.priceUSD * r.rate) },
      { ...o2, tier: "high",   priceLocal: Math.round(o2.priceUSD * r.rate) }
    ];
  }

  const raw = {};
  Object.keys(COMPONENT_META).forEach(cat => {
    if (COMPONENT_DB[cat]) raw[cat] = pickThree(cat);
  });

  if (p === "gaming" && (tier === "high" || tier === "flagship")) {
    if (COMPONENT_DB.gpu.flagship) raw.gpu[2] = { ...COMPONENT_DB.gpu.flagship[0], tier: "high", priceLocal: Math.round(COMPONENT_DB.gpu.flagship[0].priceUSD * r.rate) };
    if (COMPONENT_DB.cpu.flagship) raw.cpu[2] = { ...COMPONENT_DB.cpu.flagship[0], tier: "high", priceLocal: Math.round(COMPONENT_DB.cpu.flagship[0].priceUSD * r.rate) };
  }

  if (p === "creative" && tier !== "scrappy") {
    if (COMPONENT_DB.ram.high)    raw.ram[2]      = { ...COMPONENT_DB.ram.high[0], tier: "high", priceLocal: Math.round(COMPONENT_DB.ram.high[0].priceUSD * r.rate) };
    if (COMPONENT_DB.storage.high) raw.storage[2] = { ...COMPONENT_DB.storage.high[0], tier: "high", priceLocal: Math.round(COMPONENT_DB.storage.high[0].priceUSD * r.rate) };
  }

  state.allOptions      = raw;
  state.totalCategories = Object.keys(raw).length;
}

function formatLocal(num) {
  return Math.round(num).toLocaleString();
}

// ══════════════════════════════════════════════
//  UI BUILDER RENDERER
// ══════════════════════════════════════════════
function renderBuilder() {
  const container = $("builder-categories-container");
  if (!container) return;
  container.innerHTML = "";

  Object.keys(COMPONENT_META).forEach(cat => {
    const meta = COMPONENT_META[cat];
    const options = state.allOptions[cat] || [];

    const block = document.createElement("div");
    block.className = "category-block scroll-reveal";
    block.innerHTML = `
      <div class="category-header">
        <div class="category-title">
          <span class="category-icon">${meta.icon}</span>
          <h2>${meta.label}</h2>
        </div>
        <span class="selection-badge" id="badge-${cat}"></span>
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
  const r = REGIONS[state.region];
  const tierClass = { budget: "tier-budget", mid: "tier-mid", high: "tier-high" }[opt.tier] || "tier-budget";
  const tierLabel = { budget: "Entry", mid: "Mid-Range", high: "Premium" }[opt.tier] || opt.tier;
  const condClass = opt.condition === "new" ? "cond-new" : "cond-used";
  const condLabel = opt.condition === "new" ? "✦ New" : "↻ Used";
  const priceStr = (opt.priceUSD === 0 || opt.priceLocal === 0) ? "Free" : r.symbol + " " + formatLocal(opt.priceLocal || Math.round((opt.priceUSD || 0) * r.rate));
  const isPremium = opt.tier === "high";
  const usedWarn = opt.condition === "used" ? `<div class="health-warning">🛡 Verify health >85% before buying. Request diagnostic report from seller.</div>` : "";

  return `
    <div class="option-card${isPremium ? " premium-card" : ""}" data-cat="${cat}" data-idx="${idx}">
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
//  SELECTION ENGINE (Deselect-Aware Variant)
// ══════════════════════════════════════════════
function selectComponent(cat, idx) {
  const option = state.allOptions[cat][idx];
  const isAlreadySelected = state.components[cat] === option || 
    (state.components[cat] && state.components[cat].name === option.name);

  if (isAlreadySelected) {
    // DESELECT: Remove the pointer from the global configuration tracking object
    delete state.components[cat];
    $(`grid-${cat}`).querySelectorAll(".option-card").forEach(card => {
      card.classList.remove("selected");
    });
    const badge = $(`badge-${cat}`);
    badge.textContent = "";
    badge.classList.remove("visible");
  } else {
    // SELECT: Overwrite allocation and assign active visual highlight tracking classes
    state.components[cat] = option;
    $(`grid-${cat}`).querySelectorAll(".option-card").forEach((card, i) => {
      card.classList.toggle("selected", i === idx);
    });
    const badge = $(`badge-${cat}`);
    badge.textContent = option.name.split(" ").slice(0, 4).join(" ");
    badge.classList.add("visible");
  }
  updateSummary();
}

// ══════════════════════════════════════════════
//  SUMMARY TRACKER
// ══════════════════════════════════════════════
function updateSummary() {
  const r = REGIONS[state.region];
  let runningTotalLocal = 0;
  let selectedCount = 0;

  Object.values(state.components).forEach(o => {
    runningTotalLocal += (o.priceLocal || Math.round((o.priceUSD || 0) * r.rate));
    selectedCount++;
  });

  $("summary-counter").textContent = `${selectedCount}/${state.totalCategories} Selected`;
  $("summary-price").textContent = `${r.symbol} ${formatLocal(runningTotalLocal)}`;

  const percent = Math.min(100, (runningTotalLocal / state.budgetLocal) * 100);
  const bar = $("summary-progress");
  if (bar) {
    bar.style.width = percent + "%";
    if (percent > 100) bar.style.background = "var(--red)";
    else if (percent > 85) bar.style.background = "var(--orange)";
    else bar.style.background = "var(--primary)";
  }

  // Clear list buffer right side panel
  const list = $("summary-items-list");
  if (!list) return;
  list.innerHTML = "";

  Object.keys(state.components).forEach(cat => {
    const opt = state.components[cat];
    const meta = COMPONENT_META[cat];
    const priceStr = (opt.priceUSD === 0 || opt.priceLocal === 0) ? "Free" : r.symbol + " " + formatLocal(opt.priceLocal || Math.round((opt.priceUSD || 0) * r.rate));

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

  $("save-btn").disabled = selectedCount === 0;
}

// ══════════════════════════════════════════════
//  SAVE → SHOW RECEIPT MODAL
// ══════════════════════════════════════════════
function saveBuild() {
  const r = REGIONS[state.region];
  let totalLocal = 0;

  Object.values(state.components).forEach(o => {
    totalLocal += (o.priceLocal || Math.round((o.priceUSD || 0) * r.rate));
  });

  const assemblyFee = Math.round(totalLocal * 0.07);
  const thermalPaste = Math.round(4 * r.rate); // ~4 USD estimated local allocation
  const grandTotal = totalLocal + assemblyFee + thermalPaste;

  let itemsHTML = "";
  Object.keys(state.components).forEach(cat => {
    const opt = state.components[cat];
    const meta = COMPONENT_META[cat];
    const priceStr = (opt.priceUSD === 0 || opt.priceLocal === 0) ? "Free" : r.symbol + " " + formatLocal(opt.priceLocal || Math.round((opt.priceUSD || 0) * r.rate));
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
    <div class="receipt-total-row grand"><span>TOTAL ESTIMATE</span><span>${r.symbol} ${formatLocal(grandTotal)}</span></div>
    <div class="receipt-total-row" style="font-size:0.7rem;color:#888;margin-top:4px">
      <span>Budget Bound</span><span>${r.symbol} ${formatLocal(state.budgetLocal)}</span>
    </div>
  `;

  $("receipt-modal").classList.remove("hidden");
}