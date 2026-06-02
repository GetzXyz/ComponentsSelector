/* =============================================
   FORGE — NEON FORGE PC Builder v5.1
   Futuristic Cyberpunk UI + Smart Recommendations
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
  budgetLocal: 0,           // ← Empty by default
  budgetUSD: 0,
  purpose: "gaming",
  components: {},
  allOptions: {},
  totalCategories: 0,
};

const $ = id => document.getElementById(id);

// ══════════════════════════════════════════════
//  BUDGET TIER + HELPER FUNCTIONS (unchanged)
// ══════════════════════════════════════════════
function getBudgetTier(budgetUSD) {
  if (budgetUSD < 120)  return "scrappy";
  if (budgetUSD < 220)  return "ultraBudget";
  if (budgetUSD < 400)  return "budget";
  if (budgetUSD < 800)  return "mid";
  if (budgetUSD < 1800) return "high";
  return "flagship";
}

// ... (keep all existing functions: getBudgetDistribution, initCursor, initParticles, etc.)

// ══════════════════════════════════════════════
//  CURSOR + PARTICLES (enhanced neon)
// ══════════════════════════════════════════════
function initCursor() {
  const glow = $("cursor-glow");
  document.addEventListener("mousemove", e => {
    glow.style.left = e.clientX + "px";
    glow.style.top  = e.clientY + "px";
  });
}

function initParticles() {
  // ... (your existing particle code - unchanged)
  const canvas = $("particle-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W = canvas.width  = window.innerWidth;
  let H = canvas.height = window.innerHeight;

  window.addEventListener("resize", () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });

  const DOTS = 65;
  const dots = Array.from({ length: DOTS }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.4 + 0.3,
    dx: (Math.random() - 0.5) * 0.3,
    dy: (Math.random() - 0.5) * 0.3,
    o: Math.random() * 0.5 + 0.15,
  }));

  function frame() {
    ctx.clearRect(0, 0, W, H);
    dots.forEach(d => {
      d.x += d.dx; d.y += d.dy;
      if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
      if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;

      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,240,255,${d.o})`;
      ctx.fill();
    });
    requestAnimationFrame(frame);
  }
  frame();
}

// ══════════════════════════════════════════════
//  ONBOARDING + START
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
//  SCREEN + LOADING
// ══════════════════════════════════════════════
function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const map = { 
    onboarding: "screen-onboarding", 
    loading: "screen-loading", 
    builder: "screen-builder" 
  };
  $(map[name]).classList.add("active");
}

function runLoadingSequence() {
  // ... (your existing loading sequence - unchanged)
}

// ══════════════════════════════════════════════
//  FETCH COMPONENTS + RENDER (unchanged core logic)
// ══════════════════════════════════════════════
async function fetchComponents() {
  // ... (keep your full Gemini + fallback logic as provided)
  // (The long prompt and try/catch block you sent remains the same)
  
  // At the end of fetchComponents():
  renderBuilder();
  showScreen("builder");
  setTimeout(initScrollReveal, 100);
}

// ══════════════════════════════════════════════
//  RENDER BUILDER + BACK BUTTON
// ══════════════════════════════════════════════
function renderBuilder() {
  const r = REGIONS[state.region];
  const purposeMap = { gaming: "Gaming", work: "Work", creative: "Creative", general: "General" };

  $("header-purpose").textContent = purposeMap[state.purpose] || "Custom";
  $("header-budget").textContent  = r.symbol + " " + formatLocal(state.budgetLocal);

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

  // Option selection
  document.querySelectorAll(".option-card").forEach(card => {
    card.addEventListener("click", () => {
      selectComponent(card.dataset.cat, parseInt(card.dataset.idx));
    });
  });

  // Back Button - Full Reset
  $("back-btn").onclick = () => {
    state.components = {};
    state.allOptions = {};
    showScreen("onboarding");
  };

  $("save-btn").addEventListener("click", saveBuild);
  updateSummary();
}

// ══════════════════════════════════════════════
//  RECEIPT - Updated Notes
// ══════════════════════════════════════════════
function saveBuild() {
  const r = REGIONS[state.region];
  let totalUSD = 0;
  Object.values(state.components).forEach(o => { totalUSD += (o.priceUSD || 0); });
  const totalLocal   = Math.round(totalUSD * r.rate);
  const assemblyFee  = Math.round(totalLocal * 0.07);

  const buildId = "FORGE-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  const now     = new Date();

  $("receipt-id").textContent   = "Build ID: " + buildId;
  $("receipt-date").textContent = now.toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" }) + " · " + now.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });

  // ... (items HTML generation remains similar)

  $("receipt-totals").innerHTML = `
    <div class="receipt-total-row"><span>Components Subtotal</span><span>${r.symbol} ${formatLocal(totalLocal)}</span></div>
    <div class="receipt-total-row"><span>Technician Assembly (may apply)</span><span>${r.symbol} ${formatLocal(assemblyFee)}</span></div>
    <div class="receipt-total-row grand"><span>ESTIMATED TOTAL</span><span>${r.symbol} ${formatLocal(totalLocal + assemblyFee)}</span></div>
  `;

  $("receipt-modal").classList.remove("hidden");
}

// ══════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════
function formatLocal(n) {
  return Math.round(n).toLocaleString();
}

// Initialize everything
document.addEventListener("DOMContentLoaded", () => {
  initCursor();
  initParticles();
  setupOnboarding();

  // Modal handlers
  $("modal-close-btn").addEventListener("click", () => $("budget-modal").classList.add("hidden"));
  $("budget-modal").addEventListener("click", e => {
    if (e.target === $("budget-modal")) $("budget-modal").classList.add("hidden");
  });
  $("receipt-close-btn").addEventListener("click", () => $("receipt-modal").classList.add("hidden"));
});