/**
 * FORGE — MAIN APPLICATION CONTROLLER v5.0
 *
 * Changes from v4:
 *  - Terms & Privacy consent gate (required before use)
 *  - Gaming Performance section rendering
 *  - Peripheral categories (Keyboard, Mouse, Headphones) rendered separately
 *  - Live-price indicator in results view
 *  - Invoice fully rebuilt — no empty patches, gaming summary included
 *  - Improved error handling & code quality
 */

"use strict";

// ─── CURRENCIES ───────────────────────────────────────────────────────────────

const CURRENCIES = {
  PKR: { symbol: "Rs",   name: "Pakistani Rupee",   rate: 1         },
  USD: { symbol: "$",    name: "US Dollar",          rate: 0.0036    },
  EUR: { symbol: "€",    name: "Euro",               rate: 0.0033    },
  GBP: { symbol: "£",    name: "British Pound",      rate: 0.0028    },
  AED: { symbol: "د.إ", name: "UAE Dirham",          rate: 0.0131    },
  SAR: { symbol: "ر.س", name: "Saudi Riyal",         rate: 0.0134    },
  CAD: { symbol: "C$",   name: "Canadian Dollar",    rate: 0.0049    },
  AUD: { symbol: "A$",   name: "Australian Dollar",  rate: 0.0055    },
};

let activeCurrency = "PKR";

function setActiveCurrency(c) { if (CURRENCIES[c]) activeCurrency = c; }
function getActiveCurrency()  { return activeCurrency; }

function convertFromPKR(pkr) {
  return pkr * (CURRENCIES[activeCurrency]?.rate ?? 1);
}
function convertToPKR(amount) {
  return Math.round(amount / (CURRENCIES[activeCurrency]?.rate ?? 1));
}
function formatPrice(pkr) {
  const c = CURRENCIES[activeCurrency];
  const v = convertFromPKR(pkr);
  return c.symbol + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function formatRaw(v) {
  const c = CURRENCIES[activeCurrency];
  return c.symbol + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── STATE ────────────────────────────────────────────────────────────────────

const STATE = {
  blueprint:   null,    // full AI response
  selections:  {},      // { "CPU": { name, price, condition, cat, icon }, ... }
  budgetPKR:   0,
  purpose:     "gaming",
  assemblyFee: 3500,    // PKR
  livePrices:  false,   // whether live web search was used
  gamePerf:    null,    // gaming_performance object from AI
};

// ─── BOOT ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initParticles();
  setupCursorGlow();
  renderCurrencySelector();
  bindEvents();
  updateBudgetHint();
  checkTermsConsent();
});

// ─── TERMS / PRIVACY GATE ─────────────────────────────────────────────────────

function checkTermsConsent() {
  try {
    const accepted = localStorage.getItem("forge_terms_accepted");
    if (!accepted) showTermsGate();
  } catch {
    showTermsGate();
  }
}

function showTermsGate() {
  // Prevent interaction with the app until consent
  const gate = document.getElementById("termsGate");
  if (gate) {
    gate.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}

function acceptTermsAndContinue() {
  const pp  = document.getElementById("consentPrivacy");
  const toc = document.getElementById("consentTerms");

  if (!pp?.checked || !toc?.checked) {
    const err = document.getElementById("consentError");
    if (err) err.textContent = "Please accept both the Privacy Policy and Terms & Conditions to continue.";
    return;
  }

  try { localStorage.setItem("forge_terms_accepted", "1"); } catch {}

  const gate = document.getElementById("termsGate");
  if (gate) {
    gate.style.opacity  = "0";
    gate.style.transition = "opacity 0.4s ease";
    setTimeout(() => {
      gate.style.display = "none";
      document.body.style.overflow = "";
    }, 400);
  }
}

// ─── CURRENCY SELECTOR ────────────────────────────────────────────────────────

function renderCurrencySelector() {
  const wrapper = document.getElementById("currencySelectorWrapper");
  if (!wrapper) return;

  const select       = document.createElement("select");
  select.id          = "currencySelect";
  select.className   = "currency-select";
  select.setAttribute("aria-label", "Select currency");

  Object.entries(CURRENCIES).forEach(([code, info]) => {
    const opt       = document.createElement("option");
    opt.value       = code;
    opt.textContent = `${info.symbol} ${code}`;
    if (code === "PKR") opt.selected = true;
    select.appendChild(opt);
  });

  select.addEventListener("change", () => {
    setActiveCurrency(select.value);
    const ind = document.getElementById("currencyIndicator");
    if (ind) ind.textContent = select.value;
    updateBudgetHint();
    if (STATE.blueprint) renderResults(STATE.blueprint);
    updateBuildSummary();
  });

  wrapper.appendChild(select);
}

function updateBudgetHint() {
  const hint = document.getElementById("budgetHint");
  const cur  = CURRENCIES[getActiveCurrency()];
  if (hint) {
    const min  = formatRaw(Math.round(30_000  * cur.rate));
    const rec  = formatRaw(Math.round(80_000  * cur.rate));
    hint.textContent = `Minimum: ${min} · Recommended for gaming: ${rec}+`;
  }
}

// ─── EVENT BINDING ────────────────────────────────────────────────────────────

function bindEvents() {
  // Usage radio sync
  document.querySelectorAll('.selectable-card input[type="radio"]').forEach(radio => {
    radio.addEventListener("change", () => {
      document.querySelectorAll(".selectable-card").forEach(c => c.classList.remove("active"));
      radio.closest(".selectable-card")?.classList.add("active");
    });
  });

  // Budget input — clear error on type
  document.getElementById("budgetInput")?.addEventListener("input", () => {
    document.getElementById("budgetError").textContent = "";
    document.querySelector(".budget-input-wrapper")?.classList.remove("error-state");
  });

  // Form submit
  document.getElementById("configForm")?.addEventListener("submit", handleFormSubmit);

  // Back button
  document.getElementById("backToConfigBtn")?.addEventListener("click", () => navigateTo("onboardingView"));

  // Invoice
  document.getElementById("openInvoiceBtn")   ?.addEventListener("click", openInvoice);
  document.getElementById("closeInvoiceBtn")  ?.addEventListener("click", closeInvoice);
  document.getElementById("invoiceModal")     ?.addEventListener("click", e => {
    if (e.target === document.getElementById("invoiceModal")) closeInvoice();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeInvoice(); });

  // Terms gate accept button
  document.getElementById("acceptTermsBtn")?.addEventListener("click", acceptTermsAndContinue);

  // Consent checkbox — clear error on change
  ["consentPrivacy", "consentTerms"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", () => {
      const err = document.getElementById("consentError");
      if (err) err.textContent = "";
    });
  });
}

// ─── FORM SUBMIT ──────────────────────────────────────────────────────────────

async function handleFormSubmit(e) {
  e.preventDefault();

  const rawBudget = parseFloat(document.getElementById("budgetInput").value);
  const cur       = CURRENCIES[getActiveCurrency()];
  const budgetPKR = Math.round(rawBudget / cur.rate);
  const purpose   = document.querySelector('input[name="purpose"]:checked')?.value || "gaming";

  const minInCur = Math.round(30_000 * cur.rate);
  if (!rawBudget || rawBudget < minInCur) {
    showError(`Minimum budget is ${formatRaw(minInCur)}.`);
    document.getElementById("budgetInput").focus();
    return;
  }

  STATE.budgetPKR  = budgetPKR;
  STATE.purpose    = purpose;
  STATE.selections = {};
  STATE.livePrices = false;
  STATE.gamePerf   = null;

  const btn = document.getElementById("submitBtn");
  if (btn) btn.disabled = true;

  navigateTo("loadingView");
  runTerminal();

  try {
    const response = await fetch("/api/gemini", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        budget:       budgetPKR,
        usage:        purpose,
        currency:     getActiveCurrency(),
        preferences:  {},
        action:       "recommend",
        customerName: "",
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.error) throw new Error(data.error);

    STATE.blueprint  = data.result;
    STATE.livePrices = !!data.live_prices;

    // Validate and normalize
    if (!STATE.blueprint?.categories) throw new Error("Invalid response structure");

  } catch (err) {
    console.warn("AI API error — using fallback:", err.message);
    STATE.blueprint  = buildFallback(budgetPKR, purpose);
    STATE.livePrices = false;
  }

  // Cache gaming performance
  STATE.gamePerf = STATE.blueprint?.gaming_performance || null;

  setTimeout(() => {
    renderResults(STATE.blueprint);
    updateBuildSummary();
    navigateTo("resultsView");
    if (btn) btn.disabled = false;
  }, 5500);
}

// ─── API CALL (DIRECT — used by index.html fetchBuildFromGroq if present) ─────

async function contactForgeIntelligenceEngine(budgetPKR, purpose) {
  const response = await fetch("/api/gemini", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      budget:      budgetPKR,
      usage:       purpose,
      currency:    getActiveCurrency(),
      preferences: {},
      action:      "recommend",
    }),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  if (!data.result) throw new Error("Empty response");
  return data.result;
}

// ─── FALLBACK DATA ────────────────────────────────────────────────────────────

function getBudgetTier(pkr) {
  if (pkr <   80_000) return "entry";
  if (pkr <  150_000) return "budget";
  if (pkr <  300_000) return "mid-range";
  if (pkr <  600_000) return "high-end";
  if (pkr < 1_200_000) return "enthusiast";
  return "flagship";
}

/**
 * Builds a full fallback blueprint matching the AI response schema.
 * Used when the API is unavailable.
 */
function buildFallback(budgetPKR, purpose) {
  const tier = getBudgetTier(budgetPKR);

  // ─── Tier data maps ───────────────────────────────────────────────────────
  const TIERS = {
    entry: {
      CPU:         [
        { name: "Intel Core i3-12100F",      price: 22000, condition: "New",  badge: "RECOMMENDED", note: "Strong entry CPU" },
        { name: "AMD Ryzen 3 3300X (Used)",   price: 12000, condition: "Used", badge: "BUDGET PICK",  note: "Good used value" },
        { name: "Intel Pentium G6405",        price: 14000, condition: "New",  badge: "BEST VALUE",   note: "Ultra budget" },
      ],
      GPU:         [
        { name: "NVIDIA GTX 1650 4GB",        price: 30000, condition: "New",  badge: "RECOMMENDED", note: "1080p capable" },
        { name: "AMD RX 580 8GB (Used)",       price: 18000, condition: "Used", badge: "BUDGET PICK",  note: "Great used value" },
        { name: "NVIDIA GTX 1630 4GB",        price: 22000, condition: "New",  badge: "BEST VALUE",   note: "Budget 1080p" },
      ],
      Motherboard: [
        { name: "MSI H610M PRO-E",            price: 14000, condition: "New",  badge: "RECOMMENDED", note: "Solid LGA1700" },
        { name: "Gigabyte B450M DS3H",        price: 10000, condition: "New",  badge: "BUDGET PICK",  note: "AMD AM4" },
        { name: "ASUS PRIME H510M-E",         price: 12000, condition: "New",  badge: "BEST VALUE",   note: "Simple, reliable" },
      ],
      RAM:         [
        { name: "16GB DDR4 3200MHz (2×8GB)",  price:  9500, condition: "New",  badge: "RECOMMENDED", note: "Dual channel" },
        { name: "8GB DDR4 2666MHz",           price:  4500, condition: "New",  badge: "BUDGET PICK",  note: "Minimal" },
        { name: "16GB DDR4 TeamGroup",        price:  8500, condition: "New",  badge: "BEST VALUE",   note: "Good brand" },
      ],
      Storage:     [
        { name: "512GB NVMe M.2 SSD",         price:  7500, condition: "New",  badge: "RECOMMENDED", note: "Fast boot drive" },
        { name: "256GB SATA SSD 2.5in",       price:  4500, condition: "New",  badge: "BUDGET PICK",  note: "Minimal storage" },
        { name: "1TB HDD + 120GB SSD Combo",  price:  6500, condition: "New",  badge: "BEST VALUE",   note: "Hybrid approach" },
      ],
      PSU:         [
        { name: "550W 80+ Bronze Seasonic",   price:  8000, condition: "New",  badge: "RECOMMENDED", note: "Reliable PSU" },
        { name: "500W 80+ Bronze Generic",    price:  5500, condition: "New",  badge: "BUDGET PICK",  note: "Basic power" },
        { name: "450W Corsair CX450",         price:  7000, condition: "New",  badge: "BEST VALUE",   note: "Trusted brand" },
      ],
      Cooling:     [
        { name: "Cooler Master Hyper 212 Black", price: 5000, condition: "New", badge: "RECOMMENDED", note: "Reliable cooler" },
        { name: "Cooler Master Hyper 212 EVO",   price: 4000, condition: "New", badge: "BUDGET PICK",  note: "Classic budget" },
        { name: "Stock / Generic 92mm",          price: 1500, condition: "New", badge: "ULTRA BUDGET", note: "Minimum viable" },
      ],
      Case:        [
        { name: "Deepcool MATREXX 30",        price:  4000, condition: "New",  badge: "RECOMMENDED", note: "Good airflow" },
        { name: "Basic ATX Mid Tower",        price:  2500, condition: "New",  badge: "BUDGET PICK",  note: "Bare minimum" },
        { name: "Antec NX200",               price:  3500, condition: "New",  badge: "BEST VALUE",   note: "Decent airflow" },
      ],
      Monitor:     [
        { name: "22in FHD 75Hz IPS",          price:  9000, condition: "New",  badge: "RECOMMENDED", note: "1080p entry" },
        { name: "19in HD 60Hz TN (Used)",     price:  5500, condition: "Used", badge: "BUDGET PICK",  note: "Functional" },
        { name: "24in FHD 60Hz VA",           price: 10000, condition: "New",  badge: "BEST VALUE",   note: "Larger screen" },
      ],
      Keyboard:    [
        { name: "Redragon K552 Mechanical",   price:  2800, condition: "New",  badge: "RECOMMENDED", note: "Budget mech" },
        { name: "Logitech K120 Wired",        price:  1500, condition: "New",  badge: "BUDGET PICK",  note: "Ultra cheap" },
        { name: "A4Tech Bloody B150N",        price:  2500, condition: "New",  badge: "BEST VALUE",   note: "Entry gaming" },
      ],
      Mouse:       [
        { name: "Logitech G203 Lightsync",    price:  2500, condition: "New",  badge: "RECOMMENDED", note: "Entry gaming" },
        { name: "A4Tech OP-330 Optical",      price:   800, condition: "New",  badge: "BUDGET PICK",  note: "Ultra cheap" },
        { name: "Redragon M711 Cobra",        price:  1800, condition: "New",  badge: "BEST VALUE",   note: "Value pick" },
      ],
      Headphones:  [
        { name: "HyperX Cloud Stinger",       price:  4500, condition: "New",  badge: "RECOMMENDED", note: "Entry gaming" },
        { name: "Redragon H510 Zeus",         price:  2800, condition: "New",  badge: "BUDGET PICK",  note: "Budget option" },
        { name: "Corsair HS35 Stereo",        price:  3500, condition: "New",  badge: "BEST VALUE",   note: "Comfortable" },
      ],
    },

    budget: {
      CPU:         [
        { name: "AMD Ryzen 5 5600X",          price: 32000, condition: "New",  badge: "RECOMMENDED", note: "Top AM4 value" },
        { name: "Intel Core i5-10400F",       price: 20000, condition: "New",  badge: "BUDGET PICK",  note: "Solid 6-core" },
        { name: "AMD Ryzen 5 5500",           price: 25000, condition: "New",  badge: "BEST VALUE",   note: "Budget Zen 3" },
      ],
      GPU:         [
        { name: "NVIDIA RTX 3060 12GB",       price: 62000, condition: "New",  badge: "RECOMMENDED", note: "1080p/1440p king" },
        { name: "AMD RX 6600 (Used)",         price: 38000, condition: "Used", badge: "BUDGET PICK",  note: "Strong 1080p" },
        { name: "NVIDIA GTX 1660 Super",      price: 42000, condition: "New",  badge: "BEST VALUE",   note: "1080p workhorse" },
      ],
      Motherboard: [
        { name: "MSI B550M PRO-VDH",          price: 18000, condition: "New",  badge: "RECOMMENDED", note: "Solid B550" },
        { name: "Gigabyte B450M Gaming",      price: 12000, condition: "New",  badge: "BUDGET PICK",  note: "Entry AM4" },
        { name: "ASUS PRIME B550M-A",         price: 16000, condition: "New",  badge: "BEST VALUE",   note: "Feature-rich" },
      ],
      RAM:         [
        { name: "16GB DDR4 3600MHz Corsair",  price: 12000, condition: "New",  badge: "RECOMMENDED", note: "Speed boost" },
        { name: "16GB DDR4 3200MHz Generic",  price:  9000, condition: "New",  badge: "BUDGET PICK",  note: "Works fine" },
        { name: "32GB DDR4 3200MHz (2×16)",   price: 18000, condition: "New",  badge: "BEST VALUE",   note: "Future proof" },
      ],
      Storage:     [
        { name: "1TB NVMe PCIe 3.0 SSD",     price: 12000, condition: "New",  badge: "RECOMMENDED", note: "Fast & spacious" },
        { name: "512GB NVMe M.2 SSD",         price:  7500, condition: "New",  badge: "BUDGET PICK",  note: "Enough to start" },
        { name: "1TB Samsung 870 EVO SATA",   price: 14000, condition: "New",  badge: "BEST VALUE",   note: "Reliable SATA" },
      ],
      PSU:         [
        { name: "650W 80+ Gold EVGA",         price: 12000, condition: "New",  badge: "RECOMMENDED", note: "Gold efficiency" },
        { name: "550W 80+ Bronze CM",         price:  8000, condition: "New",  badge: "BUDGET PICK",  note: "Good basic PSU" },
        { name: "600W Seasonic 80+ Bronze",   price: 10000, condition: "New",  badge: "BEST VALUE",   note: "Trusted brand" },
      ],
      Cooling:     [
        { name: "DeepCool AK620",             price: 10000, condition: "New",  badge: "RECOMMENDED", note: "Excellent air cooler" },
        { name: "Cooler Master Hyper 212 Black", price: 5000, condition: "New", badge: "BUDGET PICK", note: "Classic cooler" },
        { name: "be quiet! Pure Rock 2",      price:  8000, condition: "New",  badge: "BEST VALUE",   note: "Silent cooling" },
      ],
      Case:        [
        { name: "NZXT H510 Mid Tower",        price:  9000, condition: "New",  badge: "RECOMMENDED", note: "Clean build" },
        { name: "Deepcool MATREXX 55",        price:  6000, condition: "New",  badge: "BUDGET PICK",  note: "Good airflow" },
        { name: "Fractal Focus G",            price:  7500, condition: "New",  badge: "BEST VALUE",   note: "Quiet design" },
      ],
      Monitor:     [
        { name: "24in FHD 144Hz IPS Gaming",  price: 18000, condition: "New",  badge: "RECOMMENDED", note: "144Hz gaming" },
        { name: "24in FHD 75Hz VA Monitor",   price: 12000, condition: "New",  badge: "BUDGET PICK",  note: "Good colors" },
        { name: "27in FHD 144Hz Monitor",     price: 22000, condition: "New",  badge: "BEST VALUE",   note: "Bigger screen" },
      ],
      Keyboard:    [
        { name: "Logitech G213 Prodigy",      price:  6000, condition: "New",  badge: "RECOMMENDED", note: "Gaming membrane" },
        { name: "Redragon K552 Mechanical",   price:  2800, condition: "New",  badge: "BUDGET PICK",  note: "Budget mech" },
        { name: "HyperX Alloy Core",          price:  5500, condition: "New",  badge: "BEST VALUE",   note: "Solid value" },
      ],
      Mouse:       [
        { name: "Logitech G502 HERO",         price:  5000, condition: "New",  badge: "RECOMMENDED", note: "Precise sensor" },
        { name: "Logitech G203 Lightsync",    price:  2500, condition: "New",  badge: "BUDGET PICK",  note: "Lightweight" },
        { name: "SteelSeries Rival 3",        price:  4500, condition: "New",  badge: "BEST VALUE",   note: "Reliable sensor" },
      ],
      Headphones:  [
        { name: "HyperX Cloud Alpha S",       price: 10000, condition: "New",  badge: "RECOMMENDED", note: "Excellent sound" },
        { name: "HyperX Cloud Stinger",       price:  4500, condition: "New",  badge: "BUDGET PICK",  note: "Entry gaming" },
        { name: "Logitech G433",              price:  7000, condition: "New",  badge: "BEST VALUE",   note: "7.1 surround" },
      ],
    },

    "mid-range": {
      CPU:         [
        { name: "AMD Ryzen 7 5800X3D",        price:  68000, condition: "New",  badge: "RECOMMENDED", note: "Best gaming CPU AM4" },
        { name: "Intel Core i5-13600K",       price:  58000, condition: "New",  badge: "BUDGET PICK",  note: "Excellent IPC" },
        { name: "AMD Ryzen 5 7600X",          price:  55000, condition: "New",  badge: "BEST VALUE",   note: "AM5 future-proof" },
      ],
      GPU:         [
        { name: "NVIDIA RTX 4070 12GB",       price: 105000, condition: "New",  badge: "RECOMMENDED", note: "Efficient Ada Lovelace" },
        { name: "NVIDIA RTX 3080 10GB (Used)",price:  90000, condition: "Used", badge: "USED DEAL",    note: "Flagship for less" },
        { name: "AMD RX 6800 XT (Used)",      price:  80000, condition: "Used", badge: "BEST VALUE",   note: "Rasterization beast" },
      ],
      Motherboard: [
        { name: "MSI MAG B550 TOMAHAWK",      price:  28000, condition: "New",  badge: "RECOMMENDED", note: "Top B550" },
        { name: "ASUS ROG STRIX B550-F",      price:  32000, condition: "New",  badge: "PREMIUM",      note: "Feature-rich" },
        { name: "Gigabyte B550 AORUS Elite",  price:  25000, condition: "New",  badge: "BEST VALUE",   note: "Good VRMs" },
      ],
      RAM:         [
        { name: "32GB DDR4 3600MHz Corsair Vengeance", price: 22000, condition: "New", badge: "RECOMMENDED", note: "Gaming sweet spot" },
        { name: "16GB DDR4 3600MHz G.Skill",           price: 12000, condition: "New", badge: "BUDGET PICK",  note: "Adequate for now" },
        { name: "32GB DDR4 3200MHz TeamGroup T-Force",  price: 19000, condition: "New", badge: "BEST VALUE",  note: "Budget 32GB" },
      ],
      Storage:     [
        { name: "1TB Samsung 980 Pro NVMe PCIe 4.0",  price: 18000, condition: "New", badge: "RECOMMENDED", note: "Top-tier speed" },
        { name: "1TB WD Black SN770 NVMe",            price: 14000, condition: "New", badge: "BEST VALUE",   note: "Fast & affordable" },
        { name: "2TB Crucial P3 Plus NVMe",           price: 22000, condition: "New", badge: "SPACIOUS",     note: "Double the space" },
      ],
      PSU:         [
        { name: "750W 80+ Gold Seasonic Focus",  price: 16000, condition: "New", badge: "RECOMMENDED", note: "For RTX 4070" },
        { name: "850W 80+ Gold EVGA SuperNOVA",  price: 19000, condition: "New", badge: "HEADROOM",     note: "Future upgrades" },
        { name: "700W 80+ Bronze Cooler Master", price: 12000, condition: "New", badge: "BUDGET PICK",  note: "Adequate" },
      ],
      Cooling:     [
        { name: "240mm AIO Cooler Master ML240L", price: 14000, condition: "New", badge: "RECOMMENDED", note: "Excellent AIO" },
        { name: "DeepCool AK620",                 price: 10000, condition: "New", badge: "BEST VALUE",   note: "Top air cooler" },
        { name: "NZXT Kraken X53 240mm",          price: 16000, condition: "New", badge: "PREMIUM",      note: "Premium AIO" },
      ],
      Case:        [
        { name: "Lian Li LANCOOL 205 MESH",    price: 12000, condition: "New", badge: "RECOMMENDED", note: "Best airflow" },
        { name: "Fractal Design Meshify C",    price: 14000, condition: "New", badge: "SILENT",       note: "Quiet & cool" },
        { name: "Corsair 4000D Airflow",       price: 13000, condition: "New", badge: "BEST VALUE",   note: "Premium airflow" },
      ],
      Monitor:     [
        { name: "27in QHD 165Hz IPS Monitor", price: 38000, condition: "New", badge: "RECOMMENDED", note: "1440p gaming" },
        { name: "24in FHD 240Hz IPS Monitor", price: 28000, condition: "New", badge: "HIGH REFRESH", note: "Competitive play" },
        { name: "27in QHD 144Hz VA Monitor",  price: 30000, condition: "New", badge: "BEST VALUE",   note: "Great contrast" },
      ],
      Keyboard:    [
        { name: "SteelSeries Apex 3 TKL",     price:  8000, condition: "New", badge: "RECOMMENDED", note: "Quiet switches" },
        { name: "Logitech G213 Prodigy",       price:  6000, condition: "New", badge: "BUDGET PICK",  note: "Gaming membrane" },
        { name: "HyperX Alloy Origins Core",   price:  9500, condition: "New", badge: "BEST VALUE",   note: "Mech tenkeyless" },
      ],
      Mouse:       [
        { name: "Logitech G502 X Plus Wireless", price: 8500, condition: "New", badge: "RECOMMENDED", note: "Feature-rich wireless" },
        { name: "SteelSeries Rival 600",          price: 6000, condition: "New", badge: "BUDGET PICK",  note: "Dual sensor" },
        { name: "Razer Basilisk X HyperSpeed",    price: 5500, condition: "New", badge: "BEST VALUE",   note: "Wireless value" },
      ],
      Headphones:  [
        { name: "SteelSeries Arctis 7P+ Wireless", price: 12000, condition: "New", badge: "RECOMMENDED", note: "Wireless gaming" },
        { name: "HyperX Cloud Alpha S",             price: 10000, condition: "New", badge: "BUDGET PICK",  note: "Wired alternative" },
        { name: "Logitech G733 Wireless",           price: 11000, condition: "New", badge: "BEST VALUE",   note: "Lightweight wireless" },
      ],
    },

    "high-end": {
      CPU:         [
        { name: "AMD Ryzen 9 7900X",           price: 105000, condition: "New", badge: "RECOMMENDED", note: "AM5 powerhouse" },
        { name: "Intel Core i9-13900K",        price: 115000, condition: "New", badge: "INTEL KING",   note: "Top single-thread" },
        { name: "AMD Ryzen 7 7700X",           price:  80000, condition: "New", badge: "BEST VALUE",   note: "8-core AM5" },
      ],
      GPU:         [
        { name: "NVIDIA RTX 4080 Super 16GB",  price: 230000, condition: "New", badge: "RECOMMENDED", note: "4K/1440p champion" },
        { name: "NVIDIA RTX 4080 (Used)",      price: 185000, condition: "Used", badge: "USED DEAL",   note: "Save vs new" },
        { name: "NVIDIA RTX 4070 Ti Super",    price: 165000, condition: "New", badge: "BEST VALUE",   note: "Near 4080 perf" },
      ],
      Motherboard: [
        { name: "ASUS ROG STRIX X670E-F",     price:  55000, condition: "New", badge: "RECOMMENDED", note: "AM5 flagship" },
        { name: "MSI MEG X670E ACE",          price:  65000, condition: "New", badge: "PREMIUM",      note: "OC king" },
        { name: "Gigabyte X670 AORUS Elite",  price:  45000, condition: "New", badge: "BEST VALUE",   note: "Good AM5 value" },
      ],
      RAM:         [
        { name: "32GB DDR5-6000 G.Skill Trident Z5", price: 38000, condition: "New", badge: "RECOMMENDED", note: "DDR5 sweet spot" },
        { name: "64GB DDR5-5600 Kingston Fury",      price: 60000, condition: "New", badge: "WORKSTATION",  note: "Massive capacity" },
        { name: "32GB DDR5-5200 Corsair Dominator",  price: 32000, condition: "New", badge: "BEST VALUE",   note: "Reliable DDR5" },
      ],
      Storage:     [
        { name: "2TB Samsung 990 Pro NVMe PCIe 4.0",  price: 32000, condition: "New", badge: "RECOMMENDED", note: "Flagship SSD" },
        { name: "1TB WD Black SN850X + 2TB HDD",      price: 28000, condition: "New", badge: "COMBO",        note: "Speed + bulk" },
        { name: "4TB Seagate FireCuda 530 PCIe 4.0",  price: 48000, condition: "New", badge: "MASSIVE",      note: "4TB NVMe" },
      ],
      PSU:         [
        { name: "1000W 80+ Platinum Seasonic Prime",  price: 28000, condition: "New", badge: "RECOMMENDED", note: "RTX 4080-ready" },
        { name: "850W 80+ Gold ASUS ROG Thor",        price: 24000, condition: "New", badge: "PREMIUM",      note: "OLED wattage meter" },
        { name: "1000W 80+ Gold EVGA SuperNOVA P6",  price: 22000, condition: "New", badge: "BEST VALUE",   note: "Gold 1kW" },
      ],
      Cooling:     [
        { name: "360mm AIO NZXT Kraken Z73",          price: 28000, condition: "New", badge: "RECOMMENDED", note: "360mm premium" },
        { name: "Noctua NH-D15 Chromax Black",        price: 22000, condition: "New", badge: "AIR KING",     note: "Best air cooler" },
        { name: "Arctic Liquid Freezer II 360",       price: 24000, condition: "New", badge: "BEST VALUE",   note: "Great price/perf" },
      ],
      Case:        [
        { name: "Lian Li PC-O11 Dynamic EVO",  price: 22000, condition: "New", badge: "RECOMMENDED", note: "Showcase build" },
        { name: "Fractal Design Torrent",       price: 25000, condition: "New", badge: "AIRFLOW KING", note: "Best thermals" },
        { name: "NZXT H9 Flow",                price: 20000, condition: "New", badge: "BEST VALUE",   note: "Premium layout" },
      ],
      Monitor:     [
        { name: "27in QHD 240Hz OLED LG UltraGear", price: 85000, condition: "New", badge: "RECOMMENDED", note: "OLED 1440p gaming" },
        { name: "32in 4K 144Hz IPS Monitor",          price: 75000, condition: "New", badge: "4K BEAST",    note: "True 4K gaming" },
        { name: "27in QHD 165Hz Dell S2722DGM",      price: 45000, condition: "New", badge: "BEST VALUE",  note: "Solid 1440p" },
      ],
      Keyboard:    [
        { name: "Corsair K95 RGB Platinum Mechanical", price: 28000, condition: "New", badge: "RECOMMENDED", note: "Premium macro KB" },
        { name: "SteelSeries Apex Pro TKL",            price: 22000, condition: "New", badge: "BEST VALUE",   note: "Adjustable switches" },
        { name: "Razer BlackWidow V4 Pro Wireless",    price: 32000, condition: "New", badge: "PREMIUM",      note: "Wireless flag" },
      ],
      Mouse:       [
        { name: "Logitech G Pro X Superlight 2",       price: 18000, condition: "New", badge: "RECOMMENDED", note: "Pro esports" },
        { name: "Razer DeathAdder V3 HyperSpeed",      price: 15000, condition: "New", badge: "BEST VALUE",   note: "Wireless precision" },
        { name: "Finalmouse Starlight-12 Wireless",    price: 25000, condition: "New", badge: "FEATHERWEIGHT", note: "Ultralight" },
      ],
      Headphones:  [
        { name: "SteelSeries Arctis Nova Pro Wireless", price: 38000, condition: "New", badge: "RECOMMENDED", note: "Premium wireless" },
        { name: "Astro A50 X Wireless",                  price: 45000, condition: "New", badge: "FLAGSHIP",     note: "Console+PC" },
        { name: "HyperX Cloud III Wireless",             price: 18000, condition: "New", badge: "BEST VALUE",   note: "Comfortable wireless" },
      ],
    },

    enthusiast: {
      CPU:         [
        { name: "AMD Ryzen 9 9950X",              price: 170000, condition: "New", badge: "RECOMMENDED", note: "Zen 5 flagship" },
        { name: "Intel Core Ultra 9 285K",        price: 160000, condition: "New", badge: "INTEL FLAG",   note: "Arrow Lake king" },
        { name: "AMD Ryzen 9 7950X3D",            price: 185000, condition: "New", badge: "GAMING+WORK",  note: "3D V-Cache beast" },
      ],
      GPU:         [
        { name: "NVIDIA RTX 5080 16GB",           price: 300000, condition: "New",  badge: "RECOMMENDED", note: "Latest gen Ada" },
        { name: "NVIDIA RTX 4090 24GB",           price: 350000, condition: "New",  badge: "LEGACY KING",  note: "Absolute 4K king" },
        { name: "NVIDIA RTX 4090 24GB (Used)",    price: 290000, condition: "Used", badge: "USED DEAL",    note: "Save vs new 5080" },
      ],
      Motherboard: [
        { name: "ASUS ROG MAXIMUS Z790 APEX",     price:  90000, condition: "New", badge: "RECOMMENDED", note: "Extreme OC" },
        { name: "MSI MEG Z790 GODLIKE",           price: 105000, condition: "New", badge: "PREMIUM",      note: "Flagship board" },
        { name: "Gigabyte Z790 AORUS Master",     price:  75000, condition: "New", badge: "BEST VALUE",   note: "Top Z790" },
      ],
      RAM:         [
        { name: "64GB DDR5-6400 G.Skill Trident Z5 RGB", price: 85000, condition: "New", badge: "RECOMMENDED", note: "High-speed 64GB" },
        { name: "96GB DDR5-5600 Kingston Fury",          price: 120000, condition: "New", badge: "MAXED OUT",    note: "96GB capacity" },
        { name: "32GB DDR5-7200 Corsair Dominator Ti",   price:  55000, condition: "New", badge: "SPEED KING",   note: "Top OC kit" },
      ],
      Storage:     [
        { name: "2TB WD Black SN850X + 4TB HDD",          price:  50000, condition: "New", badge: "RECOMMENDED", note: "Speed + bulk" },
        { name: "4TB Samsung 990 Pro PCIe 4.0",           price:  70000, condition: "New", badge: "ALL NVMe",     note: "Pure NVMe" },
        { name: "2TB Corsair MP700 PCIe 5.0",             price:  55000, condition: "New", badge: "PCIe 5",       note: "Next-gen speed" },
      ],
      PSU:         [
        { name: "1200W 80+ Titanium Seasonic Prime TX", price:  45000, condition: "New", badge: "RECOMMENDED", note: "Titanium eff." },
        { name: "1000W 80+ Platinum ASUS ROG Thor",     price:  38000, condition: "New", badge: "PREMIUM",      note: "OLED display" },
        { name: "1600W 80+ Titanium Corsair AX1600i",   price:  75000, condition: "New", badge: "EXTREME",      note: "Dual-GPU ready" },
      ],
      Cooling:     [
        { name: "420mm AIO EK-AIO Elite 420",        price:  40000, condition: "New", badge: "RECOMMENDED", note: "420mm ultimate" },
        { name: "360mm AIO ASUS ROG Ryujin III",     price:  38000, condition: "New", badge: "PREMIUM",      note: "Integrated fan" },
        { name: "Noctua NH-D15 Chromax Black",       price:  22000, condition: "New", badge: "AIR KING",     note: "Best air cooler" },
      ],
      Case:        [
        { name: "Lian Li PC-O11 Dynamic XL",   price: 35000, condition: "New", badge: "RECOMMENDED", note: "Showcase XL" },
        { name: "Corsair 7000X RGB Full Tower", price: 40000, condition: "New", badge: "FULL TOWER",   note: "Extreme size" },
        { name: "Thermaltake Core P8",          price: 45000, condition: "New", badge: "OPEN FRAME",   note: "Display piece" },
      ],
      Monitor:     [
        { name: "27in 4K 240Hz OLED ASUS ROG Swift",    price: 160000, condition: "New", badge: "RECOMMENDED", note: "4K OLED fastest" },
        { name: "32in 4K 144Hz Mini-LED Gigabyte M32U", price: 100000, condition: "New", badge: "MINI-LED",     note: "Excellent HDR" },
        { name: "49in Ultrawide QHD 240Hz Samsung",     price: 180000, condition: "New", badge: "ULTRAWIDE",    note: "Immersive" },
      ],
      Keyboard:    [
        { name: "Wooting 60HE Analog Hall-Effect",          price: 45000, condition: "New", badge: "RECOMMENDED", note: "Analog precision" },
        { name: "Keychron Q6 Pro Wireless",                 price: 28000, condition: "New", badge: "BEST VALUE",   note: "Premium gasket" },
        { name: "ASUS ROG Strix Scope RX TKL Wireless",     price: 32000, condition: "New", badge: "ROG PICK",     note: "Optical switches" },
      ],
      Mouse:       [
        { name: "Finalmouse Starlight-12 Wireless",  price: 25000, condition: "New", badge: "RECOMMENDED", note: "Featherweight" },
        { name: "Logitech G Pro X Superlight 2 DEX", price: 22000, condition: "New", badge: "BEST VALUE",   note: "Precision sensor" },
        { name: "Razer Viper V3 HyperSpeed",         price: 18000, condition: "New", badge: "BUDGET PICK",  note: "Lightweight" },
      ],
      Headphones:  [
        { name: "Astro A50 X Wireless + Base Station", price: 45000, condition: "New", badge: "RECOMMENDED", note: "Flagship console+PC" },
        { name: "Sony WH-1000XM5",                    price: 55000, condition: "New", badge: "AUDIOPHILE",   note: "ANC king" },
        { name: "SteelSeries Arctis Nova Pro Wireless",price: 38000, condition: "New", badge: "GAMING BEST",  note: "Premium gaming" },
      ],
    },

    flagship: {
      CPU:         [
        { name: "AMD Ryzen 9 9950X",                      price: 170000, condition: "New", badge: "RECOMMENDED",  note: "Balanced flagship" },
        { name: "Intel Core i9-14900KS Special Edition",   price: 160000, condition: "New", badge: "GAMING KING",   note: "Fastest gaming" },
        { name: "AMD Ryzen Threadripper PRO 7960X 24C",   price: 550000, condition: "New", badge: "WORKSTATION",   note: "24-core PRO" },
      ],
      GPU:         [
        { name: "NVIDIA RTX 5090 32GB",                   price: 600000, condition: "New",  badge: "ULTIMATE",      note: "Absolute fastest" },
        { name: "NVIDIA RTX 4090 24GB",                   price: 350000, condition: "New",  badge: "LAST GEN KING", note: "Still unbeatable" },
        { name: "NVIDIA RTX 5080 16GB",                   price: 300000, condition: "New",  badge: "RECOMMENDED",   note: "Best value" },
      ],
      Motherboard: [
        { name: "ASUS ROG MAXIMUS Z890 APEX",    price: 110000, condition: "New", badge: "EXTREME OC",    note: "Z890 flagship" },
        { name: "MSI MEG Z890 GODLIKE",          price: 130000, condition: "New", badge: "ABSOLUTE BEST", note: "Top board" },
        { name: "Gigabyte Z890 AORUS Tachyon",   price:  95000, condition: "New", badge: "RECOMMENDED",   note: "OC champion" },
      ],
      RAM:         [
        { name: "128GB DDR5-8000 G.Skill Trident Z5 RGB",   price: 250000, condition: "New", badge: "MAXIMUM",     note: "128GB elite" },
        { name: "64GB DDR5-8200 Corsair Dominator Titanium", price: 120000, condition: "New", badge: "RECOMMENDED", note: "Insane OC" },
        { name: "96GB DDR5-7200 Kingston Fury Renegade",     price: 150000, condition: "New", badge: "BALANCED",    note: "96GB fast kit" },
      ],
      Storage:     [
        { name: "4TB Samsung 990 Pro PCIe 4.0 + 8TB NAS", price:  95000, condition: "New", badge: "RECOMMENDED",  note: "Extreme storage" },
        { name: "2TB Crucial T705 PCIe 5.0 + 4TB WD Gold", price:  80000, condition: "New", badge: "PCIe 5 COMBO", note: "Next-gen fast" },
        { name: "8TB Samsung 870 QVO + 2TB 990 Pro",        price: 100000, condition: "New", badge: "STORAGE BEAST", note: "10TB total" },
      ],
      PSU:         [
        { name: "1600W 80+ Titanium Corsair AX1600i",  price:  75000, condition: "New", badge: "RECOMMENDED", note: "No compromise" },
        { name: "1200W 80+ Titanium Seasonic Prime TX", price:  45000, condition: "New", badge: "BEST VALUE",   note: "Titanium eff." },
        { name: "2000W 80+ Titanium Enermax Digifanless",price:120000, condition: "New", badge: "EXTREME",      note: "2kW monster" },
      ],
      Cooling:     [
        { name: "Custom 480mm Hardline Loop (Full Custom)",   price: 80000, condition: "New", badge: "CUSTOM WC",    note: "Ultimate cooling" },
        { name: "EK-AIO Elite 420 D-RGB",                    price: 42000, condition: "New", badge: "RECOMMENDED",  note: "420mm AIO" },
        { name: "ASUS ROG Ryujin III 360 ARGB",              price: 38000, condition: "New", badge: "PREMIUM AIO",  note: "Integrated fan" },
      ],
      Case:        [
        { name: "Caselabs Mercury S8 Full Tower",       price: 150000, condition: "New", badge: "ULTRA PREMIUM", note: "Modder's dream" },
        { name: "Corsair Obsidian 1000D Super Tower",   price:  90000, condition: "New", badge: "RECOMMENDED",   note: "Dual-system ready" },
        { name: "Phanteks Enthoo Elite Full Tower",     price:  80000, condition: "New", badge: "BEST VALUE",    note: "Premium full tower" },
      ],
      Monitor:     [
        { name: "32in 4K 240Hz OLED LG C3 (Gaming Cfg)", price: 220000, condition: "New", badge: "ULTRA PREMIUM", note: "TV-quality gaming" },
        { name: "27in 4K 480Hz ASUS ROG Swift PG27AQDM", price: 200000, condition: "New", badge: "RECOMMENDED",   note: "Fastest 4K OLED" },
        { name: "57in 8K Samsung Odyssey Neo G9",         price: 400000, condition: "New", badge: "EXTREME",       note: "Insane ultrawide" },
      ],
      Keyboard:    [
        { name: "Wooting 60HE Analog Hall-Effect",          price:  45000, condition: "New", badge: "RECOMMENDED",  note: "Analog precision" },
        { name: "Custom 65% build (Tofu65 + Gateron switches)", price: 75000, condition: "New", badge: "BESPOKE",   note: "Custom mech" },
        { name: "ASUS ROG Azoth Extreme Wireless",          price:  65000, condition: "New", badge: "PREMIUM",      note: "OLED display" },
      ],
      Mouse:       [
        { name: "Finalmouse Ultralight X Air58",              price:  80000, condition: "New", badge: "RECOMMENDED",  note: "Magnesium alloy" },
        { name: "Logitech G Pro X Superlight 2 DEX",         price:  22000, condition: "New", badge: "BEST VALUE",   note: "Pro esports" },
        { name: "ASUS ROG Harpe Ace Aim Lab Edition",        price:  18000, condition: "New", badge: "ROG PICK",     note: "Ultra-light" },
      ],
      Headphones:  [
        { name: "Sony MDR-Z1R Audiophile Closed-Back",        price: 200000, condition: "New", badge: "AUDIOPHILE",   note: "Studio-grade" },
        { name: "Focal Celestee Closed-Back Headphones",      price: 180000, condition: "New", badge: "PREMIUM",      note: "Hi-fi French" },
        { name: "Astro A50 X + SteelSeries Arctis Nova Pro", price:  85000, condition: "New", badge: "RECOMMENDED",  note: "Best gaming+audio" },
      ],
    },
  };

  // ─── Gaming performance fallbacks ────────────────────────────────────────────
  const budgetPKR = budgetPKR || 80000;
  const perfTier  = budgetPKR >= 600000 ? "high" : budgetPKR >= 250000 ? "mid" : "entry";

  const PERF_DATA = {
    entry: {
      resolution: "1080p",
      games: [
        { title: "Valorant",           preset: "High",   avg_fps: "144–200", low1_fps: "100+" },
        { title: "Counter-Strike 2",   preset: "Medium", avg_fps: "100–144", low1_fps: "75+"  },
        { title: "GTA V",              preset: "High",   avg_fps: "60–80",   low1_fps: "45+"  },
        { title: "Call of Duty (MW3)", preset: "Medium", avg_fps: "75–100",  low1_fps: "55+"  },
        { title: "Fortnite",           preset: "High",   avg_fps: "75–100",  low1_fps: "55+"  },
        { title: "Apex Legends",       preset: "High",   avg_fps: "90–120",  low1_fps: "65+"  },
        { title: "Cyberpunk 2077",     preset: "Medium", avg_fps: "40–55",   low1_fps: "30+"  },
        { title: "RE4 Remake",         preset: "High",   avg_fps: "60–80",   low1_fps: "45+"  },
        { title: "Forza Horizon 5",    preset: "High",   avg_fps: "60–80",   low1_fps: "45+"  },
        { title: "Days Gone",          preset: "High",   avg_fps: "55–75",   low1_fps: "40+"  },
      ],
    },
    mid: {
      resolution: "1440p",
      games: [
        { title: "Valorant",           preset: "High",  avg_fps: "200–300", low1_fps: "150+" },
        { title: "Counter-Strike 2",   preset: "High",  avg_fps: "165–200", low1_fps: "120+" },
        { title: "GTA V",              preset: "High",  avg_fps: "80–100",  low1_fps: "60+"  },
        { title: "Call of Duty (MW3)", preset: "High",  avg_fps: "100–130", low1_fps: "75+"  },
        { title: "Fortnite",           preset: "High",  avg_fps: "90–120",  low1_fps: "65+"  },
        { title: "Apex Legends",       preset: "High",  avg_fps: "120–165", low1_fps: "90+"  },
        { title: "Cyberpunk 2077",     preset: "High",  avg_fps: "55–70",   low1_fps: "40+"  },
        { title: "RE4 Remake",         preset: "High",  avg_fps: "80–100",  low1_fps: "60+"  },
        { title: "Forza Horizon 5",    preset: "Ultra", avg_fps: "75–100",  low1_fps: "55+"  },
        { title: "Days Gone",          preset: "High",  avg_fps: "75–95",   low1_fps: "55+"  },
      ],
    },
    high: {
      resolution: "4K",
      games: [
        { title: "Valorant",           preset: "Ultra",    avg_fps: "300–400+", low1_fps: "250+" },
        { title: "Counter-Strike 2",   preset: "Very High",avg_fps: "250–350",  low1_fps: "180+" },
        { title: "GTA V",              preset: "Ultra",    avg_fps: "100–140",  low1_fps: "80+"  },
        { title: "Call of Duty (MW3)", preset: "Ultra",    avg_fps: "150–200",  low1_fps: "110+" },
        { title: "Fortnite",           preset: "Epic",     avg_fps: "120–160",  low1_fps: "90+"  },
        { title: "Apex Legends",       preset: "High",     avg_fps: "150–200",  low1_fps: "110+" },
        { title: "Cyberpunk 2077",     preset: "Ultra+RT", avg_fps: "80–120",   low1_fps: "60+"  },
        { title: "RE4 Remake",         preset: "Ultra",    avg_fps: "120–160",  low1_fps: "90+"  },
        { title: "Forza Horizon 5",    preset: "Ultra",    avg_fps: "100–130",  low1_fps: "80+"  },
        { title: "Days Gone",          preset: "Ultra",    avg_fps: "100–130",  low1_fps: "80+"  },
      ],
    },
  };

  const perf = PERF_DATA[perfTier];

  const tierData = TIERS[tier] || TIERS["budget"];
  const ICONS = {
    CPU: "🔲", GPU: "🎮", Motherboard: "🧩", RAM: "⚡", Storage: "💾",
    PSU: "🔌", Cooling: "❄️", Case: "📦", Monitor: "🖥️",
    Keyboard: "⌨️", Mouse: "🖱️", Headphones: "🎧",
  };

  const categories = Object.entries(tierData).map(([cat, options]) => ({
    cat, icon: ICONS[cat] || "🛠️", options,
  }));

  return {
    build_name:    `FORGE ${tier.toUpperCase()} Build`,
    tier,
    currency,
    total_budget:  budgetPKR,
    categories,
    assembly_fee:  3500,
    gaming_performance: {
      note: "Estimates based on benchmark data for this hardware tier. Actual FPS varies by game settings, drivers, and hardware configuration.",
      resolution: perf.resolution,
      games: perf.games,
    },
    summary: `Optimized ${tier} build for the Pakistani market. Components readily available at Hafeez Centre and local retailers.`,
    upgrade_path: "Upgrade GPU first for gaming; upgrade CPU/RAM for productivity workloads.",
  };
}

// ─── RENDER RESULTS ───────────────────────────────────────────────────────────

function renderResults(blueprint) {
  const container = document.getElementById("partsContainer");
  if (!container || !blueprint?.categories) return;

  container.innerHTML = "";
  STATE.selections    = {};

  // Live price indicator
  const liveIndicator = document.getElementById("aiSourceIndicator");
  const liveText      = document.getElementById("aiSourceText");
  if (liveIndicator && liveText) {
    if (STATE.livePrices) {
      liveText.textContent = "✓ Build powered by live web market research";
      liveIndicator.style.display = "flex";
    } else if (blueprint?.fallback) {
      liveText.textContent = "⚠ Offline mode — using cached component data";
      liveIndicator.style.display = "flex";
    } else {
      liveIndicator.style.display = "none";
    }
  }

  // Build tier ribbon
  if (blueprint.build_name) {
    const ribbon = document.getElementById("buildRibbonTitle");
    if (ribbon) ribbon.textContent = `HARDWARE MATRIX — ${blueprint.build_name.toUpperCase()}`;
  }

  // Render component categories
  blueprint.categories.forEach((category, catIdx) => {
    const section = document.createElement("div");
    section.className = "category-section";
    section.style.animationDelay = `${catIdx * 50}ms`;

    const safeId = category.cat.replace(/\s+/g, "-");

    section.innerHTML = `
      <div class="cat-header">
        <span class="cat-icon">${category.icon || "🛠️"}</span>
        <span class="cat-name">${escapeHtml(category.cat)}</span>
        <span class="cat-selection-status" id="sel-status-${safeId}">— NOT SELECTED —</span>
      </div>
      <div class="cat-options-row" id="options-${safeId}"></div>
    `;

    const optionsRow = section.querySelector(`#options-${CSS.escape(safeId)}`);

    (category.options || []).forEach(opt => {
      const card = document.createElement("div");
      card.className   = "option-card";
      card.dataset.cat = category.cat;

      const badgeClass = getBadgeClass(opt.badge);
      const condClass  = opt.condition === "Used" ? "cond-used"
                       : opt.condition === "Refurbished" ? "cond-refurb"
                       : "cond-new";

      card.innerHTML = `
        <div class="option-badge ${badgeClass}">${escapeHtml(opt.badge || "")}</div>
        <div class="option-name" title="${escapeHtml(opt.name)}">${escapeHtml(opt.name)}</div>
        <div class="option-note">${escapeHtml(opt.note || "")}</div>
        <div class="option-footer">
          <span class="option-condition ${condClass}">${escapeHtml(opt.condition || "New")}</span>
          <span class="option-price">${formatPrice(opt.price)}</span>
        </div>
        <div class="option-select-indicator">✓ SELECTED</div>
      `;

      card.addEventListener("click", () => toggleSelection(category.cat, opt, card, optionsRow, safeId));
      optionsRow.appendChild(card);
    });

    container.appendChild(section);
  });

  // Render gaming performance section
  if (STATE.gamePerf || blueprint.gaming_performance) {
    renderGamingPerformance(STATE.gamePerf || blueprint.gaming_performance);
  }

  updateBuildSummary();
}

// ─── GAMING PERFORMANCE SECTION ───────────────────────────────────────────────

function renderGamingPerformance(perf) {
  const container = document.getElementById("partsContainer");
  if (!container || !perf?.games?.length) return;

  const section = document.createElement("div");
  section.className = "category-section gaming-perf-section";
  section.style.marginTop = "32px";

  const resolution = perf.resolution || "1080p";
  const note       = perf.note || "Estimates based on benchmark data. Actual performance varies.";

  section.innerHTML = `
    <div class="cat-header">
      <span class="cat-icon">🎯</span>
      <span class="cat-name">EXPECTED GAMING PERFORMANCE</span>
      <span class="cat-selection-status" style="color:var(--accent2)">${escapeHtml(resolution)}</span>
    </div>
    <div class="perf-disclaimer">${escapeHtml(note)}</div>
    <div class="perf-table" id="perfTableBody"></div>
  `;

  container.appendChild(section);

  const tableBody = section.querySelector("#perfTableBody");

  perf.games.forEach(game => {
    const row = document.createElement("div");
    row.className = "perf-row";
    row.innerHTML = `
      <div class="perf-game">${escapeHtml(game.title)}</div>
      <div class="perf-preset">${escapeHtml(game.preset || "High")}</div>
      <div class="perf-fps">
        <span class="fps-label">AVG</span>
        <span class="fps-value">${escapeHtml(game.avg_fps || "—")}</span>
        <span class="fps-unit">FPS</span>
      </div>
      <div class="perf-low">
        <span class="fps-label">1% LOW</span>
        <span class="fps-value fps-low">${escapeHtml(game.low1_fps || "—")}</span>
        <span class="fps-unit">FPS</span>
      </div>
    `;
    tableBody.appendChild(row);
  });
}

// ─── BADGE HELPER ─────────────────────────────────────────────────────────────

function getBadgeClass(badge) {
  if (!badge) return "badge-default";
  const b = badge.toUpperCase();
  if (b.includes("RECOMMENDED")) return "badge-rec";
  if (b.includes("BUDGET") || b.includes("ULTRA BUDGET")) return "badge-budget";
  if (b.includes("BEST VALUE")) return "badge-value";
  if (b.includes("PREMIUM") || b.includes("KING") || b.includes("ULTIMATE") ||
      b.includes("FLAGSHIP") || b.includes("EXTREME")) return "badge-premium";
  return "badge-default";
}

// ─── SELECTION LOGIC ──────────────────────────────────────────────────────────

function toggleSelection(cat, opt, clickedCard, optionsRow, safeId) {
  const isAlreadySelected = STATE.selections[cat]?.name === opt.name;

  // Deselect all cards in this category
  optionsRow.querySelectorAll(".option-card").forEach(c => c.classList.remove("selected"));

  if (isAlreadySelected) {
    delete STATE.selections[cat];
    const statusEl = document.getElementById(`sel-status-${safeId}`);
    if (statusEl) {
      statusEl.textContent = "— NOT SELECTED —";
      statusEl.classList.remove("status-selected");
    }
  } else {
    clickedCard.classList.add("selected");
    STATE.selections[cat] = { ...opt, cat, icon: opt.icon || "🛠️" };
    const statusEl = document.getElementById(`sel-status-${safeId}`);
    if (statusEl) {
      statusEl.textContent = `✓ ${opt.name.length > 30 ? opt.name.slice(0, 28) + "…" : opt.name}`;
      statusEl.classList.add("status-selected");
    }
  }

  updateBuildSummary();
}

// ─── BUILD SUMMARY PANEL ──────────────────────────────────────────────────────

function updateBuildSummary() {
  const listEl    = document.getElementById("buildSummaryList");
  const totalEl   = document.getElementById("buildSummaryTotal");
  const countEl   = document.getElementById("buildSummaryCount");
  if (!listEl) return;

  listEl.innerHTML = "";
  let totalPKR     = 0;
  const selected   = Object.values(STATE.selections);

  if (selected.length === 0) {
    listEl.innerHTML = '<div class="summary-empty">Select components to build your rig</div>';
  } else {
    selected.forEach(item => {
      totalPKR += (item.price || 0);
      const row      = document.createElement("div");
      row.className  = "summary-item";
      row.innerHTML  = `
        <div class="summary-item-info">
          <span class="summary-cat">${escapeHtml(item.cat)}</span>
          <span class="summary-name">${escapeHtml(item.name.length > 28 ? item.name.slice(0, 26) + "…" : item.name)}</span>
        </div>
        <span class="summary-price">${formatPrice(item.price)}</span>
      `;
      listEl.appendChild(row);
    });
  }

  if (totalEl) totalEl.textContent = formatPrice(totalPKR);
  if (countEl) countEl.textContent = `${selected.length} component${selected.length !== 1 ? "s" : ""}`;

  // Budget progress bar
  const progressEl = document.getElementById("budgetProgress");
  if (progressEl && STATE.budgetPKR > 0) {
    const pct = Math.min(100, (totalPKR / STATE.budgetPKR) * 100);
    progressEl.style.width  = `${pct}%`;
    progressEl.className    = "budget-bar-fill" +
      (pct > 100 ? " over-budget" : pct > 85 ? " near-budget" : "");
  }

  // Remaining budget text
  const remainEl = document.getElementById("budgetRemaining");
  if (remainEl && STATE.budgetPKR > 0) {
    const remaining = STATE.budgetPKR - totalPKR;
    remainEl.textContent = remaining >= 0
      ? `${formatPrice(remaining)} remaining`
      : `${formatPrice(Math.abs(remaining))} over budget`;
    remainEl.className = "budget-remaining" + (remaining < 0 ? " over" : "");
  }
}

// ─── INVOICE ─────────────────────────────────────────────────────────────────

function openInvoice() {
  const modal   = document.getElementById("invoiceModal");
  const items   = document.getElementById("invoiceItemsContainer");
  const hwTotal = document.getElementById("invoiceHardwareTotal");
  const asmFee  = document.getElementById("invoiceAssemblyFee");
  const grand   = document.getElementById("invoiceGrandTotal");
  const ts      = document.getElementById("invoiceTimestamp");

  if (!modal || !items) return;

  items.innerHTML = "";
  let totalPKR    = 0;
  const selected  = Object.values(STATE.selections);

  if (selected.length === 0) {
    items.innerHTML = '<div class="receipt-empty">No components selected. Go back and select components to generate a bill.</div>';
  } else {
    selected.forEach(item => {
      totalPKR += (item.price || 0);
      const row = document.createElement("div");
      row.className = "receipt-row";
      row.innerHTML = `
        <span class="receipt-cat">${escapeHtml(item.cat)}</span>
        <span class="receipt-item" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
        <span class="receipt-price">${formatPrice(item.price)}</span>
      `;
      items.appendChild(row);
    });

    // Gaming performance summary in invoice
    const perf = STATE.gamePerf;
    if (perf?.games?.length) {
      const perfDiv = document.createElement("div");
      perfDiv.className = "receipt-perf-block";
      perfDiv.innerHTML = `
        <div class="bar-separator">════════════════════════════════════════</div>
        <div class="receipt-section-title">EXPECTED GAMING PERFORMANCE (${escapeHtml(perf.resolution || "1080p")})</div>
        ${perf.games.map(g => `
          <div class="receipt-perf-row">
            <span class="receipt-game">${escapeHtml(g.title)}</span>
            <span class="receipt-game-fps">${escapeHtml(g.preset || "High")} · Avg ${escapeHtml(g.avg_fps || "—")} FPS · 1% Low ${escapeHtml(g.low1_fps || "—")} FPS</span>
          </div>
        `).join("")}
        <div class="receipt-perf-note">${escapeHtml(perf.note || "")}</div>
      `;
      items.appendChild(perfDiv);
    }
  }

  const assemblyPKR = STATE.assemblyFee;
  const grandPKR    = totalPKR + assemblyPKR;

  if (hwTotal) hwTotal.textContent = formatPrice(totalPKR);
  if (asmFee)  asmFee.textContent  = formatPrice(assemblyPKR);
  if (grand)   grand.textContent   = formatPrice(grandPKR);

  if (ts) {
    const now = new Date();
    ts.textContent = `${now.toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "2-digit" })} · ${now.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}`;
  }

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeInvoice() {
  const modal = document.getElementById("invoiceModal");
  if (modal?.classList.contains("active")) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}

// ─── VIEW NAVIGATION ──────────────────────────────────────────────────────────

function navigateTo(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const el = document.getElementById(viewId);
  if (el) {
    el.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// ─── TERMINAL ANIMATION ───────────────────────────────────────────────────────

function runTerminal() {
  const lines = document.querySelectorAll(".terminal-line");
  lines.forEach(l => l.className = "terminal-line");
  lines.forEach((line, i) => {
    const delay = parseInt(line.getAttribute("data-delay"), 10) || 0;
    setTimeout(() => {
      if (i > 0) lines[i - 1].className = "terminal-line processed-line";
      line.className = "terminal-line active-line";
    }, delay);
  });
}

// ─── PARTICLES ────────────────────────────────────────────────────────────────

function initParticles() {
  const canvas = document.getElementById("particleCanvas");
  if (!canvas) return;
  const ctx  = canvas.getContext("2d");
  let pts    = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  class P {
    constructor() { this.reset(); }
    reset() {
      this.x    = Math.random() * canvas.width;
      this.y    = Math.random() * canvas.height;
      this.size = Math.random() * 1.5 + 0.4;
      this.sx   = Math.random() * 0.35 - 0.175;
      this.sy   = Math.random() * 0.35 - 0.175;
      this.a    = Math.random() * 0.45 + 0.1;
    }
    update() {
      this.x += this.sx;
      this.y += this.sy;
      if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
    }
    draw() {
      ctx.fillStyle = `rgba(0,240,255,${this.a})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let i = 0; i < 55; i++) pts.push(new P());

  (function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pts.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  })();
}

// ─── CURSOR GLOW ──────────────────────────────────────────────────────────────

function setupCursorGlow() {
  const glow = document.getElementById("cursorGlow");
  if (!glow) return;
  window.addEventListener("mousemove", e => {
    glow.style.left = `${e.clientX}px`;
    glow.style.top  = `${e.clientY}px`;
  });
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showError(msg) {
  const el = document.getElementById("budgetError");
  if (el) el.textContent = msg;
  document.querySelector(".budget-input-wrapper")?.classList.add("error-state");
}