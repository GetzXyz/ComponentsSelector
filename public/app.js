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
  monitor:    { icon: "🖵", label: "Monitor"                  },
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
const formatLocal = num => Number(num).toLocaleString(undefined, { maximumFractionDigits: 0 });

function getBudgetTier(budgetUSD) {
  if (budgetUSD < 120)  return "scrappy";
  if (budgetUSD < 220)  return "ultraBudget";
  if (budgetUSD < 400)  return "budget";
  if (budgetUSD < 800)  return "mid";
  if (budgetUSD < 1800) return "high";
  return "flagship";
}

// ── CURSOR GLOW + PARTICLES ────────────────────
function initCursor() {
  const glow = $("cursor-glow");
  if (!glow) return;
  document.addEventListener("mousemove", e => {
    glow.style.left = e.clientX + "px";
    glow.style.top  = e.clientY + "px";
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

  const DOTS = 40;
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
    requestAnimationFrame(frame);
  }
  frame();
}

function initScrollReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("revealed");
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll(".scroll-reveal, .category-block").forEach(el => observer.observe(el));
}

function showBudgetModal(minAmount, symbol) {
  const minAmtEl = $("modal-min-amount");
  if (minAmtEl) minAmtEl.textContent = symbol + " " + Math.round(minAmount).toLocaleString();
  const bModal = $("budget-modal");
  if (bModal) bModal.classList.remove("hidden");
}
function hideBudgetModal() {
  const bModal = $("budget-modal");
  if (bModal) bModal.classList.add("hidden");
}

// ── INITIALIZATION ─────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initCursor();
  initParticles();
  setupOnboarding();

  const closeBtn = $("modal-close-btn");
  if (closeBtn) closeBtn.addEventListener("click", hideBudgetModal);
  
  const bModal = $("budget-modal");
  if (bModal) bModal.addEventListener("click", e => { if (e.target === bModal) hideBudgetModal(); });

  const rcBtn = $("receipt-close-btn");
  if (rcBtn) rcBtn.addEventListener("click", () => $("receipt-modal").classList.add("hidden"));

  const rModal = $("receipt-modal");
  if (rModal) rModal.addEventListener("click", e => { if (e.target === rModal) rModal.classList.add("hidden"); });
});

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

  const startBtn = $("start-btn");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
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
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const map = { onboarding: "screen-onboarding", loading: "screen-loading", builder: "screen-builder" };
  const target = $(map[name]);
  if (target) target.classList.add("active");
}

function runLoadingSequence() {
  const steps  = ["ls1","ls2","ls3","ls4"];
  const labels = ["Analysing budget range", "Fetching component data", "Matching compatibility", "Calculating value tiers"];
  let i = 0;
  const iv = setInterval(() => {
    if (i > 0) {
      const prev = $(steps[i-1]);
      if (prev) {
        prev.classList.remove("active");
        prev.classList.add("done");
        prev.textContent = "✓ " + labels[i-1];
      }
    }
    if (i < steps.length) {
      const curr = $(steps[i]);
      if (curr) {
        curr.classList.add("active");
        curr.textContent = labels[i];
      }
      i++;
    } else {
      clearInterval(iv);
    }
  }, 700);
}

function getBudgetDistribution(budgetUSD, purpose, tier) {
  const pCaps = {
    scrappy:     { monitor: 40, keyboard: 4,  mouse: 4,  headset: 5,  networking: 5  },
    ultraBudget: { monitor: 60, keyboard: 6,  mouse: 5,  headset: 8,  networking: 8  },
    budget:      { monitor: 95, keyboard: 15, mouse: 12, headset: 18, networking: 15 },
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

  const a = alloc[tier] || alloc.budget;
  const p = pCaps[tier] || pCaps.budget;
  const coreTotal = Object.values(a).reduce((s, v) => s + v, 0);
  const peripheralTotal = Object.values(p).reduce((s, v) => s + v, 0);
  const coreUSD = Math.max(0, budgetUSD - peripheralTotal - 15);

  return {
    cpu: Math.round(coreUSD * (a.cpu / coreTotal)), gpu: Math.round(coreUSD * (a.gpu / coreTotal)),
    mb: Math.round(coreUSD * (a.mb / coreTotal)), ram: Math.round(coreUSD * (a.ram / coreTotal)),
    storage: Math.round(coreUSD * (a.storage / coreTotal)), psu: Math.round(coreUSD * (a.psu / coreTotal)),
    cooler: Math.round(coreUSD * (a.cooler / coreTotal)), case: Math.round(coreUSD * (a.case / coreTotal)),
    monitor: p.monitor, keyboard: p.keyboard, mouse: p.mouse, headset: p.headset, networking: p.networking, os: 15
  };
}

async function fetchComponents() {
  buildSmartRecommendations(); 
  renderBuilder();
  showScreen("builder");
  setTimeout(initScrollReveal, 100);
}

// ── MASTER FALLBACK DATABASE ───────────────────
const COMPONENT_DB = {
  cpu: {
    scrappy:     [{ name: "Intel Core i5-6500 (Used)", specs: "4c/4t · 3.2GHz", priceUSD: 22 }, { name: "AMD Ryzen 3 1200", specs: "4c/4t", priceUSD: 18 }],
    ultraBudget: [{ name: "Intel Core i3-10100F", specs: "4c/8t · 4.3GHz boost", priceUSD: 45 }],
    budget:      [{ name: "AMD Ryzen 5 5600", specs: "6c/12t · 32MB Cache", priceUSD: 100 }],
    mid:         [{ name: "Intel Core i5-13600K", specs: "14c/20t · 5.1GHz", priceUSD: 250 }],
    high:        [{ name: "AMD Ryzen 7 7800X3D", specs: "8c/16t · 3D V-Cache", priceUSD: 370 }],
    flagship:    [{ name: "AMD Ryzen 9 9950X3D", specs: "16c/32t · Enthusiast", priceUSD: 649 }]
  },
  gpu: {
    scrappy:     [{ name: "NVIDIA GTX 1050 Ti 4GB", specs: "GDDR5 Entry", priceUSD: 40 }],
    ultraBudget: [{ name: "AMD RX 580 8GB (Used)", specs: "1080p Budget Gaming", priceUSD: 65 }],
    budget:      [{ name: "AMD RX 6600 8GB", specs: "GDDR6 · Raytracing support", priceUSD: 170 }],
    mid:         [{ name: "NVIDIA RTX 4070 12GB", specs: "1440p Fluid · DLSS 3", priceUSD: 550 }],
    high:        [{ name: "NVIDIA RTX 4080 Super", specs: "4K High Frame Rates", priceUSD: 999 }],
    flagship:    [{ name: "NVIDIA GeForce RTX 5090", specs: "32GB GDDR7 · 8K Ready", priceUSD: 1999 }]
  },
  mb: {
    scrappy:     [{ name: "H110M Motherboard", specs: "DDR4 · Micro-ATX", priceUSD: 22 }],
    ultraBudget: [{ name: "Gigabyte A520M S2H", specs: "AM4 budget base", priceUSD: 65 }],
    budget:      [{ name: "ASRock B550M Pro4", specs: "Dual M.2 slots", priceUSD: 85 }],
    mid:         [{ name: "ASUS TUF B650-Plus WiFi", specs: "DDR5 · ATX gaming layout", priceUSD: 175 }],
    high:        [{ name: "MSI MEG Z790 Godlike", specs: "Extreme power design", priceUSD: 650 }],
    flagship:    [{ name: "ASUS ROG Crosshair X870E", specs: "PCIe 5.0 · WiFi 7 ready", priceUSD: 550 }]
  },
  ram: {
    scrappy:     [{ name: "8GB DDR4 2666MHz", specs: "Value RAM module", priceUSD: 12 }],
    ultraBudget: [{ name: "16GB DDR4 3200MHz (2x8GB)", specs: "Dual channel performance", priceUSD: 32 }],
    budget:      [{ name: "16GB DDR4 3600MHz CL16", specs: "Low latency kit", priceUSD: 45 }],
    mid:         [{ name: "32GB DDR5 6000MHz CL30", specs: "Next-gen sweet-spot", priceUSD: 105 }],
    high:        [{ name: "64GB DDR5 6400MHz High-Speed", specs: "Enthusiast tuning profile", priceUSD: 210 }],
    flagship:    [{ name: "128GB DDR5 Workstation Grade", specs: "Quad capacity configuration", priceUSD: 450 }]
  },
  storage: {
    scrappy: [{ name: "256GB SATA SSD", specs: "Fast boot drives", priceUSD: 14 }],
    ultraBudget: [{ name: "512GB NVMe M.2 SSD", specs: "1500MB/s speeds", priceUSD: 28 }],
    budget: [{ name: "1TB NVMe PCIe 4.0 SSD", specs: "3500MB/s speeds", priceUSD: 55 }],
    mid: [{ name: "2TB high speed Gen4 SSD", specs: "7000MB/s gaming speed", priceUSD: 125 }],
    high: [{ name: "4TB Gen4 Enterprise SSD", specs: "Maximum file vaulting", priceUSD: 260 }],
    flagship: [{ name: "8TB PCIe 5.0 Ultimate NVMe", specs: "14000MB/s extreme read", priceUSD: 799 }]
  },
  psu: {
    scrappy: [{ name: "400W Standard Unit", specs: "Basic power supply", priceUSD: 15 }],
    ultraBudget: [{ name: "500W 80+ Bronze certified", specs: "Reliable entry juice", priceUSD: 35 }],
    budget: [{ name: "650W 80+ Bronze rated PSU", specs: "Mid range headroom", priceUSD: 55 }],
    mid: [{ name: "750W 80+ Gold Fully Modular", specs: "Clean cable management", priceUSD: 95 }],
    high: [{ name: "1000W 80+ Platinum ATX 3.0", specs: "Heavy GPU safe delivery", priceUSD: 180 }],
    flagship: [{ name: "1600W Titanium Smart Unit", specs: "Unmatched performance stability", priceUSD: 399 }]
  },
  cooler: {
    scrappy: [{ name: "Intel Stock Cooler", specs: "Bundled thermal unit", priceUSD: 0 }],
    ultraBudget: [{ name: "Basic Air Cooler", specs: "90mm generic fan solution", priceUSD: 12 }],
    budget: [{ name: "Thermalright Assassin X 120", specs: "4 copper heatpipes", priceUSD: 20 }],
    mid: [{ name: "240mm Liquid AIO Cooler", specs: "Closed loop RGB unit", priceUSD: 75 }],
    high: [{ name: "360mm Premium Liquid AIO", specs: "LCD pump setup config", priceUSD: 140 }],
    flagship: [{ name: "Custom Dual Loop Water Rig", specs: "Hardline thermal craft", priceUSD: 450 }]
  },
  case: {
    scrappy: [{ name: "Standard Office ATX Case", specs: "Minimalist black box", priceUSD: 15 }],
    ultraBudget: [{ name: "Budget Mesh Case", specs: "2x front fans built-in", priceUSD: 30 }],
    budget: [{ name: "Montech AIR 903 Base", specs: "High airflow layout structure", priceUSD: 65 }],
    mid: [{ name: "Corsair 4000D Airflow", specs: "Premium structural design", priceUSD: 90 }],
    high: [{ name: "Lian Li O11 Dynamic EVO", specs: "Panoramic glass layout window", priceUSD: 160 }],
    flagship: [{ name: "HYTE Y70 Touch Screen Case", specs: "Built-in dynamic dashboard screen", priceUSD: 280 }]
  },
  monitor: {
    scrappy: [{ name: "20\" Used Office LCD", specs: "1600x900 resolution standard", priceUSD: 25 }],
    ultraBudget: [{ name: "22\" 1080p 75Hz Monitor", specs: "FHD IPS display panel", priceUSD: 65 }],
    budget: [{ name: "24\" 1080p 144Hz Gaming Display", specs: "1ms moving picture response", priceUSD: 110 }],
    mid: [{ name: "27\" 1440p 165Hz IPS Panel", specs: "Crisp 2K resolution field", priceUSD: 220 }],
    high: [{ name: "34\" Ultrawide QD-OLED 240Hz", specs: "Infinite visual depth contrast", priceUSD: 799 }],
    flagship: [{ name: "ROG 49\" Super Ultrawide Dual-FHD", specs: "Massive surround sight curvature", priceUSD: 1199 }]
  },
  keyboard: {
    scrappy: [{ name: "Membrane Slim Keyboard", specs: "Standard office setup keys", priceUSD: 5 }],
    ultraBudget: [{ name: "RGB Membrane Keyboard", specs: "Backlit typing experience", priceUSD: 10 }],
    budget: [{ name: "Budget Mechanical Keyboard", specs: "Blue clicky switch triggers", priceUSD: 25 }],
    mid: [{ name: "Keychron K2 Wireless Mech", specs: "Gateron switches hot-swappable", priceUSD: 80 }],
    high: [{ name: "Wooting 60HE Analog", specs: "Rapid trigger magnetic sensors", priceUSD: 175 }],
    flagship: [{ name: "Custom Handcrafted Aluminum Mech", specs: "Lubed linear studio switches", priceUSD: 350 }]
  },
  mouse: {
    scrappy: [{ name: "Wired Optical Mouse", specs: "3 buttons functionality", priceUSD: 4 }],
    ultraBudget: [{ name: "Basic RGB Gaming Mouse", specs: "Adjustable DPI selector profiles", priceUSD: 8 }],
    budget: [{ name: "Logitech G102 Lightsync", specs: "8000 max gaming DPI tracking", priceUSD: 22 }],
    mid: [{ name: "Logitech G502 X Wireless", specs: "Ergonomic modular side grips", priceUSD: 90 }],
    high: [{ name: "Razer DeathAdder V3 Pro", specs: "Ultra lightweight 63g build", priceUSD: 140 }],
    flagship: [{ name: "Finalmouse Ultralight Carbon Magnesium", specs: "Enthusiast competitive grade chassis", priceUSD: 299 }]
  },
  headset: {
    scrappy: [{ name: "Basic In-Ear Earphones", specs: "3.5mm standard audio jack", priceUSD: 4 }],
    ultraBudget: [{ name: "Stereo Gaming Headset", specs: "Over ear soft cushion leather", priceUSD: 12 }],
    budget: [{ name: "HyperX Cloud Stinger 2", specs: "Light comfort directional audio", priceUSD: 35 }],
    mid: [{ name: "HyperX Cloud III Wireless", specs: "Massive 120 hour cell duration", priceUSD: 130 }],
    high: [{ name: "SteelSeries Arctis Nova Pro", specs: "Dual cell active noise canceling", priceUSD: 299 }],
    flagship: [{ name: "Sennheiser HD800S Studio Grade", specs: "Unmatched spatial acoustic soundscape", priceUSD: 1599 }]
  },
  networking: {
    scrappy: [{ name: "Ethernet Cable LAN 5m", specs: "Direct mother link connection", priceUSD: 3 }],
    ultraBudget: [{ name: "USB WiFi Adapter dongle", specs: "150Mbps basic legacy signal", priceUSD: 8 }],
    budget: [{ name: "PCIe WiFi 5 Card Adapter", specs: "Dual band stable connection link", priceUSD: 18 }],
    mid: [{ name: "PCIe WiFi 6E Bluetooth 5.3", specs: "Tri-band ultra clear download", priceUSD: 40 }],
    high: [{ name: "Wi-Fi 7 Premium Desktop Adapter", specs: "Extreme multi-gig band channels", priceUSD: 95 }],
    flagship: [{ name: "ASUS ROG Rapture Wi-Fi 7 Router Mesh", specs: "Dedicated 10G gaming networks arrays", priceUSD: 650 }]
  },
  os: {
    scrappy: [{ name: "Ubuntu Linux OS Free", specs: "Open source community package", priceUSD: 0 }],
    ultraBudget: [{ name: "Windows 11 Home OEM", specs: "Digital license product tier", priceUSD: 15 }],
    budget: [{ name: "Windows 11 Home Key", specs: "Authentic license package build", priceUSD: 20 }],
    mid: [{ name: "Windows 11 Pro Digital License", specs: "Advanced encryption systems enabled", priceUSD: 25 }],
    high: [{ name: "Windows 11 Pro Retail Key", specs: "Transferable license across hardware setups", priceUSD: 40 }],
    flagship: [{ name: "Windows 11 Pro Retail Box", specs: "Physical flash collector layout package", priceUSD: 120 }]
  }
};

function buildSmartRecommendations() {
  const tier = getBudgetTier(state.budgetUSD);
  const raw = {};
  
  Object.keys(COMPONENT_META).forEach(cat => {
    const db = COMPONENT_DB[cat];
    if (!db) return;
    const matchedArr = db[tier] || db.budget;
    const baseObj = matchedArr[0];
    
    raw[cat] = [
      { ...baseObj, name: baseObj.name + " (Eco)", priceLocal: Math.round(baseObj.priceUSD * 0.85 * REGIONS[state.region].rate), priceUSD: baseObj.priceUSD * 0.85, tier: "budget" },
      { ...baseObj, name: baseObj.name, priceLocal: Math.round(baseObj.priceUSD * REGIONS[state.region].rate), priceUSD: baseObj.priceUSD, tier: "mid" },
      { ...baseObj, name: baseObj.name + " (Pro)", priceLocal: Math.round(baseObj.priceUSD * 1.2 * REGIONS[state.region].rate), priceUSD: baseObj.priceUSD * 1.2, tier: "high" }
    ];
  });
  
  state.allOptions = raw;
  state.totalCategories = Object.keys(raw).length;
}

function renderBuilder() {
  const container = $("categories-container");
  if (!container) return;
  container.innerHTML = "";

  Object.keys(state.allOptions).forEach(cat => {
    const meta = COMPONENT_META[cat];
    const options = state.allOptions[cat];
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
      </div>
    `;
    container.appendChild(block);
  });

  document.querySelectorAll(".option-card").forEach(card => {
    card.addEventListener("click", () => {
      selectComponent(card.dataset.cat, parseInt(card.dataset.idx));
    });
  });

  // 🛡️ Safe Check: Prevents crash if back-btn doesn't exist in HTML
  const backBtn = $("back-btn");
  if (backBtn) {
    backBtn.onclick = () => {
      state.components = {};
      showScreen("onboarding");
    };
  }

  // 🛡️ Safe Check: Prevents crash if save-btn doesn't exist in HTML
  const saveBtn = $("save-btn");
  if (saveBtn) {
    saveBtn.onclick = saveBuild;
  }

  updateSummary();
}

function renderOptionCard(cat, opt, idx) {
  const r = REGIONS[state.region];
  const tierClass = { budget: "tier-budget", mid: "tier-mid", high: "tier-high" }[opt.tier] || "tier-budget";
  const tierLabel = { budget: "Entry", mid: "Mid-Range", high: "Premium" }[opt.tier] || opt.tier;
  const priceStr = opt.priceUSD === 0 ? "Free" : r.symbol + " " + formatLocal(opt.priceLocal);
  const isPremium = opt.tier === "high";

  return `
    <div class="option-card${isPremium ? " premium-card" : ""}" data-cat="${cat}" data-idx="${idx}">
      <span class="option-tier ${tierClass}">${tierLabel}</span>
      <div class="option-name">${opt.name}</div>
      <div class="option-specs">${opt.specs}</div>
      <div class="option-footer">
        <span class="option-condition cond-new">✦ Asset</span>
        <span class="option-price">${priceStr}</span>
      </div>
    </div>
  `;
}

function selectComponent(cat, idx) {
  const option = state.allOptions[cat][idx];
  state.components[cat] = option;
  $(`grid-${cat}`).querySelectorAll(".option-card").forEach((card, i) => {
    card.classList.toggle("selected", i === idx);
  });
  const badge = $(`badge-${cat}`);
  if (badge) {
    badge.textContent = option.name.split(" ").slice(0, 3).join(" ");
    badge.classList.add("visible");
  }
  updateSummary();
}

function updateSummary() {
  const list = $("summary-list");
  if (!list) return;
  list.innerHTML = "";
  
  const r = REGIONS[state.region];
  let totalUSD = 0;
  let selected = 0;

  Object.keys(COMPONENT_META).forEach(cat => {
    const opt = state.components[cat];
    if (!opt) return;
    
    selected++;
    totalUSD += opt.priceUSD;
    const meta = COMPONENT_META[cat];
    const priceStr = opt.priceUSD === 0 ? "Free" : r.symbol + " " + formatLocal(opt.priceLocal);
    
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

  const saveBtn = $("save-btn");
  if (saveBtn) saveBtn.disabled = selected === 0;
}

function saveBuild() {
  const r = REGIONS[state.region];
  let totalLocal = 0;
  let itemsHTML = "";

  Object.keys(state.components).forEach(cat => {
    const opt = state.components[cat];
    const meta = COMPONENT_META[cat];
    totalLocal += opt.priceLocal;
    const priceStr = opt.priceUSD === 0 ? "Free" : r.symbol + " " + formatLocal(opt.priceLocal);
    itemsHTML += `
      <div class="receipt-row">
        <div class="receipt-row-left">
          <div class="receipt-cat">${meta.label}</div>
          <div class="receipt-name">${opt.name}</div>
        </div>
        <div class="receipt-price">${priceStr}</div>
      </div>
    `;
  });

  const assemblyFee = Math.round(totalLocal * 0.05);
  const grandTotal = totalLocal + assemblyFee;

  $("receipt-items").innerHTML = itemsHTML;
  $("receipt-totals").innerHTML = `
    <div class="receipt-total-row"><span>Components Subtotal</span><span>${r.symbol} ${formatLocal(totalLocal)}</span></div>
    <div class="receipt-total-row"><span>Assembly Setup Fee</span><span>${r.symbol} ${formatLocal(assemblyFee)}</span></div>
    <div class="receipt-total-row grand"><span>TOTAL ESTIMATE</span><span>${r.symbol} ${formatLocal(grandTotal)}</span></div>
  `;

  $("receipt-modal").classList.remove("hidden");
}