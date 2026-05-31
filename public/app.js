/* =============================================
   FORGE — AI PC Builder  v3.0
   Full animations, receipt, budget guard
   ============================================= */

// ── REGION CONFIG ──────────────────────────────
const REGIONS = {
  PK: { currency: "PKR", symbol: "₨",  rate: 278.5, minBudget: 27850 },
  US: { currency: "USD", symbol: "$",  rate: 1.0,   minBudget: 100   },
  GB: { currency: "GBP", symbol: "£",  rate: 0.79,  minBudget: 79    },
  EU: { currency: "EUR", symbol: "€",  rate: 0.92,  minBudget: 92    },
  IN: { currency: "INR", symbol: "₹",  rate: 83.5,  minBudget: 8350  },
  CA: { currency: "CAD", symbol: "C$", rate: 1.36,  minBudget: 136   },
  AU: { currency: "AUD", symbol: "A$", rate: 1.52,  minBudget: 152   },
};

const COMPONENT_META = {
  cpu:       { icon: "🔲", label: "Processor (CPU)"        },
  gpu:       { icon: "🎮", label: "Graphics Card (GPU)"     },
  mb:        { icon: "🔌", label: "Motherboard"              },
  ram:       { icon: "💾", label: "Memory (RAM)"             },
  storage:   { icon: "💿", label: "Storage (SSD/HDD)"       },
  psu:       { icon: "⚡", label: "Power Supply (PSU)"      },
  cooler:    { icon: "❄️", label: "CPU Cooler"              },
  case:      { icon: "🖥️", label: "PC Case"                 },
  monitor:   { icon: "🖵",  label: "Monitor"                 },
  keyboard:  { icon: "⌨️", label: "Keyboard"                },
  mouse:     { icon: "🖱️", label: "Mouse"                   },
  headset:   { icon: "🎧", label: "Headset / Audio"         },
  networking:{ icon: "📡", label: "Networking (WiFi/Router)" },
  os:        { icon: "💻", label: "Operating System"        },
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
      if (d.x < 0) d.x = W;
      if (d.x > W) d.x = 0;
      if (d.y < 0) d.y = H;
      if (d.y > H) d.y = 0;

      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212,240,74,${d.o})`;
      ctx.fill();
    });

    // connect nearby dots
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
  const steps = ["ls1","ls2","ls3","ls4"];
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
//  COMPONENT FETCH (no API — smart static)
// ══════════════════════════════════════════════
async function fetchComponents() {
  await new Promise(res => setTimeout(res, 3800));
  buildSmartRecommendations();
  renderBuilder();
  showScreen("builder");
  setTimeout(initScrollReveal, 100);
}

// ══════════════════════════════════════════════
//  MASTER COMPONENT DATABASE  (v4 — Flagship + Peripherals)
// ══════════════════════════════════════════════
const COMPONENT_DB = {

  /* ─── CPU ─── */
  cpu: {
    ultraBudget: [
      { name: "Intel Core i3-10100F",   specs: "4c/8t · 3.6–4.3GHz · 6MB · LGA1200",   condition: "used", priceUSD: 45,  brand: "Intel" },
      { name: "AMD Ryzen 3 3300X",      specs: "4c/8t · 3.8–4.3GHz · 16MB · AM4",       condition: "used", priceUSD: 55,  brand: "AMD"   },
    ],
    budget: [
      { name: "Intel Core i3-12100F",   specs: "4c/8t · 3.3–4.3GHz · 12MB · LGA1700",  condition: "used", priceUSD: 72,  brand: "Intel" },
      { name: "AMD Ryzen 5 3600",       specs: "6c/12t · 3.6–4.2GHz · 32MB · AM4",      condition: "used", priceUSD: 80,  brand: "AMD"   },
    ],
    mid: [
      { name: "AMD Ryzen 5 5600X",      specs: "6c/12t · 3.7–4.6GHz · 35MB · AM4",      condition: "new",  priceUSD: 130, brand: "AMD"   },
      { name: "Intel Core i5-13600K",   specs: "14c/20t · 3.5–5.1GHz · 24MB · LGA1700", condition: "new",  priceUSD: 250, brand: "Intel" },
      { name: "AMD Ryzen 7 7700X",      specs: "8c/16t · 4.5–5.4GHz · 40MB · AM5",      condition: "new",  priceUSD: 280, brand: "AMD"   },
    ],
    high: [
      { name: "AMD Ryzen 7 7800X3D",    specs: "8c/16t · 4.5–5.0GHz · 96MB 3D V-Cache · AM5 · #1 gaming CPU", condition: "new", priceUSD: 370, brand: "AMD"   },
      { name: "Intel Core i9-14900KS",  specs: "24c/32t · 3.2–6.2GHz · 36MB · LGA1700 · Special Edition",     condition: "new", priceUSD: 499, brand: "Intel" },
      { name: "AMD Ryzen 9 9950X",      specs: "16c/32t · 4.3–5.7GHz · 80MB · AM5 · Zen 5 flagship",          condition: "new", priceUSD: 649, brand: "AMD"   },
    ],
    flagship: [
      { name: "AMD Ryzen 9 9950X3D",    specs: "16c/32t · 5.7GHz boost · 128MB 3D V-Cache · AM5 · Ultimate gaming + workstation", condition: "new", priceUSD: 850,  brand: "AMD"   },
      { name: "Intel Core i9-14900KS",  specs: "24c/32t · 6.2GHz boost · 36MB · LGA1700 · Extreme Edition",                      condition: "new", priceUSD: 499,  brand: "Intel" },
      { name: "AMD Threadripper PRO 7985WX", specs: "64c/128t · 5.1GHz · 256MB · sWRX90 · Content-creator beast",               condition: "new", priceUSD: 2499, brand: "AMD"   },
    ],
  },

  /* ─── GPU ─── */
  gpu: {
    ultraBudget: [
      { name: "NVIDIA GTX 1060 6GB",    specs: "6GB GDDR5 · 1280 CUDA · 1080p capable",   condition: "used", priceUSD: 65,  brand: "NVIDIA" },
      { name: "AMD RX 580 8GB",         specs: "8GB GDDR5 · 2304 shaders · 1080p solid",  condition: "used", priceUSD: 75,  brand: "AMD"    },
    ],
    budget: [
      { name: "NVIDIA RTX 3060 12GB",   specs: "12GB GDDR6 · 3584 CUDA · DLSS 2 · 1080p/1440p",    condition: "used", priceUSD: 200, brand: "NVIDIA" },
      { name: "AMD RX 7600 8GB",        specs: "8GB GDDR6 · 2048 shaders · PCIe 4.0 · 1080p/1440p", condition: "new",  priceUSD: 240, brand: "AMD"    },
    ],
    mid: [
      { name: "NVIDIA RTX 4070 12GB",   specs: "12GB GDDR6X · 5888 CUDA · DLSS 3 · Frame Gen · 1440p king",  condition: "new", priceUSD: 550, brand: "NVIDIA" },
      { name: "AMD Radeon RX 7900 XT",  specs: "20GB GDDR6 · 5376 shaders · PCIe 4.0 · strong 4K",          condition: "new", priceUSD: 650, brand: "AMD"    },
      { name: "NVIDIA RTX 4070 Ti Super",specs: "16GB GDDR6X · 8448 CUDA · DLSS 3.5 · 4K capable",          condition: "new", priceUSD: 780, brand: "NVIDIA" },
    ],
    high: [
      { name: "NVIDIA RTX 4080 Super",  specs: "16GB GDDR6X · 10240 CUDA · DLSS 3.5 · 4K ultra high",      condition: "new", priceUSD: 999,  brand: "NVIDIA" },
      { name: "AMD Radeon RX 7900 XTX", specs: "24GB GDDR6 · 6144 shaders · 4K ultra · excellent rasterization", condition: "new", priceUSD: 950, brand: "AMD" },
      { name: "NVIDIA RTX 4090 24GB",   specs: "24GB GDDR6X · 16384 CUDA · DLSS 3.5 · absolute 4K beast",  condition: "new", priceUSD: 1599, brand: "NVIDIA" },
    ],
    flagship: [
      { name: "NVIDIA GeForce RTX 5090", specs: "32GB GDDR7 · 21760 CUDA · DLSS 4 · Multi Frame Gen · 8K ready · Blackwell flagship", condition: "new", priceUSD: 1999, brand: "NVIDIA" },
      { name: "NVIDIA GeForce RTX 5080", specs: "16GB GDDR7 · 10752 CUDA · DLSS 4 · Multi Frame Gen · 4K ultra premium",               condition: "new", priceUSD: 1199, brand: "NVIDIA" },
      { name: "AMD Radeon RX 9070 XT",   specs: "16GB GDDR6 · RDNA 4 · AI supersampling · 4K + ray tracing competitive",               condition: "new", priceUSD: 699,  brand: "AMD"    },
    ],
  },

  /* ─── MOTHERBOARD ─── */
  mb: {
    ultraBudget: [
      { name: "MSI H510M-A Pro",        specs: "LGA1200 · H510 · DDR4 · M.2 · Micro-ATX",           condition: "new", priceUSD: 60,  brand: "MSI"      },
      { name: "Gigabyte A520M S2H",     specs: "AM4 · A520 · DDR4 · M.2 · Micro-ATX",                condition: "new", priceUSD: 65,  brand: "Gigabyte"  },
    ],
    budget: [
      { name: "MSI Pro H610M-G",        specs: "LGA1700 · H610 · DDR4 · M.2 · Micro-ATX",           condition: "new", priceUSD: 72,  brand: "MSI"      },
      { name: "ASRock B550M Pro4",      specs: "AM4 · B550 · DDR4 · dual M.2 · Micro-ATX",           condition: "new", priceUSD: 85,  brand: "ASRock"   },
    ],
    mid: [
      { name: "ASUS TUF Gaming B650-Plus Wi-Fi", specs: "AM5 · B650 · DDR5 · M.2×4 · Wi-Fi 6 · USB-C",     condition: "new", priceUSD: 175, brand: "ASUS"     },
      { name: "MSI MAG X670E Tomahawk", specs: "AM5 · X670E · DDR5 · M.2×4 · PCIe 5.0 · Wi-Fi 6E",  condition: "new", priceUSD: 260, brand: "MSI"      },
      { name: "Gigabyte Z790 Aorus Elite",specs: "LGA1700 · Z790 · DDR5 · M.2×5 · USB4 · Wi-Fi 6E", condition: "new", priceUSD: 280, brand: "Gigabyte"  },
    ],
    high: [
      { name: "ASUS ROG Crosshair X670E Hero", specs: "AM5 · X670E · DDR5 · M.2×5 · PCIe 5.0 · Wi-Fi 6E · 2.5G LAN", condition: "new", priceUSD: 420, brand: "ASUS" },
      { name: "MSI MEG Z790 Godlike",   specs: "LGA1700 · Z790 · DDR5 · M.2×6 · PCIe 5.0 · 10G LAN · Thunderbolt 4",  condition: "new", priceUSD: 650, brand: "MSI"  },
      { name: "ASUS ROG Maximus Z790 Apex Encore", specs: "LGA1700 · Z790 · DDR5 OC board · PCIe 5.0 · extreme OC",    condition: "new", priceUSD: 800, brand: "ASUS" },
    ],
    flagship: [
      { name: "ASUS ROG Crosshair X870E Hero", specs: "AM5 · X870E · DDR5 · M.2×5 · PCIe 5.0 · Wi-Fi 7 · Thunderbolt 4 · 2025 flagship", condition: "new", priceUSD: 550,  brand: "ASUS" },
      { name: "MSI MEG X870E Godlike",  specs: "AM5 · X870E · DDR5 · M.2×6 · PCIe 5.0 · 10G LAN · Wi-Fi 7 · premium flagship",            condition: "new", priceUSD: 750,  brand: "MSI"  },
      { name: "ASUS Pro WS TRX50-SAGE WiFi", specs: "sWRX90 · TRX50 · DDR5 · 7× PCIe 5.0 x16 · Threadripper Pro workstation",             condition: "new", priceUSD: 1200, brand: "ASUS" },
    ],
  },

  /* ─── RAM ─── */
  ram: {
    ultraBudget: [
      { name: "Kingston 16GB DDR4-2400", specs: "2×8GB · DDR4-2400 · CL17",    condition: "used", priceUSD: 28,  brand: "Kingston" },
      { name: "Corsair Vengeance 8GB DDR4", specs: "1×8GB · DDR4-3200 · CL16", condition: "new",  priceUSD: 22,  brand: "Corsair"  },
    ],
    budget: [
      { name: "G.Skill Aegis 16GB DDR4",      specs: "2×8GB · DDR4-3200 · CL16 · XMP 2.0",  condition: "new", priceUSD: 35,  brand: "G.Skill" },
      { name: "Corsair Vengeance 16GB DDR4",   specs: "2×8GB · DDR4-3600 · CL18 · XMP 2.0",  condition: "new", priceUSD: 38,  brand: "Corsair" },
    ],
    mid: [
      { name: "G.Skill Ripjaws V 32GB DDR4",   specs: "2×16GB · DDR4-3600 · CL18 · XMP 2.0",      condition: "new", priceUSD: 75,  brand: "G.Skill" },
      { name: "Corsair Vengeance 32GB DDR5",    specs: "2×16GB · DDR5-5200 · CL38 · XMP 3.0",      condition: "new", priceUSD: 90,  brand: "Corsair" },
      { name: "G.Skill Trident Z5 32GB DDR5",  specs: "2×16GB · DDR5-6000 · CL30 · RGB · XMP 3.0", condition: "new", priceUSD: 120, brand: "G.Skill" },
    ],
    high: [
      { name: "G.Skill Trident Z5 64GB DDR5",        specs: "2×32GB · DDR5-6000 · CL30 · RGB · XMP 3.0", condition: "new", priceUSD: 190, brand: "G.Skill" },
      { name: "Corsair Dominator Titanium 64GB DDR5", specs: "2×32GB · DDR5-6400 · CL32 · RGB · XMP 3.0", condition: "new", priceUSD: 230, brand: "Corsair" },
    ],
    flagship: [
      { name: "G.Skill Trident Z5 RGB 96GB DDR5",    specs: "2×48GB · DDR5-6400 · CL32 · RGB · max capacity gaming", condition: "new", priceUSD: 380,  brand: "G.Skill" },
      { name: "Corsair Dominator Titanium 128GB DDR5",specs: "4×32GB · DDR5-6000 · CL30 · RGB · workstation grade",   condition: "new", priceUSD: 550,  brand: "Corsair" },
      { name: "G.Skill Zeta R5 192GB DDR5 ECC",      specs: "4×48GB · DDR5-6400 · ECC · Threadripper Pro workstation", condition: "new", priceUSD: 1200, brand: "G.Skill" },
    ],
  },

  /* ─── STORAGE ─── */
  storage: {
    ultraBudget: [
      { name: "Kingston A400 480GB SSD", specs: "SATA 2.5\" · 500/450 MB/s · TLC",   condition: "new", priceUSD: 32, brand: "Kingston" },
      { name: "WD Blue 1TB HDD",         specs: "SATA · 7200 RPM · 64MB cache · 3.5\"", condition: "new", priceUSD: 38, brand: "WD" },
    ],
    budget: [
      { name: "WD Blue SN580 1TB NVMe",   specs: "PCIe 4.0 · 4150/4150 MB/s · M.2 2280", condition: "new", priceUSD: 60,  brand: "WD"       },
      { name: "Kingston NV3 2TB NVMe",    specs: "PCIe 4.0 · 3500/2800 MB/s · M.2 2280", condition: "new", priceUSD: 80,  brand: "Kingston"  },
    ],
    mid: [
      { name: "Samsung 990 Pro 2TB",      specs: "PCIe 4.0 · 7450/6900 MB/s · V-NAND MLC",     condition: "new", priceUSD: 160, brand: "Samsung" },
      { name: "Seagate FireCuda 530 2TB", specs: "PCIe 4.0 · 7300/6900 MB/s · heatsink edition", condition: "new", priceUSD: 190, brand: "Seagate" },
      { name: "WD Black SN850X 2TB",      specs: "PCIe 4.0 · 7300/6600 MB/s · PS5 compatible",  condition: "new", priceUSD: 175, brand: "WD"      },
    ],
    high: [
      { name: "WD Black SN850X 4TB",         specs: "PCIe 4.0 · 7300/6600 MB/s · 4TB",          condition: "new", priceUSD: 280, brand: "WD"      },
      { name: "Seagate FireCuda 530 4TB",     specs: "PCIe 4.0 · 7300/6900 MB/s · 4TB · TLC",   condition: "new", priceUSD: 320, brand: "Seagate" },
    ],
    flagship: [
      { name: "Samsung 990 Pro 4TB + WD Black SN850X 4TB", specs: "PCIe 4.0 · 8TB total NVMe · dual drive config · 7450 MB/s peak", condition: "new", priceUSD: 560, brand: "Samsung/WD" },
      { name: "Crucial T705 2TB PCIe 5.0",  specs: "PCIe 5.0 · 14,500/12,700 MB/s · Gen 5 speed demon · fastest consumer SSD",    condition: "new", priceUSD: 280, brand: "Crucial" },
      { name: "Samsung 990 EVO Plus 4TB",    specs: "PCIe 5.0×2 · 7,250/6,300 MB/s · 4TB flagship endurance",                     condition: "new", priceUSD: 380, brand: "Samsung" },
    ],
  },

  /* ─── PSU ─── */
  psu: {
    ultraBudget: [
      { name: "Corsair CV550 550W",        specs: "80+ Bronze · non-modular · ATX · 120mm",   condition: "new", priceUSD: 48,  brand: "Corsair"  },
      { name: "Seasonic S12III 550W",      specs: "80+ Bronze · semi-modular · quiet",         condition: "new", priceUSD: 55,  brand: "Seasonic" },
    ],
    budget: [
      { name: "Seasonic Focus GX 650W",    specs: "80+ Gold · fully modular · 120mm FDB",      condition: "new", priceUSD: 80,  brand: "Seasonic" },
      { name: "Corsair RM650x 650W",       specs: "80+ Gold · fully modular · zero-RPM mode",  condition: "new", priceUSD: 90,  brand: "Corsair"  },
    ],
    mid: [
      { name: "Corsair RM850x 850W",                specs: "80+ Gold · fully modular · zero-RPM",     condition: "new", priceUSD: 120, brand: "Corsair"   },
      { name: "Seasonic Focus GX 850W",              specs: "80+ Gold · fully modular · 120mm FDB",    condition: "new", priceUSD: 125, brand: "Seasonic"  },
      { name: "be quiet! Straight Power 12 850W",    specs: "80+ Platinum · fully modular · silent",   condition: "new", priceUSD: 155, brand: "be quiet!" },
    ],
    high: [
      { name: "Corsair HX1000 1000W",      specs: "80+ Platinum · modular · ATX 3.0 · PCIe 5.0",          condition: "new", priceUSD: 180, brand: "Corsair"   },
      { name: "be quiet! Dark Power 13 1000W", specs: "80+ Titanium · modular · ATX 3.0 · PCIe 5.0",       condition: "new", priceUSD: 220, brand: "be quiet!" },
    ],
    flagship: [
      { name: "Corsair HX1500i 1500W",     specs: "80+ Platinum · modular · ATX 3.0 · PCIe 5.0 · iCUE · RTX 5090 ready", condition: "new", priceUSD: 330, brand: "Corsair"   },
      { name: "be quiet! Dark Power Pro 13 1600W", specs: "80+ Titanium · modular · dual EPS · PCIe 5.0 · server-grade",  condition: "new", priceUSD: 420, brand: "be quiet!" },
      { name: "Seasonic PRIME TX-1300 1300W", specs: "80+ Titanium · ultra-premium · 135mm FDB · 12-year warranty",        condition: "new", priceUSD: 360, brand: "Seasonic"  },
    ],
  },

  /* ─── COOLER ─── */
  cooler: {
    ultraBudget: [
      { name: "AMD Wraith Stealth (Stock)", specs: "Air · 65W TDP · bundled with Ryzen · silent", condition: "new", priceUSD: 0,  brand: "AMD"          },
      { name: "Cooler Master Hyper 212",    specs: "Air · 120mm PWM · 150W TDP",                  condition: "new", priceUSD: 35, brand: "Cooler Master" },
    ],
    budget: [
      { name: "be quiet! Pure Rock 2",     specs: "Air · 120mm fan · 150W TDP · silent",          condition: "new", priceUSD: 40, brand: "be quiet!" },
      { name: "Noctua NH-U12S",            specs: "Air · 120mm NF-F12 · 158W TDP · ultra-quiet",  condition: "new", priceUSD: 60, brand: "Noctua"    },
    ],
    mid: [
      { name: "Noctua NH-D15",             specs: "Dual-tower air · 2×140mm · 250W TDP · GOAT",   condition: "new", priceUSD: 100, brand: "Noctua"    },
      { name: "Arctic Liquid Freezer III 240", specs: "240mm AIO · 2×120mm P12 · LGA1700 & AM5",  condition: "new", priceUSD: 85,  brand: "Arctic"    },
      { name: "Corsair iCUE H100i RGB",    specs: "240mm AIO · 2×120mm fans · ARGB · iCUE",       condition: "new", priceUSD: 120, brand: "Corsair"   },
    ],
    high: [
      { name: "Arctic Liquid Freezer III 360",   specs: "360mm AIO · 3×120mm P12 · high perf",           condition: "new", priceUSD: 130, brand: "Arctic"  },
      { name: "Corsair iCUE H150i Elite LCD",    specs: "360mm AIO · LCD pump head · ARGB · iCUE",        condition: "new", priceUSD: 200, brand: "Corsair" },
      { name: "NZXT Kraken Elite 360 RGB",       specs: "360mm AIO · LCD display · ARGB fans · AM5/1700", condition: "new", priceUSD: 230, brand: "NZXT"    },
    ],
    flagship: [
      { name: "Corsair iCUE LINK H170i LCD",     specs: "420mm AIO · iCUE LINK · 3×140mm ARGB · LCD head · RTX 5090 capable",    condition: "new", priceUSD: 300, brand: "Corsair"  },
      { name: "EKWB EK-AIO Elite 360 D-RGB",     specs: "360mm AIO · D-RGB pump · 3×120mm · premium copper cold plate",           condition: "new", priceUSD: 270, brand: "EKWB"     },
      { name: "Custom Loop: EKWB Quantum Kit",   specs: "Full custom water-loop · 360mm rad · CPU+GPU blocks · distro plate · RGB",condition: "new", priceUSD: 650, brand: "EKWB"     },
    ],
  },

  /* ─── CASE ─── */
  case: {
    ultraBudget: [
      { name: "Deepcool Matrexx 30",        specs: "Micro-ATX · TG side · USB 3.0",             condition: "new", priceUSD: 35,  brand: "Deepcool" },
      { name: "Fractal Design Core 1000",   specs: "Micro-ATX · 2 fans · USB 3.0 · tool-free",  condition: "new", priceUSD: 40,  brand: "Fractal"   },
    ],
    budget: [
      { name: "Corsair 4000D Airflow",      specs: "Mid-Tower · ATX · mesh front · USB-C · 2×120mm", condition: "new", priceUSD: 80,  brand: "Corsair"  },
      { name: "Lian Li Lancool 205",        specs: "Mid-Tower · ATX · 2×120mm · mesh front · USB 3.0", condition: "new", priceUSD: 70, brand: "Lian Li"  },
    ],
    mid: [
      { name: "Lian Li Lancool 216 RGB",    specs: "Mid-Tower · ATX · 2×160mm front · ARGB · USB-C",  condition: "new", priceUSD: 100, brand: "Lian Li"   },
      { name: "Fractal Design North XL",    specs: "Full Tower · ATX · wood + mesh · 2×180mm + 2×140mm", condition: "new", priceUSD: 150, brand: "Fractal" },
      { name: "be quiet! Dark Base 701",    specs: "Mid-Tower · ATX · ARGB · USB-C · modular layout",  condition: "new", priceUSD: 160, brand: "be quiet!" },
    ],
    high: [
      { name: "Lian Li O11 Dynamic EVO XL", specs: "Full Tower · E-ATX · dual chamber · USB-C · 9-fan support", condition: "new", priceUSD: 200, brand: "Lian Li"  },
      { name: "Fractal Design Torrent XL",  specs: "Full Tower · ATX · 180+180mm front · ultra airflow",          condition: "new", priceUSD: 210, brand: "Fractal"  },
      { name: "Corsair 7000D Airflow",      specs: "Full Tower · E-ATX · triple 140mm front · USB-C",             condition: "new", priceUSD: 220, brand: "Corsair"  },
    ],
    flagship: [
      { name: "Lian Li O11 Vision",         specs: "Mid-Tower · ATX · 4× tempered glass · triple-chamber · magnetic panels · RGB",          condition: "new", priceUSD: 250, brand: "Lian Li"  },
      { name: "Thermaltake Core P8",        specs: "Full Tower · E-ATX · open-frame · vertical or horizontal · extreme modding platform",    condition: "new", priceUSD: 350, brand: "Thermaltake" },
      { name: "HYTE Y70 Touch",             specs: "Mid-Tower · ATX · touch-screen panel · panoramic glass · premium RGB showcase",          condition: "new", priceUSD: 280, brand: "HYTE"     },
    ],
  },

  /* ─── MONITOR ─── */
  monitor: {
    ultraBudget: [
      { name: "AOC 24B2H 24\"",         specs: "23.8\" · 1080p · 75Hz · IPS · HDMI",            condition: "new", priceUSD: 100, brand: "AOC"  },
      { name: "Acer R240HY 24\"",       specs: "23.8\" · 1080p · 75Hz · IPS · HDMI+VGA",         condition: "new", priceUSD: 110, brand: "Acer" },
    ],
    budget: [
      { name: "AOC 24G2SP 24\"",        specs: "23.8\" · 1080p · 165Hz · IPS · 1ms · FreeSync",  condition: "new", priceUSD: 130, brand: "AOC"     },
      { name: "Gigabyte G27F 2 27\"",   specs: "27\" · 1080p · 165Hz · IPS · FreeSync · G-Sync",  condition: "new", priceUSD: 150, brand: "Gigabyte" },
    ],
    mid: [
      { name: "ASUS TUF VG27AQ3A 27\"", specs: "27\" · 1440p · 180Hz · IPS · G-Sync Compat · 1ms", condition: "new", priceUSD: 280, brand: "ASUS"    },
      { name: "LG 27GP850-B 27\"",      specs: "27\" · 1440p · 180Hz · Nano IPS · 1ms · G-Sync",   condition: "new", priceUSD: 300, brand: "LG"      },
      { name: "Samsung Odyssey G5 32\"",specs: "32\" · 1440p · 165Hz · VA curved · FreeSync",       condition: "new", priceUSD: 260, brand: "Samsung" },
    ],
    high: [
      { name: "ASUS ROG Swift PG279QM 27\"",   specs: "27\" · 1440p · 240Hz · IPS · G-Sync · 1ms",      condition: "new", priceUSD: 550,  brand: "ASUS"    },
      { name: "LG UltraGear 32GS95UE 32\"",    specs: "32\" · 4K/240Hz & 1080p/480Hz dual mode · OLED",  condition: "new", priceUSD: 1200, brand: "LG"      },
      { name: "Samsung Odyssey OLED G8 32\"",  specs: "32\" · 4K · 240Hz · QD-OLED · 0.03ms · G-Sync",  condition: "new", priceUSD: 1100, brand: "Samsung" },
    ],
    flagship: [
      { name: "ASUS ROG Swift OLED PG34WCDM 34\"", specs: "34\" · 1440p ultrawide · 240Hz · WOLED · 0.03ms · G-Sync Ultimate · HDR1000",         condition: "new", priceUSD: 900,  brand: "ASUS"    },
      { name: "LG UltraGear OLED 45GR95QE 45\"",   specs: "45\" · 1440p curved ultrawide · 240Hz · QD-OLED · G-Sync · massive immersion",         condition: "new", priceUSD: 1500, brand: "LG"      },
      { name: "Samsung Odyssey Neo G9 57\"",         specs: "57\" · 7680×2160 Dual 4K · 240Hz · Mini-LED · HDR2000 · G-Sync · ultimate screen",   condition: "new", priceUSD: 2000, brand: "Samsung" },
    ],
  },

  /* ─── KEYBOARD ─── */
  keyboard: {
    ultraBudget: [
      { name: "Redragon K552 Kumara",   specs: "TKL · Red switches · RGB backlight · compact", condition: "new", priceUSD: 30, brand: "Redragon" },
      { name: "Logitech K380",           specs: "Compact · Bluetooth · multi-device",          condition: "new", priceUSD: 40, brand: "Logitech" },
    ],
    budget: [
      { name: "Keychron K2 Pro",        specs: "75% · hot-swap · RGB · Gateron switches · Bluetooth+USB", condition: "new", priceUSD: 90,  brand: "Keychron" },
      { name: "SteelSeries Apex 3 TKL", specs: "TKL · membrane · RGB · IP32 splash · gaming",             condition: "new", priceUSD: 55,  brand: "SteelSeries" },
    ],
    mid: [
      { name: "Logitech G915 TKL",      specs: "TKL · GL mechanical · RGB · wireless (Lightspeed) · slim",  condition: "new", priceUSD: 160, brand: "Logitech"    },
      { name: "Corsair K100 Air",        specs: "Full · Cherry MX Ultra Low switches · wireless · RGB",     condition: "new", priceUSD: 200, brand: "Corsair"     },
      { name: "Keychron Q1 Pro",         specs: "75% · QMK/VIA · hot-swap · aluminum · wireless",           condition: "new", priceUSD: 175, brand: "Keychron"    },
    ],
    high: [
      { name: "Razer BlackWidow V4 Pro", specs: "Full · Razer Yellow mechanical · wireless · per-key RGB · rest", condition: "new", priceUSD: 229, brand: "Razer"   },
      { name: "Wooting 60HE+",           specs: "60% · analog Hall-effect switches · rapid trigger · competitive gaming pick", condition: "new", priceUSD: 175, brand: "Wooting" },
    ],
    flagship: [
      { name: "Wooting 80HE",            specs: "75% · Hall-effect · 80-key · rapid trigger 0.1mm · snappy esports + ergonomic",              condition: "new", priceUSD: 195, brand: "Wooting"     },
      { name: "Ducky One 3 SF 65%",      specs: "65% · Cherry MX switches · Double-shot PBT · RGB · premium build quality",                   condition: "new", priceUSD: 130, brand: "Ducky"       },
      { name: "Asus ROG Azoth Extreme",  specs: "75% · ROG NX switches · OLED display · 3-mode connection · CNC aluminum · gasket mount",     condition: "new", priceUSD: 400, brand: "ASUS"        },
    ],
  },

  /* ─── MOUSE ─── */
  mouse: {
    ultraBudget: [
      { name: "Logitech G203 Lightsync", specs: "6 buttons · 8000 DPI · LIGHTSYNC RGB · wired",   condition: "new", priceUSD: 30, brand: "Logitech" },
      { name: "Redragon M602 Griffin",   specs: "7 buttons · 7200 DPI · RGB · wired",              condition: "new", priceUSD: 22, brand: "Redragon" },
    ],
    budget: [
      { name: "Logitech G305",           specs: "6 buttons · 12000 DPI · HERO sensor · wireless · ultra-light", condition: "new", priceUSD: 50,  brand: "Logitech" },
      { name: "Razer Deathadder V3 HyperSpeed", specs: "Wireless · Focus X sensor · 14000 DPI · ergonomic",    condition: "new", priceUSD: 70,  brand: "Razer"    },
    ],
    mid: [
      { name: "Logitech G Pro X Superlight 2", specs: "Wireless · 32000 DPI · HERO sensor · 60g ultra-light · esports",   condition: "new", priceUSD: 160, brand: "Logitech" },
      { name: "Razer DeathAdder V3 Pro",        specs: "Wireless · 30000 DPI · Focus Pro · 63g · 90h battery",             condition: "new", priceUSD: 150, brand: "Razer"    },
      { name: "Pulsar X2H Wireless",            specs: "Wireless · 26000 DPI · PAW3395 · 52g · symmetrical",               condition: "new", priceUSD: 90,  brand: "Pulsar"   },
    ],
    high: [
      { name: "Logitech G Pro X Superlight 2 DEX", specs: "Wireless · 44000 DPI · HERO 2 sensor · 60g · 300h battery · flagship", condition: "new", priceUSD: 180, brand: "Logitech" },
      { name: "Razer Viper V3 Pro",                 specs: "Wireless · 35000 DPI · Focus Pro 35K · HyperSpeed · 82g · esports",    condition: "new", priceUSD: 160, brand: "Razer"    },
    ],
    flagship: [
      { name: "Logitech G Pro X Superlight 2 DEX + G240 XL mousepad", specs: "Wireless flagship combo · 44000 DPI · 60g · glass/cloth pad combo", condition: "new", priceUSD: 220, brand: "Logitech" },
      { name: "Pulsar X2V2 Wireless",       specs: "Wireless · 32000 DPI · PAW3395 · symmetrical · 47g · ultra premium lightweight", condition: "new", priceUSD: 130, brand: "Pulsar"   },
      { name: "Asus ROG Harpe Ace Aim Lab Edition", specs: "Wireless · 36000 DPI · AimPoint Pro · 54g · Aim Lab collaboration",       condition: "new", priceUSD: 149, brand: "ASUS"     },
    ],
  },

  /* ─── HEADSET / AUDIO ─── */
  headset: {
    ultraBudget: [
      { name: "HyperX Cloud Stinger 2",     specs: "Wired · 50mm drivers · 7.1 DTS · adjustable · PC/console", condition: "new", priceUSD: 40, brand: "HyperX" },
      { name: "Corsair HS55 Stereo",         specs: "Wired · 50mm drivers · leatherette cushions · multi-platform", condition: "new", priceUSD: 50, brand: "Corsair" },
    ],
    budget: [
      { name: "SteelSeries Arctis Nova 1",   specs: "Wired · 40mm neodymium · retractable mic · multi-platform",  condition: "new", priceUSD: 60,  brand: "SteelSeries" },
      { name: "HyperX Cloud II Wireless",    specs: "Wireless · 7.1 DTS · 30h battery · USB-C",                   condition: "new", priceUSD: 100, brand: "HyperX"      },
    ],
    mid: [
      { name: "SteelSeries Arctis Nova Pro Wireless", specs: "Wireless · active noise cancel · OLED base · premium build", condition: "new", priceUSD: 250, brand: "SteelSeries" },
      { name: "Logitech G Pro X 2 Lightspeed",         specs: "Wireless · Blue VO!CE mic · LIGHTSPEED · DTS X 2.0",        condition: "new", priceUSD: 200, brand: "Logitech"    },
      { name: "Razer BlackShark V2 Pro 2023",           specs: "Wireless · 50mm titanium drivers · HyperClear mic · 70h",   condition: "new", priceUSD: 180, brand: "Razer"       },
    ],
    high: [
      { name: "Sony WH-1000XM5 + Antlion ModMic",      specs: "Premium ANC headphones + clip-on mic · studio-quality audio",  condition: "new", priceUSD: 420, brand: "Sony+Antlion" },
      { name: "Astro A50 X Gen 5",                      specs: "Wireless · Dolby Atmos · HDMI ARC · 48h battery · pro tier",   condition: "new", priceUSD: 350, brand: "Astro"       },
    ],
    flagship: [
      { name: "SteelSeries Arctis Nova Pro Wireless X", specs: "Multi-system wireless · ANC · OLED base station · premium audio · HiFi mode",   condition: "new", priceUSD: 350, brand: "SteelSeries" },
      { name: "Beyerdynamic MMX 300 PRO Wireless",       specs: "Wireless · audiophile-grade 300Ω drivers · studio reference · gaming + music",  condition: "new", priceUSD: 320, brand: "Beyerdynamic" },
      { name: "Creative SXFI TRIO headset + Sound BlasterX G6 DAC", specs: "Wired · SXFI holographic + external USB DAC/amp · audiophile gaming", condition: "new", priceUSD: 230, brand: "Creative"    },
    ],
  },

  /* ─── NETWORKING ─── */
  networking: {
    ultraBudget: [
      { name: "TP-Link TL-WN725N USB WiFi", specs: "USB · 150Mbps · 2.4GHz · nano adapter · plug-and-play", condition: "new", priceUSD: 8,  brand: "TP-Link" },
      { name: "Ethernet Gigabit cable (5m)", specs: "Cat 6 · 1Gbps · plug directly into router · best latency", condition: "new", priceUSD: 10, brand: "Generic" },
    ],
    budget: [
      { name: "TP-Link Archer T3U Plus WiFi Adapter", specs: "USB · WiFi 5 · AC1300 · 2.4+5GHz dual-band · antenna", condition: "new", priceUSD: 25, brand: "TP-Link" },
      { name: "TP-Link AX5400 Archer AX73 Router",    specs: "WiFi 6 · AX5400 · dual-band · USB 3.0 · 6 antennas",   condition: "new", priceUSD: 120, brand: "TP-Link" },
    ],
    mid: [
      { name: "ASUS PCE-AX58BT WiFi 6 Card",     specs: "PCIe · WiFi 6 · AX3000 · Bluetooth 5.0 · desktop adapter",    condition: "new", priceUSD: 60,  brand: "ASUS"    },
      { name: "TP-Link Deco XE75 Mesh (2-pack)",  specs: "WiFi 6E · AXE5400 · tri-band mesh · 2 nodes · whole home",    condition: "new", priceUSD: 250, brand: "TP-Link" },
      { name: "ASUS RT-AX86U Pro Router",         specs: "WiFi 6 · AX5700 · dual-band · 2.5G LAN · gamer optimized",    condition: "new", priceUSD: 220, brand: "ASUS"    },
    ],
    high: [
      { name: "ASUS ROG Rapture GT-AX11000 Pro",  specs: "WiFi 6 · Tri-band · AX11000 · 2.5G WAN · gamer priority · MU-MIMO", condition: "new", priceUSD: 380, brand: "ASUS"    },
      { name: "Netgear Orbi RBK863S WiFi 6E Mesh",specs: "WiFi 6E · AXE7800 · tri-band · 3-node · 6GHz band · premium mesh",  condition: "new", priceUSD: 600, brand: "Netgear" },
    ],
    flagship: [
      { name: "ASUS ROG Rapture GT-BE98 Pro",      specs: "WiFi 7 · BE25600 · quad-band · 10G WAN+LAN · MLO · ultimate gaming router 2024",   condition: "new", priceUSD: 700,  brand: "ASUS"    },
      { name: "Netgear Orbi 970 WiFi 7 Mesh (2pk)",specs: "WiFi 7 · BE27000 · tri-band · 10G ports · 2-node mesh · flagship home networking", condition: "new", priceUSD: 1300, brand: "Netgear" },
      { name: "ASUS ZenWiFi Pro ET12 + ROG Hyper M.2 Card", specs: "WiFi 6E mesh + M.2 2.5G NIC combo · zero-latency wired+wireless setup",    condition: "new", priceUSD: 350,  brand: "ASUS"    },
    ],
  },

  /* ─── OS ─── */
  os: {
    ultraBudget: [
      { name: "Ubuntu 24.04 LTS",        specs: "Free · open-source · gaming via Proton · full driver support", condition: "new", priceUSD: 0,  brand: "Canonical" },
    ],
    budget: [
      { name: "Windows 11 Home OEM",     specs: "Digital OEM key · lifetime · not transferable",    condition: "new", priceUSD: 20, brand: "Microsoft" },
    ],
    mid: [
      { name: "Windows 11 Pro (Retail)", specs: "Retail key · transferable · BitLocker · RDP",      condition: "new", priceUSD: 40, brand: "Microsoft" },
    ],
    high: [
      { name: "Windows 11 Pro (Retail)", specs: "Retail key · transferable · BitLocker · RDP",      condition: "new", priceUSD: 40, brand: "Microsoft" },
    ],
    flagship: [
      { name: "Windows 11 Pro (Retail)", specs: "Retail key · transferable · BitLocker · RDP",      condition: "new", priceUSD: 40, brand: "Microsoft" },
    ],
  },
};

// ══════════════════════════════════════════════
//  SMART BUDGET-AWARE PICKER  (v4 — flagship tier)
// ══════════════════════════════════════════════
function buildSmartRecommendations() {
  const r = REGIONS[state.region];
  const b = state.budgetUSD;
  const p = state.purpose;

  // Budget tier thresholds (in USD)
  const isUltra    = b < 300;
  const isLow      = b >= 300  && b < 700;
  const isMid      = b >= 700  && b < 1200;
  const isHigh     = b >= 1200 && b < 2500;
  const isFlagship = b >= 2500;            // ← NEW: €2500+ / ~$2700+

  function pick(cat) {
    const db = COMPONENT_DB[cat];
    let o0, o1, o2;

    if (isUltra) {
      o0 = db.ultraBudget?.[0];
      o1 = db.ultraBudget?.[1] || db.budget?.[0];
      o2 = db.budget?.[0]      || db.mid?.[0];
    } else if (isLow) {
      o0 = db.budget?.[0]  || db.ultraBudget?.[1];
      o1 = db.budget?.[1]  || db.budget?.[0];
      o2 = db.mid?.[0];
    } else if (isMid) {
      o0 = db.budget?.[1]  || db.budget?.[0];
      o1 = db.mid?.[0];
      o2 = db.mid?.[2]     || db.high?.[0];
    } else if (isHigh) {
      o0 = db.mid?.[1]     || db.mid?.[0];
      o1 = db.high?.[0];
      o2 = db.high?.[db.high.length - 1];
    } else {
      // FLAGSHIP budget — show flagship tier as top option
      o0 = db.high?.[0];
      o1 = db.high?.[db.high.length - 1] || db.high?.[0];
      o2 = db.flagship?.[0] || db.flagship?.[db.flagship?.length - 1] || db.high?.[db.high.length - 1];
    }

    // Safety fallbacks
    o0 = o0 || db.budget?.[0] || db.mid?.[0] || db.ultraBudget?.[0];
    o1 = o1 || db.mid?.[0]    || db.high?.[0] || o0;
    o2 = o2 || db.high?.[0]   || db.mid?.[0]  || o1;

    return [
      { ...o0, tier: "budget" },
      { ...o1, tier: "mid"    },
      { ...o2, tier: "high"   },
    ];
  }

  const raw = {};
  Object.keys(COMPONENT_META).forEach(cat => {
    if (COMPONENT_DB[cat]) raw[cat] = pick(cat);
  });

  // ── Purpose tweaks ──────────────────────────
  if (p === "gaming") {
    if (isFlagship) {
      // RTX 5090 for flagship gaming
      raw.gpu[2] = { ...(COMPONENT_DB.gpu.flagship?.[0] || COMPONENT_DB.gpu.high[2]), tier: "high" };
      raw.gpu[1] = { ...(COMPONENT_DB.gpu.flagship?.[1] || COMPONENT_DB.gpu.high[1]), tier: "mid"  };
      raw.cpu[2] = { ...(COMPONENT_DB.cpu.flagship?.[0] || COMPONENT_DB.cpu.high[0]), tier: "high" };
      raw.cooler[2] = { ...(COMPONENT_DB.cooler.flagship?.[0] || COMPONENT_DB.cooler.high[2]), tier: "high" };
      raw.monitor[2] = { ...(COMPONENT_DB.monitor.flagship?.[0] || COMPONENT_DB.monitor.high[2]), tier: "high" };
    } else if (isHigh) {
      raw.gpu[1] = { ...(COMPONENT_DB.gpu.high[0]),  tier: "mid"  };
      raw.gpu[2] = { ...(COMPONENT_DB.gpu.high[2]  || COMPONENT_DB.gpu.high[1]), tier: "high" };
    } else if (!isUltra && !isLow) {
      raw.gpu[1] = { ...(COMPONENT_DB.gpu.mid?.[1]  || COMPONENT_DB.gpu.mid[0]),  tier: "mid"  };
      raw.gpu[2] = { ...(COMPONENT_DB.gpu.high?.[0] || COMPONENT_DB.gpu.mid[2]),  tier: "high" };
    }
  }

  if (p === "creative") {
    if (isFlagship) {
      raw.ram[2]     = { ...(COMPONENT_DB.ram.flagship?.[1]     || COMPONENT_DB.ram.high[1]),     tier: "high" };
      raw.storage[2] = { ...(COMPONENT_DB.storage.flagship?.[0] || COMPONENT_DB.storage.high[1]), tier: "high" };
      raw.cpu[2]     = { ...(COMPONENT_DB.cpu.flagship?.[2] || COMPONENT_DB.cpu.high[2]),         tier: "high" };
    } else if (!isUltra) {
      raw.ram[2]     = { ...(COMPONENT_DB.ram.high?.[0]     || COMPONENT_DB.ram.mid[2]),     tier: "high" };
      raw.storage[2] = { ...(COMPONENT_DB.storage.high?.[0] || COMPONENT_DB.storage.mid[2]), tier: "high" };
    }
  }

  if (p === "work") {
    raw.psu[1] = { ...(COMPONENT_DB.psu.mid?.[0] || COMPONENT_DB.psu.budget[1]), tier: "mid" };
  }

  // Flagship PSU bump for RTX 5090 builds
  if (isFlagship && p === "gaming") {
    raw.psu[2] = { ...(COMPONENT_DB.psu.flagship?.[0] || COMPONENT_DB.psu.high[1]), tier: "high" };
  }

  // Attach local prices
  const rr = REGIONS[state.region];
  Object.keys(raw).forEach(cat => {
    raw[cat].forEach(opt => {
      opt.priceLocal = Math.round((opt.priceUSD || 0) * rr.rate);
    });
  });

  state.allOptions      = raw;
  state.totalCategories = Object.keys(raw).length;
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

  Object.keys(COMPONENT_META).forEach((cat, idx) => {
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

  // Click handlers
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
  const isOver    = state.budgetLocal > 0 && opt.priceLocal > state.budgetLocal * 0.35;
  const tierClass = { budget: "tier-budget", mid: "tier-mid", high: "tier-high" }[opt.tier] || "tier-budget";
  const tierLabel = { budget: "Entry", mid: "Mid-Range", high: "Premium" }[opt.tier] || opt.tier;
  const condClass = opt.condition === "new" ? "cond-new" : "cond-used";
  const condLabel = opt.condition === "new" ? "✦ New" : "↻ Used";
  const priceStr  = opt.priceUSD === 0 ? "Free" : r.symbol + " " + formatLocal(opt.priceLocal || Math.round(opt.priceUSD * r.rate));
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

  $("sum-total").textContent     = r.symbol + " " + formatLocal(totalLocal);
  const remEl = $("sum-remaining");
  remEl.textContent  = (remaining >= 0 ? "+" : "-") + r.symbol + " " + formatLocal(Math.abs(remaining));
  remEl.className    = remaining >= 0 ? "val-good" : "val-danger";

  const assemblyFee = Math.round(totalLocal * 0.07);
  $("tip-assembly").innerHTML = `Add approx. <strong>${r.symbol} ${formatLocal(assemblyFee)}</strong> (~7%) for technician assembly. Self-build saves this cost.`;

  const list = $("summary-list");
  list.innerHTML = "";
  Object.keys(COMPONENT_META).forEach(cat => {
    const opt = state.components[cat];
    if (!opt) return;
    const meta     = COMPONENT_META[cat];
    const priceStr = opt.priceUSD === 0 ? "Free" : r.symbol + " " + formatLocal(Math.round((opt.priceUSD || 0) * r.rate));
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
  const r       = REGIONS[state.region];
  const saveBtn = $("save-btn");

  let totalUSD = 0;
  Object.values(state.components).forEach(o => { totalUSD += (o.priceUSD || 0); });
  const totalLocal    = Math.round(totalUSD * r.rate);
  const assemblyFee   = Math.round(totalLocal * 0.07);
  const thermalPaste  = state.region === "PK" ? 750 : Math.round(7 * r.rate);
  const grandTotal    = totalLocal + assemblyFee;

  const buildId = "FORGE-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  const now     = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
  const timeStr = now.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });

  // Save to localStorage
  try {
    const record  = { buildId, savedAt: now.toISOString(), region: state.region, components: state.components, totalLocal };
    const existing = JSON.parse(localStorage.getItem("forge_builds") || "[]");
    existing.push(record);
    localStorage.setItem("forge_builds", JSON.stringify(existing));
  } catch(e) {}

  // Build receipt HTML
  $("receipt-id").textContent   = "Build ID: " + buildId;
  $("receipt-date").textContent = dateStr + " · " + timeStr;

  // Items
  let itemsHTML = "";
  Object.keys(COMPONENT_META).forEach(cat => {
    const opt = state.components[cat];
    if (!opt) return;
    const meta     = COMPONENT_META[cat];
    const priceStr = opt.priceUSD === 0 ? "Free" : r.symbol + " " + formatLocal(Math.round((opt.priceUSD || 0) * r.rate));
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

  // Totals
  $("receipt-totals").innerHTML = `
    <div class="receipt-total-row"><span>Components Subtotal</span><span>${r.symbol} ${formatLocal(totalLocal)}</span></div>
    <div class="receipt-total-row"><span>Assembly Fee (~7%)</span><span>${r.symbol} ${formatLocal(assemblyFee)}</span></div>
    <div class="receipt-total-row"><span>Thermal Paste (est.)</span><span>${r.symbol} ${formatLocal(thermalPaste)}</span></div>
    <div class="receipt-total-row grand"><span>TOTAL ESTIMATE</span><span>${r.symbol} ${formatLocal(grandTotal + thermalPaste)}</span></div>
    <div class="receipt-total-row" style="font-size:0.7rem;color:#888;margin-top:4px">
      <span>Budget</span><span>${r.symbol} ${formatLocal(state.budgetLocal)}</span>
    </div>
  `;

  // Show modal
  $("receipt-modal").classList.remove("hidden");
}

// ══════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════
function formatLocal(n) {
  return Math.round(n).toLocaleString();
}
