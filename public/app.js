/* =====================================================
   FORGE — AI PC Builder  |  app.js
   =====================================================
   Key improvements vs original:
   1. History API (pushState / popstate) for Back/Fwd
   2. Budget allocation logic: total build budget,
      not per-component budget
   3. Red/white theme particle colours
   4. Smooth ripple click effect on buttons
   5. Animated floating PC icons
   6. Sidebar live budget-usage progress bar
   ===================================================== */

"use strict";

/* ─── REGIONS ──────────────────────────────────────── */
const REGIONS = {
  PK: { currency: "PKR", symbol: "₨",  rate: 278.5, minBudget: 30000  },
  US: { currency: "USD", symbol: "$",  rate: 1.0,   minBudget: 120    },
  GB: { currency: "GBP", symbol: "£",  rate: 0.79,  minBudget: 95     },
  EU: { currency: "EUR", symbol: "€",  rate: 0.92,  minBudget: 110    },
  IN: { currency: "INR", symbol: "₹",  rate: 83.5,  minBudget: 10000  },
};

/* ─── COMPONENT METADATA ───────────────────────────── */
const COMPONENT_META = {
  cpu:        { icon: "🔲", label: "Processor (CPU)"         },
  gpu:        { icon: "🎮", label: "Graphics Card (GPU)"      },
  mb:         { icon: "🔌", label: "Motherboard"              },
  ram:        { icon: "💾", label: "Memory (RAM)"             },
  storage:    { icon: "💿", label: "Storage (SSD)"            },
  psu:        { icon: "⚡", label: "Power Supply (PSU)"      },
  cooler:     { icon: "❄️", label: "CPU Cooler"              },
  case_:      { icon: "🖥️", label: "PC Case"                 },
  monitor:    { icon: "🖵", label: "Monitor"                  },
  keyboard:   { icon: "⌨️", label: "Keyboard"                },
  mouse:      { icon: "🖱️", label: "Mouse"                   },
  headset:    { icon: "🎧", label: "Headset / Audio"          },
  networking: { icon: "📡", label: "Networking (WiFi)"        },
  os:         { icon: "💻", label: "Operating System"         },
};

/* ─── STATE ─────────────────────────────────────────── */
const state = {
  region: "PK",
  budgetLocal: 150000,
  budgetUSD: 0,
  purpose: "gaming",
  components: {},
  allOptions: {},
};

/* ─── HELPERS ───────────────────────────────────────── */
const $ = id => document.getElementById(id);
const fmt = n => Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

/* ─── BUDGET TIER ───────────────────────────────────── */
/* Budget here is the TOTAL build in USD — used to pick component DB tiers */
function getBudgetTier(totalUSD) {
  if (totalUSD < 180)  return "scrappy";
  if (totalUSD < 350)  return "ultraBudget";
  if (totalUSD < 650)  return "budget";
  if (totalUSD < 1200) return "mid";
  if (totalUSD < 2500) return "high";
  return "flagship";
}

/* ─── COMPONENT DATABASE ────────────────────────────── */
/*
  IMPORTANT: priceUSD here is the per-component market price.
  The allocation engine below picks components so the TOTAL
  stays within the user's build budget.
*/
const COMPONENT_DB = {
  cpu: {
    scrappy:     [{ name: "Intel Core i3-9100F (Used)",    specs: "4c/4t · 65W",         priceUSD: 30  }],
    ultraBudget: [{ name: "Intel Core i3-10100F",          specs: "4c/8t · 65W",         priceUSD: 55  }],
    budget:      [{ name: "AMD Ryzen 5 5600",              specs: "6c/12t · Zen3",        priceUSD: 100 }],
    mid:         [{ name: "Intel Core i5-13400F",          specs: "10c/16t · B660",       priceUSD: 170 }],
    high:        [{ name: "AMD Ryzen 7 7800X3D",           specs: "8c/16t · 3D V-Cache",  priceUSD: 370 }],
    flagship:    [{ name: "AMD Ryzen 9 9950X3D",           specs: "16c/32t · Zen5",       priceUSD: 649 }],
  },
  gpu: {
    scrappy:     [{ name: "NVIDIA GTX 1050 Ti 4GB (Used)", specs: "1080p Low",            priceUSD: 50  }],
    ultraBudget: [{ name: "AMD RX 6600 8GB",               specs: "1080p High · GDDR6",  priceUSD: 150 }],
    budget:      [{ name: "NVIDIA RTX 3060 12GB",          specs: "1080p/1440p · DLSS",  priceUSD: 220 }],
    mid:         [{ name: "NVIDIA RTX 4070 12GB",          specs: "1440p · DLSS 3",       priceUSD: 550 }],
    high:        [{ name: "NVIDIA RTX 4080 Super 16GB",    specs: "4K High · Frame Gen",  priceUSD: 999 }],
    flagship:    [{ name: "NVIDIA RTX 5090 32GB",          specs: "4K Max · DLSS 4",      priceUSD: 1999}],
  },
  mb: {
    scrappy:     [{ name: "Gigabyte H310M S2 2.0",         specs: "LGA1151 · 2xDDR4",    priceUSD: 28  }],
    ultraBudget: [{ name: "ASRock B450M-HDV",              specs: "AM4 · 2xDDR4",        priceUSD: 55  }],
    budget:      [{ name: "ASRock B550M Pro4",             specs: "AM4 · Dual M.2",       priceUSD: 85  }],
    mid:         [{ name: "Gigabyte B660M DS3H",           specs: "LGA1700 · DDR4",       priceUSD: 100 }],
    high:        [{ name: "ASUS TUF B650-Plus WiFi",       specs: "AM5 · DDR5 · 2.5G",   priceUSD: 175 }],
    flagship:    [{ name: "ASUS ROG Crosshair X870E",      specs: "AM5 · PCIe 5 · WiFi7", priceUSD: 550 }],
  },
  ram: {
    scrappy:     [{ name: "8GB DDR4 2666MHz",              specs: "Single Channel",       priceUSD: 14  }],
    ultraBudget: [{ name: "16GB DDR4 3200MHz",             specs: "Dual Channel · CL16",  priceUSD: 32  }],
    budget:      [{ name: "16GB DDR4 3600MHz CL16",        specs: "Low Latency Kit",      priceUSD: 42  }],
    mid:         [{ name: "32GB DDR4 3600MHz",             specs: "Dual Channel · CL18",  priceUSD: 65  }],
    high:        [{ name: "32GB DDR5 6000MHz CL30",        specs: "Sweet-spot DDR5",      priceUSD: 105 }],
    flagship:    [{ name: "64GB DDR5 6400MHz",             specs: "Enthusiast Kit",       priceUSD: 210 }],
  },
  storage: {
    scrappy:     [{ name: "256GB SATA SSD",                specs: "Boot Drive",           priceUSD: 15  }],
    ultraBudget: [{ name: "512GB NVMe Gen3 SSD",           specs: "3500 MB/s",            priceUSD: 28  }],
    budget:      [{ name: "1TB NVMe Gen4 SSD",             specs: "7000 MB/s",            priceUSD: 55  }],
    mid:         [{ name: "2TB NVMe Gen4 SSD",             specs: "7000 MB/s · Large",    priceUSD: 100 }],
    high:        [{ name: "2TB + 4TB HDD Combo",           specs: "Speed + Mass Storage", priceUSD: 180 }],
    flagship:    [{ name: "4TB PCIe 5.0 NVMe",            specs: "14000 MB/s",            priceUSD: 499 }],
  },
  psu: {
    scrappy:     [{ name: "400W Bronze PSU",               specs: "Basic Efficiency",     priceUSD: 18  }],
    ultraBudget: [{ name: "550W 80+ Bronze",               specs: "Corsair CV550",        priceUSD: 40  }],
    budget:      [{ name: "650W 80+ Bronze",               specs: "Mid Headroom",         priceUSD: 55  }],
    mid:         [{ name: "750W 80+ Gold Mod",             specs: "Fully Modular",        priceUSD: 90  }],
    high:        [{ name: "850W 80+ Gold ATX3",            specs: "PCIe 5 Ready",         priceUSD: 120 }],
    flagship:    [{ name: "1000W 80+ Platinum Mod",        specs: "Future-Proof",         priceUSD: 200 }],
  },
  cooler: {
    scrappy:     [{ name: "Stock Cooler (Boxed)",          specs: "Adequate at stock",    priceUSD: 0   }],
    ultraBudget: [{ name: "Thermalright Assassin 120",     specs: "4 Heatpipe · 120mm",   priceUSD: 18  }],
    budget:      [{ name: "DeepCool AK400",                specs: "4 Heatpipe · 120mm",   priceUSD: 25  }],
    mid:         [{ name: "Thermalright Peerless Assn.",   specs: "6 Heatpipe · 120mm",   priceUSD: 40  }],
    high:        [{ name: "240mm Liquid AIO",              specs: "RGB AIO · 2x120mm",    priceUSD: 80  }],
    flagship:    [{ name: "360mm Premium AIO",             specs: "LCD Head · 3x120mm",   priceUSD: 150 }],
  },
  case_: {
    scrappy:     [{ name: "Generic ATX Case",              specs: "Basic steel",          priceUSD: 18  }],
    ultraBudget: [{ name: "Ant Esports ICE-100 Mesh",      specs: "Mesh Airflow",         priceUSD: 32  }],
    budget:      [{ name: "Montech AIR 903 Base",          specs: "Airflow chassis",      priceUSD: 60  }],
    mid:         [{ name: "Corsair 4000D Airflow",         specs: "Premium Mesh",         priceUSD: 90  }],
    high:        [{ name: "Lian Li O11 Dynamic Evo",       specs: "Glass Window · ITX",   priceUSD: 150 }],
    flagship:    [{ name: "HYTE Y70 Touch",                specs: "LCD Dashboard",        priceUSD: 280 }],
  },
  monitor: {
    scrappy:     [{ name: "20\" 1080p 60Hz LCD",           specs: "Basic Office Panel",   priceUSD: 30  }],
    ultraBudget: [{ name: "22\" 1080p 75Hz IPS",           specs: "IPS · HDMI",           priceUSD: 60  }],
    budget:      [{ name: "24\" 1080p 144Hz IPS",          specs: "1ms · FreeSync",       priceUSD: 110 }],
    mid:         [{ name: "27\" 1440p 165Hz IPS",          specs: "2K · FreeSync Prem",   priceUSD: 220 }],
    high:        [{ name: "27\" 4K 144Hz OLED",            specs: "0.03ms OLED",          priceUSD: 500 }],
    flagship:    [{ name: "34\" QD-OLED Ultrawide",        specs: "175Hz Ultrawide",      priceUSD: 900 }],
  },
  keyboard: {
    scrappy:     [{ name: "Membrane Keyboard",             specs: "Standard Layout",      priceUSD: 6   }],
    ultraBudget: [{ name: "Redragon K552 Mech",            specs: "Brown Switches · TKL", priceUSD: 18  }],
    budget:      [{ name: "RK84 Wireless Mech",            specs: "Hot-swap · BT5.0",     priceUSD: 45  }],
    mid:         [{ name: "Keychron K2 Pro",               specs: "QMK · Hot-swap · BT",  priceUSD: 90  }],
    high:        [{ name: "Wooting 60HE Analog",           specs: "Rapid Trigger · Mag",  priceUSD: 175 }],
    flagship:    [{ name: "Custom GMK67 Build",            specs: "Lubed Linear · Gasket",priceUSD: 350 }],
  },
  mouse: {
    scrappy:     [{ name: "Basic Optical Mouse",           specs: "USB Wired",            priceUSD: 5   }],
    ultraBudget: [{ name: "Logitech G102 Lightsync",       specs: "8000 DPI · RGB",       priceUSD: 20  }],
    budget:      [{ name: "Logitech G304 Wireless",        specs: "12000 DPI · 2.4G",     priceUSD: 35  }],
    mid:         [{ name: "Logitech G502 X Plus",          specs: "Lightspeed · 25K DPI", priceUSD: 90  }],
    high:        [{ name: "Razer DeathAdder V3 Pro",       specs: "Wireless · 63g",       priceUSD: 140 }],
    flagship:    [{ name: "Finalmouse Carbon Mg",          specs: "Competitive · 41g",    priceUSD: 299 }],
  },
  headset: {
    scrappy:     [{ name: "Basic 3.5mm Headset",           specs: "Stereo Mic",           priceUSD: 6   }],
    ultraBudget: [{ name: "Redragon H510 Zeus",            specs: "7.1 Surround USB",     priceUSD: 20  }],
    budget:      [{ name: "HyperX Cloud Stinger 2",        specs: "50mm Drivers",         priceUSD: 40  }],
    mid:         [{ name: "HyperX Cloud III Wireless",     specs: "Wireless · 120hr",     priceUSD: 130 }],
    high:        [{ name: "SteelSeries Arctis Nova Pro W", specs: "ANC · Dual Wireless",  priceUSD: 299 }],
    flagship:    [{ name: "Sennheiser HD 800S + Amp",      specs: "Studio Audiophile",    priceUSD: 1699}],
  },
  networking: {
    scrappy:     [{ name: "CAT6 Ethernet Cable 5m",        specs: "Direct 1Gbps",         priceUSD: 4   }],
    ultraBudget: [{ name: "TP-Link USB WiFi Adapter",      specs: "AC600 Dual Band",      priceUSD: 10  }],
    budget:      [{ name: "PCIe WiFi 5 BT 4.2 Card",       specs: "867Mbps · BT",         priceUSD: 18  }],
    mid:         [{ name: "PCIe WiFi 6E BT 5.3",           specs: "2.4Gbps · Tri-Band",   priceUSD: 40  }],
    high:        [{ name: "WiFi 7 PCIe Adapter",           specs: "5.8Gbps · BT5.4",      priceUSD: 80  }],
    flagship:    [{ name: "ROG Rapture GT-BE98 Router",    specs: "WiFi 7 10G Gaming",    priceUSD: 649 }],
  },
  os: {
    scrappy:     [{ name: "Ubuntu 24.04 LTS (Free)",       specs: "Open Source · Stable", priceUSD: 0   }],
    ultraBudget: [{ name: "Windows 11 Home OEM Key",       specs: "Digital Activation",   priceUSD: 12  }],
    budget:      [{ name: "Windows 11 Home Digital",       specs: "Authentic License",    priceUSD: 20  }],
    mid:         [{ name: "Windows 11 Pro Digital",        specs: "BitLocker · RDP",      priceUSD: 28  }],
    high:        [{ name: "Windows 11 Pro Retail",         specs: "Transferable License", priceUSD: 45  }],
    flagship:    [{ name: "Windows 11 Pro + Office",       specs: "Full Suite Bundle",    priceUSD: 180 }],
  },
};

/* ─── BUDGET ALLOCATION WEIGHTS ─────────────────────── */
/*
  These weights define how the build budget is SPLIT
  across component categories (must sum to ~1.0).
  Gaming prioritises GPU. Workstation prioritises CPU+RAM.
  Creative prioritises GPU+RAM+Storage.
*/
const ALLOCATION_WEIGHTS = {
  gaming: {
    gpu: 0.30, cpu: 0.14, mb: 0.08, ram: 0.07, storage: 0.07,
    psu: 0.07, cooler: 0.04, case_: 0.06,
    monitor: 0.08, keyboard: 0.03, mouse: 0.03, headset: 0.02, networking: 0.01, os: 0.00
  },
  creative: {
    gpu: 0.27, cpu: 0.15, mb: 0.08, ram: 0.09, storage: 0.10,
    psu: 0.06, cooler: 0.04, case_: 0.05,
    monitor: 0.09, keyboard: 0.03, mouse: 0.02, headset: 0.01, networking: 0.01, os: 0.00
  },
  workstation: {
    gpu: 0.20, cpu: 0.20, mb: 0.09, ram: 0.12, storage: 0.10,
    psu: 0.06, cooler: 0.05, case_: 0.04,
    monitor: 0.07, keyboard: 0.03, mouse: 0.02, headset: 0.01, networking: 0.01, os: 0.00
  },
};

/* ─── SMART RECOMMENDATION ENGINE ───────────────────── */
/*
  For each component, we find the best-fit option whose price
  is closest to (but not wildly above) the per-component budget
  derived from the allocation weights. We then present:
    - Eco variant  (-15% on allocated spend)
    - Standard     (at allocated spend)
    - Premium      (+20% on allocated spend)

  This ensures the total budget is respected and no single part
  consumes a disproportionate share.
*/
function buildSmartRecommendations() {
  const totalBudgetUSD = state.budgetUSD;
  const weights = ALLOCATION_WEIGHTS[state.purpose] || ALLOCATION_WEIGHTS.gaming;
  const region   = REGIONS[state.region];
  const raw = {};

  const TIERS = ["scrappy","ultraBudget","budget","mid","high","flagship"];

  Object.keys(COMPONENT_META).forEach(cat => {
    const db = COMPONENT_DB[cat];
    if (!db) return;

    const allocated = totalBudgetUSD * (weights[cat] || 0.04);

    // Pick the best-fitting DB tier for the allocated sub-budget
    let chosenTierName = "scrappy";
    let chosenItem = db["scrappy"][0];

    for (let i = 0; i < TIERS.length; i++) {
      const tierName = TIERS[i];
      if (!db[tierName]) continue;
      const item = db[tierName][0];
      if (item.priceUSD <= allocated * 1.25) {
        chosenTierName = tierName;
        chosenItem = item;
      }
    }

    const basePrice = chosenItem.priceUSD;

    // ECO option: 85% of base (one tier down or same with small discount)
    const ecoPrice  = Math.max(0, basePrice * 0.85);
    const primPrice = basePrice;
    const proPrice  = basePrice * 1.20;

    const mkOption = (item, multiplier, tierLabel, tierClass) => ({
      ...item,
      name:       item.name + (multiplier < 1 ? " (Used/Alt)" : multiplier > 1 ? " +" : ""),
      priceUSD:   item.priceUSD * multiplier,
      priceLocal: Math.round(item.priceUSD * multiplier * region.rate),
      tier:       tierClass,
      tierLabel,
      isUsed:     multiplier < 1,
    });

    raw[cat] = [
      mkOption(chosenItem, 0.82, "Entry",    "budget"),
      mkOption(chosenItem, 1.00, "Standard", "mid"),
      mkOption(chosenItem, 1.22, "Premium",  "high"),
    ];
  });

  state.allOptions = raw;
}

/* ─── HISTORY API NAVIGATION ────────────────────────── */
/*
  We push a state object {screen, budgetLocal, region, purpose}
  to the history every time the visible screen changes.
  popstate restores the correct screen.
*/
function pushHistory(screenName) {
  const data = {
    screen: screenName,
    budgetLocal: state.budgetLocal,
    region: state.region,
    purpose: state.purpose,
  };
  history.pushState(data, "", "#" + screenName);
}

function restoreFromHistory(data) {
  if (!data || !data.screen) return;
  state.region      = data.region      || state.region;
  state.budgetLocal = data.budgetLocal || state.budgetLocal;
  state.purpose     = data.purpose     || state.purpose;

  const region = REGIONS[state.region];
  state.budgetUSD = state.budgetLocal / region.rate;

  showScreen(data.screen, false); // false = don't push again

  // If going back to onboarding, restore form values
  if (data.screen === "onboarding") {
    const rSel = $("region-select"), bInp = $("budget-input");
    if (rSel) rSel.value = state.region;
    if (bInp) bInp.value = state.budgetLocal;
    updateCurrencySymbols();
  } else if (data.screen === "builder") {
    buildSmartRecommendations();
    renderBuilder();
    setTimeout(initScrollReveal, 100);
  }
}

window.addEventListener("popstate", e => {
  restoreFromHistory(e.state);
});

/* ─── SCREEN MANAGEMENT ─────────────────────────────── */
function showScreen(name, push = true) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const map = {
    onboarding: "screen-onboarding",
    loading:    "screen-loading",
    builder:    "screen-builder",
  };
  const el = $(map[name]);
  if (el) el.classList.add("active");
  if (push) pushHistory(name);
}

/* ─── CURRENCY SYMBOL UPDATES ───────────────────────── */
function updateCurrencySymbols() {
  const r = REGIONS[state.region];
  if ($("budget-symbol"))  $("budget-symbol").textContent  = r.symbol;
  if ($("currency-label")) $("currency-label").textContent = r.currency;
  // Update note text for Pakistan
  const noteEl = $("budget-note-text");
  if (noteEl) {
    const examples = {
      PK: "e.g. at ₨150,000 you might get: RTX 3060, i5-12400F, 16GB RAM, 1TB SSD, PSU, Case & Monitor",
      US: "e.g. at $500: RTX 3060, Ryzen 5 5600, 16GB DDR4, 1TB NVMe, B550 MB, Bronze PSU",
      GB: "e.g. at £400: RTX 3060, i5-12400F, 16GB DDR4, 1TB NVMe, B660 MB",
      EU: "e.g. at €450: RTX 3060, Ryzen 5 5600, 16GB RAM, 1TB NVMe",
      IN: "e.g. at ₹40,000: RX 6600 / RTX 3060, Ryzen 5 5600, 16GB DDR4",
    };
    noteEl.textContent = examples[state.region] || "Budget is distributed intelligently across all components.";
  }
}

/* ─── ONBOARDING SETUP ──────────────────────────────── */
function setupOnboarding() {
  const rSel = $("region-select"), bInp = $("budget-input");
  if (!rSel || !bInp) return;

  rSel.onchange = () => {
    state.region = rSel.value;
    updateCurrencySymbols();
  };

  document.querySelectorAll(".purpose-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".purpose-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.purpose = btn.dataset.purpose;
    };
  });

  const startBtn = $("start-btn");
  if (startBtn) {
    startBtn.onclick = e => {
      triggerRipple(startBtn, e);
      state.region      = rSel.value;
      state.budgetLocal = parseFloat(bInp.value) || 0;
      const r = REGIONS[state.region];
      state.budgetUSD   = state.budgetLocal / r.rate;

      if (state.budgetLocal < r.minBudget) {
        showBudgetModal(r.minBudget, r.symbol);
        return;
      }

      showScreen("loading");
      runLoadingSequence();
      setTimeout(() => {
        buildSmartRecommendations();
        renderBuilder();
        showScreen("builder");
        setTimeout(initScrollReveal, 100);
      }, 2800);
    };
  }
}

/* ─── LOADING SEQUENCE ──────────────────────────────── */
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
    if (i > 0 && $(steps[i-1])) {
      $(steps[i-1]).classList.remove("active");
      $(steps[i-1]).classList.add("done");
      $(steps[i-1]).textContent = "✓ " + labels[i-1];
    }
    if (i < steps.length && $(steps[i])) {
      $(steps[i]).classList.add("active");
      $(steps[i]).textContent = labels[i];
      i++;
    } else { clearInterval(iv); }
  }, 600);
}

/* ─── RENDER BUILDER ────────────────────────────────── */
function renderBuilder() {
  const container = $("categories-container");
  if (!container) return;
  container.innerHTML = "";

  const region = REGIONS[state.region];

  // Update topbar labels
  if ($("topbar-budget-label")) {
    $("topbar-budget-label").textContent = region.symbol + " " + fmt(state.budgetLocal) + " " + region.currency;
  }
  if ($("topbar-purpose-label")) {
    const purposeLabels = { gaming: "🎮 Gaming", creative: "🎬 Creative", workstation: "🤖 Workstation" };
    $("topbar-purpose-label").textContent = purposeLabels[state.purpose] || state.purpose;
  }
  if ($("header-budget-display")) {
    $("header-budget-display").textContent = region.symbol + " " + fmt(state.budgetLocal);
  }
  if ($("sidebar-budget-of")) {
    $("sidebar-budget-of").textContent = "of " + region.symbol + " " + fmt(state.budgetLocal);
  }

  Object.keys(state.allOptions).forEach(cat => {
    const meta    = COMPONENT_META[cat];
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
      </div>`;
    container.appendChild(block);
  });

  // Event delegation on container
  container.addEventListener("click", e => {
    const card = e.target.closest(".option-card");
    if (card) {
      triggerRipple(card, e);
      selectComponent(card.dataset.cat, parseInt(card.dataset.idx));
    }
  });

  // Back button
  const backBtn = $("back-btn");
  if (backBtn) {
    backBtn.onclick = () => {
      state.components = {};
      history.back(); // Uses browser history → triggers popstate
    };
  }

  // Save button
  const saveBtn = $("save-btn");
  if (saveBtn) saveBtn.onclick = () => saveBuild();

  updateSummary();
}

/* ─── RENDER OPTION CARD ────────────────────────────── */
function renderOptionCard(cat, opt, idx) {
  const r = REGIONS[state.region];
  const tierClass  = { budget: "tier-budget", mid: "tier-mid", high: "tier-high" }[opt.tier] || "tier-mid";
  const tierLabel  = opt.tierLabel || opt.tier;
  const condClass  = opt.isUsed ? "cond-used" : "cond-new";
  const condLabel  = opt.isUsed ? "♻ Used/Alt" : "✦ New";
  const priceText  = opt.priceUSD === 0 ? "Free" : r.symbol + " " + fmt(opt.priceLocal);

  return `<div class="option-card" data-cat="${cat}" data-idx="${idx}">
    <span class="option-tier ${tierClass}">${tierLabel}</span>
    <div class="option-name">${opt.name}</div>
    <div class="option-specs">${opt.specs}</div>
    <div class="option-footer">
      <span class="option-condition ${condClass}">${condLabel}</span>
      <span class="option-price">${priceText}</span>
    </div>
  </div>`;
}

/* ─── SELECT COMPONENT ──────────────────────────────── */
function selectComponent(cat, idx) {
  const option = state.allOptions[cat]?.[idx];
  if (!option) return;

  state.components[cat] = option;

  $(`grid-${cat}`)?.querySelectorAll(".option-card").forEach((card, i) => {
    card.classList.toggle("selected", i === idx);
  });

  const badge = $(`badge-${cat}`);
  if (badge) {
    badge.textContent = option.name.split(" ").slice(0, 3).join(" ");
    badge.classList.add("visible");
  }

  updateSummary();
}

/* ─── UPDATE SUMMARY / BUDGET BAR ──────────────────── */
function updateSummary() {
  const list = $("summary-list");
  if (!list) return;
  list.innerHTML = "";

  const r = REGIONS[state.region];
  let totalLocal = 0;
  let selected   = 0;

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
      <span class="sum-price">${opt.priceUSD === 0 ? "Free" : r.symbol + " " + fmt(opt.priceLocal)}</span>
    </div>`;
  });

  // Budget bar
  const budgetPct = Math.min((totalLocal / state.budgetLocal) * 100, 100);
  const bar = $("budget-progress-bar");
  if (bar) {
    bar.style.width = budgetPct + "%";
    bar.classList.toggle("over-budget", totalLocal > state.budgetLocal * 1.05);
  }
  if ($("sidebar-total-display")) {
    $("sidebar-total-display").textContent = r.symbol + " " + fmt(totalLocal);
  }
  if ($("sidebar-budget-pct")) {
    $("sidebar-budget-pct").textContent = Math.round(budgetPct) + "%";
  }

  const saveBtn = $("save-btn");
  if (saveBtn) saveBtn.disabled = selected === 0;
}

/* ─── SAVE BUILD (RECEIPT) ──────────────────────────── */
function saveBuild() {
  const r = REGIONS[state.region];
  let totalLocal = 0, itemsHTML = "";

  Object.keys(state.components).forEach(cat => {
    const opt = state.components[cat];
    totalLocal += opt.priceLocal;
    const priceStr = opt.priceUSD === 0 ? "Free" : r.symbol + " " + fmt(opt.priceLocal);
    itemsHTML += `<div class="receipt-row">
      <div class="receipt-row-left">
        <div class="receipt-cat">${COMPONENT_META[cat].label}</div>
        <div class="receipt-name">${opt.name}</div>
      </div>
      <div class="receipt-price">${priceStr}</div>
    </div>`;
  });

  const assemblyFee = Math.round(totalLocal * 0.05);
  const grandTotal  = totalLocal + assemblyFee;

  $("receipt-items").innerHTML = itemsHTML;
  $("receipt-totals").innerHTML = `
    <div class="receipt-total-row"><span>Components Subtotal</span><span>${r.symbol} ${fmt(totalLocal)}</span></div>
    <div class="receipt-total-row"><span>Assembly & Setup Fee (5%)</span><span>${r.symbol} ${fmt(assemblyFee)}</span></div>
    <div class="receipt-total-row grand"><span>TOTAL ESTIMATE</span><span>${r.symbol} ${fmt(grandTotal)}</span></div>`;

  $("receipt-modal")?.classList.remove("hidden");
}

/* ─── MODAL HELPERS ─────────────────────────────────── */
function showBudgetModal(minAmount, symbol) {
  const el = $("modal-min-amount");
  if (el) el.textContent = symbol + " " + Math.round(minAmount).toLocaleString();
  $("budget-modal")?.classList.remove("hidden");
}
function hideBudgetModal() { $("budget-modal")?.classList.add("hidden"); }

/* ─── RIPPLE EFFECT ─────────────────────────────────── */
function triggerRipple(btn, event) {
  const ripple = btn.querySelector(".btn-ripple");
  if (!ripple) return;
  const rect = btn.getBoundingClientRect();
  ripple.style.left = (event.clientX - rect.left) + "px";
  ripple.style.top  = (event.clientY - rect.top)  + "px";
  btn.classList.remove("rippling");
  void btn.offsetWidth; // reflow
  btn.classList.add("rippling");
  btn.addEventListener("animationend", () => btn.classList.remove("rippling"), { once: true });
}

/* ─── CURSOR GLOW ───────────────────────────────────── */
function initCursor() {
  const glow = $("cursor-glow");
  if (!glow) return;
  let mx = 0, my = 0, cx = 0, cy = 0;
  document.addEventListener("mousemove", e => { mx = e.clientX; my = e.clientY; });
  function loop() {
    cx += (mx - cx) * 0.08;
    cy += (my - cy) * 0.08;
    glow.style.left = cx + "px";
    glow.style.top  = cy + "px";
    requestAnimationFrame(loop);
  }
  loop();
}

/* ─── PARTICLES (RED/WHITE THEME) ───────────────────── */
function initParticles() {
  const canvas = $("particle-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;

  window.addEventListener("resize", () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });

  const redDots = Array.from({ length: 30 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    r: Math.random() * 1.5 + 0.4,
    dx: (Math.random() - 0.5) * 0.3,
    dy: (Math.random() - 0.5) * 0.3,
    o: Math.random() * 0.25 + 0.05,
    type: "red",
  }));
  const whiteDots = Array.from({ length: 15 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    r: Math.random() * 0.8 + 0.2,
    dx: (Math.random() - 0.5) * 0.2,
    dy: (Math.random() - 0.5) * 0.2,
    o: Math.random() * 0.12 + 0.03,
    type: "white",
  }));
  const dots = [...redDots, ...whiteDots];

  function frame() {
    ctx.clearRect(0, 0, W, H);
    dots.forEach(d => {
      d.x += d.dx; d.y += d.dy;
      if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
      if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
      const color = d.type === "red" ? `rgba(232,0,26,${d.o})` : `rgba(255,255,255,${d.o})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
    requestAnimationFrame(frame);
  }
  frame();
}

/* ─── FLOATING PC ICONS ─────────────────────────────── */
function initFloatingIcons() {
  const container = $("floating-icons");
  if (!container) return;

  const icons = ["🖥️","💻","⌨️","🖱️","🎮","💾","🔲","📡","⚡","🎧","❄️","🔌","💿"];
  const count  = 14;

  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "float-icon";
    el.textContent = icons[Math.floor(Math.random() * icons.length)];
    const left     = Math.random() * 100;
    const duration = 18 + Math.random() * 24; // 18–42s
    const delay    = -(Math.random() * duration); // stagger start
    const size     = 1.4 + Math.random() * 1.8;
    el.style.cssText = `
      left: ${left}%;
      font-size: ${size}rem;
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
    `;
    container.appendChild(el);
  }
}

/* ─── SCROLL REVEAL ─────────────────────────────────── */
function initScrollReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("revealed");
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.07 });

  document.querySelectorAll(".category-block").forEach((el, i) => {
    el.style.transitionDelay = (i * 0.04) + "s";
    observer.observe(el);
  });
}

/* ─── INIT ──────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  initCursor();
  initParticles();
  initFloatingIcons();
  setupOnboarding();

  // Initial history entry
  history.replaceState({ screen: "onboarding" }, "", "#onboarding");

  // Modal handlers
  $("modal-close-btn")?.addEventListener("click", hideBudgetModal);
  $("budget-modal")?.addEventListener("click", e => {
    if (e.target === $("budget-modal")) hideBudgetModal();
  });
  $("receipt-close-btn")?.addEventListener("click", () => {
    $("receipt-modal")?.classList.add("hidden");
  });
  $("receipt-modal")?.addEventListener("click", e => {
    if (e.target === $("receipt-modal")) $("receipt-modal").classList.add("hidden");
  });

  // Handle direct page loads with hash
  const hash = location.hash.replace("#", "");
  if (hash === "builder") {
    // Can't restore builder from a cold load without state — go to onboarding
    showScreen("onboarding", false);
  }
});