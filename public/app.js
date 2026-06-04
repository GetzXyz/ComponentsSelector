/**
 * FORGE — MAIN APPLICATION CONTROLLER v4.0
 *
 * Features:
 *  - Live Gemini + Google Search inventory
 *  - Multi-currency support (PKR, USD, EUR, GBP, AED, SAR, CAD, AUD)
 *  - Budget-aware tier scaling
 *  - 3 options per category (New / Used / Best Value)
 *  - Click-to-select / click-again-to-deselect
 *  - Live build summary panel (left side)
 *  - Real-time price totals
 *  - Invoice modal
 *  - No architecture report section
 */

"use strict";

// ─── STATE ────────────────────────────────────────────────────────────────────

const STATE = {
    blueprint:    null,   // full Gemini response
    selections:   {},     // { "CPU": { name, price(PKR), condition, cat, icon }, ... }
    budgetPKR:    0,
    purpose:      "gaming",
    assemblyFee:  3500    // PKR
};

// ─── BOOT ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    initParticles();
    setupCursorGlow();
    bindEvents();
    renderCurrencySelector();
});

// ─── CURRENCY SELECTOR ────────────────────────────────────────────────────────

function renderCurrencySelector() {
    const wrapper = document.getElementById("currencySelectorWrapper");
    if (!wrapper) return;

    const select = document.createElement("select");
    select.id        = "currencySelect";
    select.className = "currency-select";

    Object.entries(CURRENCIES).forEach(([code, info]) => {
        const opt   = document.createElement("option");
        opt.value   = code;
        opt.textContent = `${info.symbol} ${code}`;
        if (code === "PKR") opt.selected = true;
        select.appendChild(opt);
    });

    select.addEventListener("change", () => {
        setActiveCurrency(select.value);
        document.getElementById("currencyIndicator").textContent = select.value;
        updateBudgetHint();
        if (STATE.blueprint) {
            renderResults(STATE.blueprint);
        }
        updateBuildSummary();
    });

    wrapper.appendChild(select);
}

function updateBudgetHint() {
    const hint = document.getElementById("budgetHint");
    const cur  = CURRENCIES[getActiveCurrency()];
    const min  = formatRaw(Math.round(30000 * cur.rate));
    if (hint) hint.textContent = `Minimum: ${min}. Recommended for modern computing: ${formatRaw(Math.round(80000 * cur.rate))}+`;
}

// ─── EVENT BINDING ────────────────────────────────────────────────────────────

function bindEvents() {
    // Radio card sync
    document.querySelectorAll('.selectable-card input[type="radio"]').forEach(radio => {
        radio.addEventListener("change", () => {
            document.querySelectorAll(".selectable-card").forEach(c => c.classList.remove("active"));
            radio.closest(".selectable-card")?.classList.add("active");
        });
    });

    // Budget live clear error
    document.getElementById("budgetInput")?.addEventListener("input", () => {
        document.getElementById("budgetError").textContent = "";
        document.querySelector(".budget-input-wrapper")?.classList.remove("error-state");
    });

    // Form submit
    document.getElementById("configForm")?.addEventListener("submit", handleFormSubmit);

    // Back button
    document.getElementById("backToConfigBtn")?.addEventListener("click", () => {
        navigateTo("onboardingView");
    });

    // Invoice
    document.getElementById("openInvoiceBtn")?.addEventListener("click", () => openInvoice());
    document.getElementById("closeInvoiceBtn")?.addEventListener("click", () => closeInvoice());
    document.getElementById("invoiceModal")?.addEventListener("click", e => {
        if (e.target === document.getElementById("invoiceModal")) closeInvoice();
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") closeInvoice();
    });

    updateBudgetHint();
}

// ─── FORM SUBMIT ─────────────────────────────────────────────────────────────

async function handleFormSubmit(e) {
    e.preventDefault();

    const rawBudget = parseFloat(document.getElementById("budgetInput").value);
    const cur       = CURRENCIES[getActiveCurrency()];
    const budgetPKR = Math.round(rawBudget / cur.rate);
    const purpose   = document.querySelector('input[name="purpose"]:checked')?.value || "gaming";

    // Min threshold = 30,000 PKR equivalent
    const minInCur  = Math.round(30000 * cur.rate);
    if (!rawBudget || rawBudget < minInCur) {
        showError(`Minimum budget is ${formatRaw(minInCur)}.`);
        document.getElementById("budgetInput").focus();
        return;
    }

    STATE.budgetPKR = budgetPKR;
    STATE.purpose   = purpose;
    STATE.selections = {};

    const btn = document.getElementById("submitBtn");
    if (btn) btn.disabled = true;

    navigateTo("loadingView");
    runTerminal();

    try {
        STATE.blueprint = await contactForgeIntelligenceEngine(budgetPKR, purpose);
    } catch (err) {
        console.warn("Gemini error — using fallback:", err.message);
        STATE.blueprint = buildFallback(budgetPKR, purpose);
    }

    setTimeout(() => {
        renderResults(STATE.blueprint);
        updateBuildSummary();
        navigateTo("resultsView");
        if (btn) btn.disabled = false;
    }, 6000);
}

// ─── FALLBACK DATA ────────────────────────────────────────────────────────────

function buildFallback(budgetPKR, purpose) {
    const tier = getBudgetTier(budgetPKR);

    const TIERS = {
        entry: {
            CPU: [
                { name: "Intel Core i3-12100F",       price: 22000, condition: "New",  badge: "RECOMMENDED", note: "Strong entry CPU" },
                { name: "AMD Ryzen 3 3300X Used",     price: 12000, condition: "Used", badge: "BUDGET PICK",  note: "Good used value" },
                { name: "Intel Pentium Gold G6405",   price: 14000, condition: "New",  badge: "ULTRA BUDGET", note: "Minimum viable" }
            ],
            GPU: [
                { name: "NVIDIA GTX 1650 4GB",        price: 30000, condition: "New",  badge: "RECOMMENDED", note: "1080p capable" },
                { name: "AMD RX 580 8GB Used",        price: 18000, condition: "Used", badge: "BUDGET PICK",  note: "Great used value" },
                { name: "NVIDIA GTX 1630 4GB",        price: 22000, condition: "New",  badge: "BEST VALUE",   note: "Budget 1080p" }
            ],
            Motherboard: [
                { name: "MSI H610M PRO-E",            price: 14000, condition: "New",  badge: "RECOMMENDED", note: "Solid LGA1700" },
                { name: "Gigabyte B450M DS3H",        price: 10000, condition: "New",  badge: "BUDGET PICK",  note: "AMD AM4" },
                { name: "ASUS PRIME H510M-E",         price: 12000, condition: "New",  badge: "BEST VALUE",   note: "Simple, reliable" }
            ],
            RAM: [
                { name: "16GB DDR4 3200MHz (2x8)",    price:  9500, condition: "New",  badge: "RECOMMENDED", note: "Dual channel" },
                { name: "8GB DDR4 2666MHz Single",    price:  4500, condition: "New",  badge: "BUDGET PICK",  note: "Minimal but works" },
                { name: "16GB DDR4 TeamGroup",        price:  8500, condition: "New",  badge: "BEST VALUE",   note: "Good brand" }
            ],
            Storage: [
                { name: "512GB NVMe M.2 SSD",         price:  7500, condition: "New",  badge: "RECOMMENDED", note: "Fast boot drive" },
                { name: "256GB SATA SSD 2.5in",       price:  4500, condition: "New",  badge: "BUDGET PICK",  note: "Minimal storage" },
                { name: "1TB HDD 7200RPM + 120GB SSD",price:  6500, condition: "New",  badge: "BEST VALUE",   note: "Combo approach" }
            ],
            PSU: [
                { name: "550W 80+ Bronze Seasonic",   price:  8000, condition: "New",  badge: "RECOMMENDED", note: "Reliable PSU" },
                { name: "500W Generic 80+ PSU",       price:  5500, condition: "New",  badge: "BUDGET PICK",  note: "Basic power" },
                { name: "450W Corsair CX450",         price:  7000, condition: "New",  badge: "BEST VALUE",   note: "Trusted brand" }
            ],
            Case: [
                { name: "Deepcool MATREXX 30",        price:  4000, condition: "New",  badge: "RECOMMENDED", note: "Good airflow" },
                { name: "Basic ATX Mid Tower",         price:  2500, condition: "New",  badge: "BUDGET PICK",  note: "Bare minimum" },
                { name: "Antec NX200",                price:  3500, condition: "New",  badge: "BEST VALUE",   note: "Decent airflow" }
            ],
            Monitor: [
                { name: "22in FHD 75Hz IPS",          price:  9000, condition: "New",  badge: "RECOMMENDED", note: "1080p entry" },
                { name: "19in HD 60Hz TN",             price:  5500, condition: "Used", badge: "BUDGET PICK",  note: "Functional" },
                { name: "24in FHD 60Hz VA",            price: 10000, condition: "New",  badge: "BEST VALUE",   note: "Larger screen" }
            ],
            Peripherals: [
                { name: "Basic KB+Mouse Combo",        price:  2000, condition: "New",  badge: "RECOMMENDED", note: "Functional set" },
                { name: "Wired Membrane KB + Mouse",   price:  1500, condition: "New",  badge: "BUDGET PICK",  note: "Ultra cheap" },
                { name: "Logitech MK220 Wireless Combo",price: 3500, condition: "New",  badge: "BEST VALUE",   note: "Wireless comfort" }
            ]
        },
        budget: {
            CPU: [
                { name: "AMD Ryzen 5 5600X",          price: 32000, condition: "New",  badge: "RECOMMENDED", note: "Top AM4 value" },
                { name: "Intel Core i5-10400F",       price: 20000, condition: "New",  badge: "BUDGET PICK",  note: "Solid 6-core" },
                { name: "AMD Ryzen 5 5500",           price: 25000, condition: "New",  badge: "BEST VALUE",   note: "Budget Zen 3" }
            ],
            GPU: [
                { name: "NVIDIA RTX 3060 12GB",       price: 62000, condition: "New",  badge: "RECOMMENDED", note: "1080p/1440p king" },
                { name: "AMD RX 6600 Used",           price: 38000, condition: "Used", badge: "BUDGET PICK",  note: "Strong used 1080p" },
                { name: "NVIDIA GTX 1660 Super",      price: 42000, condition: "New",  badge: "BEST VALUE",   note: "1080p workhorse" }
            ],
            Motherboard: [
                { name: "MSI B550M PRO-VDH",          price: 18000, condition: "New",  badge: "RECOMMENDED", note: "Solid B550" },
                { name: "Gigabyte B450M Gaming",      price: 12000, condition: "New",  badge: "BUDGET PICK",  note: "Entry AM4" },
                { name: "ASUS PRIME B550M-A",         price: 16000, condition: "New",  badge: "BEST VALUE",   note: "Feature-rich" }
            ],
            RAM: [
                { name: "16GB DDR4 3600MHz Corsair",  price: 12000, condition: "New",  badge: "RECOMMENDED", note: "Speed boost" },
                { name: "16GB DDR4 3200MHz Generic",  price:  9000, condition: "New",  badge: "BUDGET PICK",  note: "Works fine" },
                { name: "32GB DDR4 3200MHz (2x16)",   price: 18000, condition: "New",  badge: "BEST VALUE",   note: "Future proof" }
            ],
            Storage: [
                { name: "1TB NVMe PCIe 3.0 SSD",     price: 12000, condition: "New",  badge: "RECOMMENDED", note: "Fast & spacious" },
                { name: "512GB NVMe M.2 SSD",         price:  7500, condition: "New",  badge: "BUDGET PICK",  note: "Enough to start" },
                { name: "1TB Samsung 870 EVO SATA",   price: 14000, condition: "New",  badge: "BEST VALUE",   note: "Reliable SATA" }
            ],
            PSU: [
                { name: "650W 80+ Gold EVGA",         price: 12000, condition: "New",  badge: "RECOMMENDED", note: "Gold efficiency" },
                { name: "550W 80+ Bronze Cooler Master",price: 8000, condition: "New", badge: "BUDGET PICK",  note: "Good basic PSU" },
                { name: "600W Seasonic 80+ Bronze",   price: 10000, condition: "New",  badge: "BEST VALUE",   note: "Trusted brand" }
            ],
            Case: [
                { name: "NZXT H510 Mid Tower",        price:  9000, condition: "New",  badge: "RECOMMENDED", note: "Clean build" },
                { name: "Deepcool MATREXX 55",        price:  6000, condition: "New",  badge: "BUDGET PICK",  note: "Great airflow" },
                { name: "Fractal Focus G",            price:  7500, condition: "New",  badge: "BEST VALUE",   note: "Quiet design" }
            ],
            Monitor: [
                { name: "24in FHD 144Hz IPS Monitor", price: 18000, condition: "New",  badge: "RECOMMENDED", note: "144Hz gaming" },
                { name: "24in FHD 75Hz VA Monitor",   price: 12000, condition: "New",  badge: "BUDGET PICK",  note: "Good colors" },
                { name: "27in FHD 144Hz Monitor",     price: 22000, condition: "New",  badge: "BEST VALUE",   note: "Bigger screen" }
            ],
            Peripherals: [
                { name: "Logitech G213 KB + G203 Mouse",price: 7000, condition: "New",  badge: "RECOMMENDED", note: "Gaming essentials" },
                { name: "Redragon K552 + M711 Combo", price:  5000, condition: "New",  badge: "BUDGET PICK",  note: "Gamer value set" },
                { name: "Corsair K55 + M55 Combo",    price:  8500, condition: "New",  badge: "BEST VALUE",   note: "Branded duo" }
            ]
        },
        "mid-range": {
            CPU: [
                { name: "AMD Ryzen 7 5800X3D",        price: 68000, condition: "New",  badge: "RECOMMENDED", note: "Best gaming CPU" },
                { name: "Intel Core i5-13600K",       price: 58000, condition: "New",  badge: "BUDGET PICK",  note: "Excellent IPC" },
                { name: "AMD Ryzen 5 7600X",          price: 55000, condition: "New",  badge: "BEST VALUE",   note: "AM5 future proof" }
            ],
            GPU: [
                { name: "NVIDIA RTX 3080 10GB Used",  price: 95000, condition: "Used", badge: "RECOMMENDED", note: "Flagship for less" },
                { name: "NVIDIA RTX 4070 12GB New",   price:105000, condition: "New",  badge: "BEST NEW",     note: "Efficient Ada Lovelace" },
                { name: "AMD RX 6800 XT Used",        price: 80000, condition: "Used", badge: "BEST VALUE",   note: "Rasterization beast" }
            ],
            Motherboard: [
                { name: "MSI MAG B550 TOMAHAWK",      price: 28000, condition: "New",  badge: "RECOMMENDED", note: "Top B550" },
                { name: "ASUS ROG STRIX B550-F",      price: 32000, condition: "New",  badge: "PREMIUM",      note: "Feature-rich" },
                { name: "Gigabyte B550 AORUS Elite",  price: 25000, condition: "New",  badge: "BEST VALUE",   note: "Good VRMs" }
            ],
            RAM: [
                { name: "32GB DDR4 3600MHz Corsair Vengeance", price: 22000, condition: "New",  badge: "RECOMMENDED", note: "Gaming sweet spot" },
                { name: "16GB DDR4 3600MHz G.Skill Ripjaws",   price: 12000, condition: "New",  badge: "BUDGET PICK",  note: "Adequate for now" },
                { name: "32GB DDR4 3200MHz TeamGroup T-Force",  price: 19000, condition: "New",  badge: "BEST VALUE",   note: "Budget 32GB" }
            ],
            Storage: [
                { name: "1TB Samsung 980 Pro NVMe PCIe 4.0",  price: 18000, condition: "New",  badge: "RECOMMENDED", note: "Top-tier speed" },
                { name: "1TB WD Black SN770 NVMe",            price: 14000, condition: "New",  badge: "BEST VALUE",   note: "Fast & affordable" },
                { name: "2TB Crucial P3 Plus NVMe",           price: 22000, condition: "New",  badge: "SPACIOUS",     note: "Double the space" }
            ],
            PSU: [
                { name: "750W 80+ Gold Seasonic Focus",  price: 16000, condition: "New",  badge: "RECOMMENDED", note: "For RTX 3080" },
                { name: "850W 80+ Gold EVGA SuperNOVA",  price: 19000, condition: "New",  badge: "HEADROOM",     note: "Future upgrades" },
                { name: "700W 80+ Bronze Cooler Master", price: 12000, condition: "New",  badge: "BUDGET PICK",  note: "Adequate" }
            ],
            Case: [
                { name: "Lian Li LANCOOL 205 MESH",    price: 12000, condition: "New",  badge: "RECOMMENDED", note: "Best airflow" },
                { name: "Fractal Design Meshify C",     price: 14000, condition: "New",  badge: "SILENT",       note: "Quiet & cool" },
                { name: "Corsair 4000D Airflow",        price: 13000, condition: "New",  badge: "BEST VALUE",   note: "Premium airflow" }
            ],
            Monitor: [
                { name: "27in QHD 165Hz IPS Monitor",  price: 38000, condition: "New",  badge: "RECOMMENDED", note: "1440p gaming" },
                { name: "24in FHD 240Hz IPS Monitor",  price: 28000, condition: "New",  badge: "HIGH REFRESH", note: "Competitive play" },
                { name: "27in QHD 144Hz VA Monitor",   price: 30000, condition: "New",  badge: "BEST VALUE",   note: "Great contrast" }
            ],
            Peripherals: [
                { name: "SteelSeries Apex 3 + Rival 3 + HS35 Headset", price: 18000, condition: "New",  badge: "RECOMMENDED", note: "Full gaming set" },
                { name: "Logitech G Pro KB + G502 Mouse",               price: 20000, condition: "New",  badge: "LOGITECH SET",  note: "Pro gaming combo" },
                { name: "HyperX Alloy Core KB + Pulsefire Surge",       price: 15000, condition: "New",  badge: "BEST VALUE",   note: "Solid set" }
            ]
        },
        "high-end": {
            CPU: [
                { name: "AMD Ryzen 9 7900X",           price: 105000, condition: "New",  badge: "RECOMMENDED", note: "AM5 powerhouse" },
                { name: "Intel Core i9-13900K",        price: 115000, condition: "New",  badge: "INTEL KING",   note: "Top single-thread" },
                { name: "AMD Ryzen 7 7700X",           price:  80000, condition: "New",  badge: "BEST VALUE",   note: "8-core AM5" }
            ],
            GPU: [
                { name: "NVIDIA RTX 4080 16GB",        price: 220000, condition: "New",  badge: "RECOMMENDED", note: "4K flagship" },
                { name: "NVIDIA RTX 4080 Used",        price: 180000, condition: "Used", badge: "USED DEAL",    note: "Save vs new" },
                { name: "NVIDIA RTX 4070 Ti Super",    price: 165000, condition: "New",  badge: "BEST VALUE",   note: "Near 4080 perf" }
            ],
            Motherboard: [
                { name: "ASUS ROG STRIX X670E-F",     price:  55000, condition: "New",  badge: "RECOMMENDED", note: "AM5 flagship" },
                { name: "MSI MEG X670E ACE",          price:  65000, condition: "New",  badge: "PREMIUM",      note: "Overclocking king" },
                { name: "Gigabyte X670 AORUS Elite",  price:  45000, condition: "New",  badge: "BEST VALUE",   note: "Good AM5 B-tier" }
            ],
            RAM: [
                { name: "32GB DDR5-6000 G.Skill Trident Z5", price: 38000, condition: "New",  badge: "RECOMMENDED", note: "DDR5 sweet spot" },
                { name: "64GB DDR5-5600 Kingston",           price: 60000, condition: "New",  badge: "WORKSTATION",  note: "Massive capacity" },
                { name: "32GB DDR5-5200 Corsair Dominator",  price: 32000, condition: "New",  badge: "BEST VALUE",   note: "Reliable DDR5" }
            ],
            Storage: [
                { name: "2TB Samsung 990 Pro NVMe PCIe 4.0",  price: 32000, condition: "New",  badge: "RECOMMENDED", note: "Flagship SSD" },
                { name: "1TB WD Black SN850X + 2TB HDD Combo",price: 28000, condition: "New",  badge: "COMBO",        note: "Speed + storage" },
                { name: "4TB Seagate Firecuda 530 PCIe 4.0",  price: 48000, condition: "New",  badge: "MASSIVE",      note: "4TB NVMe" }
            ],
            PSU: [
                { name: "1000W 80+ Platinum Seasonic Prime",   price: 28000, condition: "New",  badge: "RECOMMENDED", note: "RTX 4080 ready" },
                { name: "850W 80+ Gold ASUS ROG Thor",         price: 24000, condition: "New",  badge: "PREMIUM",      note: "OLED wattage meter" },
                { name: "1000W 80+ Gold EVGA SuperNOVA P6",   price: 22000, condition: "New",  badge: "BEST VALUE",   note: "Gold 1kW" }
            ],
            Case: [
                { name: "Lian Li PC-O11 Dynamic EVO",  price: 22000, condition: "New",  badge: "RECOMMENDED", note: "Showcase build" },
                { name: "Fractal Design Torrent",       price: 25000, condition: "New",  badge: "AIRFLOW KING", note: "Best thermals" },
                { name: "NZXT H9 Flow",                price: 20000, condition: "New",  badge: "BEST VALUE",   note: "Premium layout" }
            ],
            Monitor: [
                { name: "27in QHD 240Hz OLED LG UltraGear",  price: 85000, condition: "New",  badge: "RECOMMENDED", note: "OLED gaming" },
                { name: "32in 4K 144Hz IPS Monitor",          price: 75000, condition: "New",  badge: "4K BEAST",     note: "True 4K gaming" },
                { name: "27in QHD 165Hz IPS Dell S2722DGM",  price: 45000, condition: "New",  badge: "BEST VALUE",   note: "Solid 1440p" }
            ],
            Peripherals: [
                { name: "Corsair K95 RGB Platinum + M65 Ultra + HS80 Headset", price: 45000, condition: "New",  badge: "RECOMMENDED", note: "Premium set" },
                { name: "Razer BlackWidow V4 + DeathAdder V3 + Barracuda X",   price: 50000, condition: "New",  badge: "RAZER SET",    note: "Iconic combo" },
                { name: "SteelSeries Apex Pro + Prime Mini + Arctis 7P",       price: 48000, condition: "New",  badge: "STEELSERIES",  note: "Pro gaming" }
            ]
        },
        enthusiast: {
            CPU: [
                { name: "AMD Ryzen 9 9950X",           price: 170000, condition: "New",  badge: "RECOMMENDED", note: "Zen 5 flagship" },
                { name: "Intel Core Ultra 9 285K",     price: 160000, condition: "New",  badge: "INTEL FLAG",   note: "Arrow Lake king" },
                { name: "AMD Ryzen 9 7950X3D",         price: 185000, condition: "New",  badge: "GAMING+WORK",  note: "3D V-Cache beast" }
            ],
            GPU: [
                { name: "NVIDIA RTX 5080 16GB",        price: 300000, condition: "New",  badge: "RECOMMENDED", note: "Latest gen" },
                { name: "NVIDIA RTX 4090 24GB",        price: 350000, condition: "New",  badge: "PREVIOUS GEN", note: "Absolute 4K king" },
                { name: "NVIDIA RTX 4090 Used",        price: 290000, condition: "Used", badge: "USED DEAL",    note: "Save vs new 5080" }
            ],
            Motherboard: [
                { name: "ASUS ROG MAXIMUS Z790 APEX",  price:  90000, condition: "New",  badge: "RECOMMENDED", note: "Extreme OC" },
                { name: "MSI MEG Z790 GODLIKE",        price: 105000, condition: "New",  badge: "PREMIUM",      note: "Flagship board" },
                { name: "Gigabyte Z790 AORUS Master",  price:  75000, condition: "New",  badge: "BEST VALUE",   note: "Top Z790" }
            ],
            RAM: [
                { name: "64GB DDR5-6400 G.Skill Trident Z5 RGB", price: 85000, condition: "New",  badge: "RECOMMENDED", note: "High speed 64GB" },
                { name: "96GB DDR5-5600 Kingston Fury",          price: 120000, condition: "New",  badge: "MAXED OUT",    note: "96GB insanity" },
                { name: "32GB DDR5-7200 Corsair Dominator Titanium", price: 55000, condition: "New",  badge: "SPEED KING", note: "Top OC kit" }
            ],
            Storage: [
                { name: "2TB WD Black SN850X + 4TB HDD",          price:  50000, condition: "New",  badge: "RECOMMENDED", note: "Speed+bulk" },
                { name: "4TB Samsung 990 Pro PCIe 4.0",            price:  70000, condition: "New",  badge: "ALL NVMe",     note: "Pure NVMe" },
                { name: "2TB Corsair MP700 PCIe 5.0",              price:  55000, condition: "New",  badge: "PCIe 5",       note: "Next-gen speed" }
            ],
            PSU: [
                { name: "1200W 80+ Titanium Seasonic Prime",  price:  42000, condition: "New",  badge: "RECOMMENDED", note: "Titanium eff." },
                { name: "1000W 80+ Platinum ASUS ROG Thor",   price:  38000, condition: "New",  badge: "PREMIUM",      note: "With display" },
                { name: "1600W 80+ Titanium Corsair AX1600i", price:  75000, condition: "New",  badge: "EXTREME",      note: "Dual-GPU ready" }
            ],
            Case: [
                { name: "Lian Li PC-O11 Dynamic XL",  price: 35000, condition: "New",  badge: "RECOMMENDED", note: "Showcase XL" },
                { name: "Corsair 7000X RGB Full Tower",price: 40000, condition: "New",  badge: "FULL TOWER",   note: "Extreme size" },
                { name: "Thermaltake Core P8",         price: 45000, condition: "New",  badge: "OPEN FRAME",   note: "Display piece" }
            ],
            Monitor: [
                { name: "27in 4K 240Hz OLED ASUS ROG Swift",    price: 160000, condition: "New",  badge: "RECOMMENDED", note: "4K OLED" },
                { name: "32in 4K 144Hz Mini-LED Gigabyte M32U", price: 100000, condition: "New",  badge: "MINI-LED",     note: "Excellent HDR" },
                { name: "49in Ultrawide QHD 240Hz Samsung",     price: 180000, condition: "New",  badge: "ULTRAWIDE",    note: "Immersive" }
            ],
            Peripherals: [
                { name: "Wooting 60HE KB + Finalmouse Air58 + Astro A50 X Headset", price: 80000, condition: "New",  badge: "RECOMMENDED", note: "Pro peripherals" },
                { name: "Keychron Q6 Pro KB + Logitech G Pro X Superlight 2 + Sony WH-1000XM5", price: 75000, condition: "New",  badge: "PREMIUM SET", note: "Quality build" },
                { name: "ASUS ROG Strix Scope RX + Chakram X + Delta S Headset",   price: 70000, condition: "New",  badge: "ROG SET",      note: "Full ROG" }
            ]
        },
        flagship: {
            CPU: [
                { name: "AMD Threadripper PRO 7960X 24-Core",   price: 550000, condition: "New",  badge: "WORKSTATION",  note: "Workstation king" },
                { name: "Intel Core i9-14900KS Special Edition", price: 160000, condition: "New",  badge: "GAMING KING",   note: "Fastest gaming" },
                { name: "AMD Ryzen 9 9950X",                     price: 170000, condition: "New",  badge: "RECOMMENDED",  note: "Balanced flagship" }
            ],
            GPU: [
                { name: "NVIDIA RTX 5090 32GB",                  price: 600000, condition: "New",  badge: "ULTIMATE",     note: "Absolute fastest" },
                { name: "NVIDIA RTX 4090 24GB",                  price: 350000, condition: "New",  badge: "LAST GEN KING", note: "Still unbeatable" },
                { name: "NVIDIA RTX 5080 16GB",                  price: 300000, condition: "New",  badge: "RECOMMENDED",  note: "Excellent value" }
            ],
            Motherboard: [
                { name: "ASUS ROG MAXIMUS Z890 APEX",    price: 110000, condition: "New",  badge: "EXTREME OC",   note: "Z890 flagship" },
                { name: "MSI MEG Z890 GODLIKE",          price: 130000, condition: "New",  badge: "ABSOLUTE BEST", note: "Top board" },
                { name: "Gigabyte Z890 AORUS Tachyon",   price:  95000, condition: "New",  badge: "RECOMMENDED",  note: "OC champion" }
            ],
            RAM: [
                { name: "128GB DDR5-8000 G.Skill Trident Z5 RGB",  price: 250000, condition: "New",  badge: "MAXIMUM",      note: "128GB elite kit" },
                { name: "64GB DDR5-8200 Corsair Dominator Titanium",price: 120000, condition: "New",  badge: "RECOMMENDED",  note: "Insane OC RAM" },
                { name: "96GB DDR5-7200 Kingston Fury Renegade",    price: 150000, condition: "New",  badge: "BALANCED",     note: "96GB fast kit" }
            ],
            Storage: [
                { name: "4TB Samsung 990 Pro PCIe 4.0 + 8TB NAS HDD", price:  95000, condition: "New",  badge: "RECOMMENDED",  note: "Extreme storage" },
                { name: "2TB Crucial T705 PCIe 5.0 + 4TB WD Gold",    price:  80000, condition: "New",  badge: "PCIe 5 COMBO",  note: "Next-gen fast" },
                { name: "8TB Samsung 870 QVO + 2TB 990 Pro",           price: 100000, condition: "New",  badge: "STORAGE BEAST", note: "10TB total" }
            ],
            PSU: [
                { name: "1600W 80+ Titanium Corsair AX1600i",  price:  75000, condition: "New",  badge: "RECOMMENDED",  note: "No-compromise" },
                { name: "1200W 80+ Titanium Seasonic Prime TX", price:  45000, condition: "New",  badge: "BEST VALUE",   note: "Titanium eff." },
                { name: "2000W 80+ Titanium Enermax Digifanless",price:120000, condition: "New",  badge: "EXTREME",      note: "2kW monster" }
            ],
            Case: [
                { name: "Caselabs Mercury S8 Full Tower",       price: 150000, condition: "New",  badge: "ULTRA PREMIUM", note: "Modder's dream" },
                { name: "Corsair Obsidian 1000D Super Tower",   price:  90000, condition: "New",  badge: "RECOMMENDED",   note: "Dual-system ready" },
                { name: "Phanteks Enthoo Elite Full Tower",     price:  80000, condition: "New",  badge: "BEST VALUE",    note: "Premium full tower" }
            ],
            Monitor: [
                { name: "32in 4K 240Hz OLED LG C3 OLED (Gaming Setup)", price: 220000, condition: "New",  badge: "ULTRA PREMIUM", note: "TV-quality gaming" },
                { name: "27in 4K 480Hz ASUS ROG Swift Pro PG27AQDM",    price: 200000, condition: "New",  badge: "RECOMMENDED",   note: "Fastest 4K OLED" },
                { name: "57in 8K Samsung Odyssey Neo G9",                price: 400000, condition: "New",  badge: "EXTREME",       note: "Insane ultrawide" }
            ],
            Peripherals: [
                { name: "Wooting 60HE + Finalmouse Ultralight X + Sony MDR-Z1R Audiophile Headphone",price: 180000, condition: "New",  badge: "RECOMMENDED",   note: "Audiophile + pro" },
                { name: "Custom built 65% Keyboard + Logitech G Pro X Superlight 2 DEX + Focal Celestee Headphone", price: 200000, condition: "New", badge: "CUSTOM", note: "Bespoke setup" },
                { name: "ASUS ROG Azoth Extreme + ROG Harpe Ace + ROG Delta Pro Headset",             price: 120000, condition: "New",  badge: "FULL ROG",      note: "Ecosystem" }
            ]
        }
    };

    const tierData = TIERS[tier] || TIERS["budget"];

    const categories = Object.entries(tierData).map(([cat, options]) => {
        const ICONS = { CPU: "🔲", GPU: "🎮", Motherboard: "🧩", RAM: "⚡", Storage: "💾", PSU: "🔌", Case: "📦", Monitor: "🖥️", Peripherals: "🎧" };
        return { cat, icon: ICONS[cat] || "🛠️", options };
    });

    return { tier, categories };
}

// ─── RENDER RESULTS ───────────────────────────────────────────────────────────

function renderResults(blueprint) {
    const container = document.getElementById("partsContainer");
    if (!container || !blueprint?.categories) return;

    container.innerHTML = "";
    STATE.selections = {};

    blueprint.categories.forEach((category, catIdx) => {
        const section = document.createElement("div");
        section.className = "category-section";
        section.style.animationDelay = `${catIdx * 60}ms`;

        section.innerHTML = `
            <div class="cat-header">
                <span class="cat-icon">${category.icon || "🛠️"}</span>
                <span class="cat-name">${escapeHtml(category.cat)}</span>
                <span class="cat-selection-status" id="sel-status-${escapeHtml(category.cat)}">— NOT SELECTED —</span>
            </div>
            <div class="cat-options-row" id="options-${escapeHtml(category.cat)}"></div>
        `;

        const optionsRow = section.querySelector(`#options-${CSS.escape(category.cat)}`);

        (category.options || []).forEach((opt, optIdx) => {
            const card = document.createElement("div");
            card.className = "option-card";
            card.dataset.cat   = category.cat;
            card.dataset.price = opt.price;
            card.dataset.idx   = optIdx;

            const badgeClass = getBadgeClass(opt.badge);
            const condClass  = opt.condition === "Used" ? "cond-used" : opt.condition === "Refurbished" ? "cond-refurb" : "cond-new";

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

            card.addEventListener("click", () => {
                toggleSelection(category.cat, opt, card, optionsRow);
            });

            optionsRow.appendChild(card);
        });

        container.appendChild(section);
    });

    updateBuildSummary();
}

function getBadgeClass(badge) {
    if (!badge) return "";
    const b = badge.toUpperCase();
    if (b.includes("RECOMMENDED")) return "badge-rec";
    if (b.includes("BUDGET") || b.includes("ULTRA BUDGET")) return "badge-budget";
    if (b.includes("BEST VALUE")) return "badge-value";
    if (b.includes("PREMIUM") || b.includes("KING") || b.includes("ULTIMATE")) return "badge-premium";
    return "badge-default";
}

// ─── SELECTION LOGIC ─────────────────────────────────────────────────────────

function toggleSelection(cat, opt, clickedCard, optionsRow) {
    const isAlreadySelected = STATE.selections[cat] && STATE.selections[cat].name === opt.name;

    // Deselect all in this category
    optionsRow.querySelectorAll(".option-card").forEach(c => c.classList.remove("selected"));

    if (isAlreadySelected) {
        // Deselect
        delete STATE.selections[cat];
        const statusEl = document.getElementById(`sel-status-${cat}`);
        if (statusEl) statusEl.textContent = "— NOT SELECTED —";
        statusEl?.classList.remove("status-selected");
    } else {
        // Select new
        clickedCard.classList.add("selected");
        STATE.selections[cat] = { ...opt, cat };
        const statusEl = document.getElementById(`sel-status-${cat}`);
        if (statusEl) {
            statusEl.textContent = `✓ ${opt.name.length > 30 ? opt.name.slice(0, 28) + "…" : opt.name}`;
            statusEl.classList.add("status-selected");
        }
    }

    updateBuildSummary();
}

// ─── BUILD SUMMARY ────────────────────────────────────────────────────────────

function updateBuildSummary() {
    const listEl  = document.getElementById("buildSummaryList");
    const totalEl = document.getElementById("buildSummaryTotal");
    const countEl = document.getElementById("buildSummaryCount");
    if (!listEl) return;

    listEl.innerHTML = "";
    let totalPKR = 0;
    const selected = Object.values(STATE.selections);

    if (selected.length === 0) {
        listEl.innerHTML = '<div class="summary-empty">Select components to build your rig</div>';
    } else {
        selected.forEach(item => {
            totalPKR += item.price;
            const row = document.createElement("div");
            row.className = "summary-item";
            row.innerHTML = `
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
        progressEl.style.width = `${pct}%`;
        progressEl.className = "budget-bar-fill" + (pct > 100 ? " over-budget" : pct > 85 ? " near-budget" : "");
    }

    // Remaining budget
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
    const modal     = document.getElementById("invoiceModal");
    const items     = document.getElementById("invoiceItemsContainer");
    const hwTotal   = document.getElementById("invoiceHardwareTotal");
    const assembly  = document.getElementById("invoiceAssemblyFee");
    const grand     = document.getElementById("invoiceGrandTotal");
    const ts        = document.getElementById("invoiceTimestamp");

    if (!modal || !items) return;

    items.innerHTML = "";
    let totalPKR = 0;

    const selected = Object.values(STATE.selections);
    if (selected.length === 0) {
        items.innerHTML = '<div class="receipt-empty">No components selected yet.</div>';
    } else {
        selected.forEach(item => {
            totalPKR += item.price;
            const row = document.createElement("div");
            row.className = "receipt-row";
            row.innerHTML = `
                <span class="receipt-cat">${escapeHtml(item.cat)}</span>
                <span class="receipt-item" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
                <span class="receipt-price">${formatPrice(item.price)}</span>
            `;
            items.appendChild(row);
        });
    }

    const assemblyPKR = STATE.assemblyFee;
    const grandPKR    = totalPKR + assemblyPKR;

    if (hwTotal)  hwTotal.textContent  = formatPrice(totalPKR);
    if (assembly) assembly.textContent = formatPrice(assemblyPKR);
    if (grand)    grand.textContent    = formatPrice(grandPKR);

    if (ts) {
        const now = new Date();
        ts.textContent = `DATETIME: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
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
    const ctx = canvas.getContext("2d");
    const N = 45;
    let particles = [];

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener("resize", resize);
    resize();

    class P {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 1.5 + 0.5;
            this.sx = Math.random() * 0.4 - 0.2;
            this.sy = Math.random() * 0.4 - 0.2;
            this.a = Math.random() * 0.5 + 0.1;
        }
        update() {
            this.x += this.sx; this.y += this.sy;
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
        }
        draw() {
            ctx.fillStyle = `rgba(0,240,255,${this.a})`;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        }
    }

    for (let i = 0; i < N; i++) particles.push(new P());
    (function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
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
        .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function showError(msg) {
    const el = document.getElementById("budgetError");
    if (el) el.textContent = msg;
    document.querySelector(".budget-input-wrapper")?.classList.add("error-state");
}