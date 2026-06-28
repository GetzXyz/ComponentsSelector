"use strict";

var CURRENCIES = {
    PKR: { symbol: "Rs", name: "Pakistani Rupee", rate: 1 },
    USD: { symbol: "$", name: "US Dollar", rate: 0.0036 },
    EUR: { symbol: "€", name: "Euro", rate: 0.0033 },
    GBP: { symbol: "£", name: "British Pound", rate: 0.0028 },
    AED: { symbol: "د.إ", name: "UAE Dirham", rate: 0.0131 },
    SAR: { symbol: "ر.س", name: "Saudi Riyal", rate: 0.0134 },
    CAD: { symbol: "C$", name: "Canadian Dollar", rate: 0.0049 },
    AUD: { symbol: "A$", name: "Australian Dollar", rate: 0.0055 }
};

var activeCurrency = "PKR";
var STATE = {
    blueprint: null,
    selections: {},
    budgetPKR: 0,
    purpose: "gaming",
    assemblyFee: 3500,
    fpsData: null,
    peripherals: null
};

var RATE_LIMIT = { maxRequests: 5, windowMs: 60000, timestamps: [] };

function setActiveCurrency(c) { if (CURRENCIES[c]) activeCurrency = c; }
function getActiveCurrency() { return activeCurrency; }
function convertFromPKR(p) { return p * (CURRENCIES[activeCurrency] ? .rate || 1); }
function convertToPKR(a) { return Math.round(a / (CURRENCIES[activeCurrency] ? .rate || 1)); }

function formatPrice(pkr) {
    var c = CURRENCIES[activeCurrency];
    var v = convertFromPKR(pkr);
    return c.symbol + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatRaw(v) {
    var c = CURRENCIES[activeCurrency];
    return c.symbol + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

function showError(msg) {
    var el = document.getElementById("budgetError");
    if (el) el.textContent = msg;
    var w = document.getElementById("budgetWrapper");
    if (w) w.classList.add("error-state");
}

function getBudgetTier(pkr) {
    if (pkr < 80000) return "entry";
    if (pkr < 200000) return "budget";
    if (pkr < 400000) return "mid-range";
    if (pkr < 700000) return "high-end";
    if (pkr < 1200000) return "enthusiast";
    return "flagship";
}

function checkRateLimit() {
    var now = Date.now();
    RATE_LIMIT.timestamps = RATE_LIMIT.timestamps.filter(function(t) { return now - t < RATE_LIMIT.windowMs; });
    if (RATE_LIMIT.timestamps.length >= RATE_LIMIT.maxRequests) {
        var oldest = RATE_LIMIT.timestamps[0];
        var waitSec = Math.ceil((RATE_LIMIT.windowMs - (now - oldest)) / 1000);
        throw new Error("RATE_LIMITED:Too many requests. Please wait " + waitSec + " seconds before trying again.");
    }
    RATE_LIMIT.timestamps.push(now);
}

function navigateTo(id) {
    document.querySelectorAll(".view").forEach(function(v) { v.classList.remove("active"); });
    var el = document.getElementById(id);
    if (el) { el.classList.add("active");
        window.scrollTo({ top: 0, behavior: "smooth" }); }
}

function runTerminal() {
    var lines = document.querySelectorAll(".terminal-line");
    lines.forEach(function(l) { l.className = "terminal-line"; });
    lines.forEach(function(line, i) {
        var delay = parseInt(line.getAttribute("data-delay"), 10) || 0;
        setTimeout(function() {
            if (i > 0) lines[i - 1].className = "terminal-line processed-line";
            line.className = "terminal-line active-line";
        }, delay);
    });
}

function initParticles() {
    var canvas = document.getElementById("particleCanvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var pts = [];

    function resize() { canvas.width = window.innerWidth;
        canvas.height = window.innerHeight; }
    window.addEventListener("resize", resize);
    resize();

    function P() { this.reset = function() { this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 1.5 + 0.5;
            this.sx = Math.random() * 0.4 - 0.2;
            this.sy = Math.random() * 0.4 - 0.2;
            this.a = Math.random() * 0.5 + 0.1; };
        this.reset();
        this.update = function() { this.x += this.sx;
            this.y += this.sy; if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this
                .reset(); };
        this.draw = function() { ctx.fillStyle = "rgba(0,240,255," + this.a + ")";
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill(); }; }
    for (var i = 0; i < 45; i++) pts.push(new P());
    (function loop() { ctx.clearRect(0, 0, canvas.width, canvas.height);
        pts.forEach(function(p) { p.update();
            p.draw(); });
        requestAnimationFrame(loop); })();
}

function setupCursorGlow() {
    var g = document.getElementById("cursorGlow");
    if (!g) return;
    window.addEventListener("mousemove", function(e) { g.style.left = e.clientX + "px";
        g.style.top = e.clientY + "px"; });
}

function renderCurrencySelector() {
    var sel = document.getElementById("currencySelect");
    if (!sel) return;
    sel.innerHTML = "";
    Object.keys(CURRENCIES).forEach(function(code) {
        var info = CURRENCIES[code];
        var opt = document.createElement("option");
        opt.value = code;
        opt.textContent = info.symbol + " " + code;
        if (code === "PKR") opt.selected = true;
        sel.appendChild(opt);
    });
    sel.addEventListener("change", function() {
        setActiveCurrency(sel.value);
        document.getElementById("currencyIndicator").textContent = sel.value;
        updateBudgetHint();
        if (STATE.blueprint) renderResults(STATE.blueprint);
        updateBuildSummary();
        if (STATE.fpsData) renderFPS(STATE.fpsData);
        if (STATE.peripherals) renderPeripherals(STATE.peripherals);
    });
}

function updateBudgetHint() {
    var hint = document.getElementById("budgetHint");
    var cur = CURRENCIES[getActiveCurrency()];
    if (hint) hint.textContent = "Minimum: " + formatRaw(Math.round(30000 * cur.rate)) + ". Recommended: " + formatRaw(Math
        .round(80000 * cur.rate)) + "+";
}

function bindEvents() {
    document.querySelectorAll('.selectable-card input[type="radio"]').forEach(function(r) {
        r.addEventListener("change", function() {
            document.querySelectorAll(".selectable-card").forEach(function(c) { c.classList.remove("active"); });
            var parent = r.closest(".selectable-card");
            if (parent) parent.classList.add("active");
        });
    });
    var budgetInput = document.getElementById("budgetInput");
    if (budgetInput) {
        budgetInput.addEventListener("input", function() {
            document.getElementById("budgetError").textContent = "";
            var w = document.getElementById("budgetWrapper");
            if (w) w.classList.remove("error-state");
        });
    }
    document.getElementById("configForm").addEventListener("submit", handleFormSubmit);
    document.getElementById("backToConfigBtn").addEventListener("click", function() { navigateTo("onboardingView"); });
    document.getElementById("openInvoiceBtn").addEventListener("click", openInvoice);
    document.getElementById("closeInvoiceBtn").addEventListener("click", closeInvoice);
    document.getElementById("invoiceModal").addEventListener("click", function(e) {
        if (e.target === document.getElementById("invoiceModal")) closeInvoice();
    });
    document.addEventListener("keydown", function(e) { if (e.key === "Escape") closeInvoice(); });
    updateBudgetHint();
}

function getBadgeClass(b) {
    if (!b) return "";
    var u = b.toUpperCase();
    if (u.includes("RECOMMENDED")) return "badge-rec";
    if (u.includes("BUDGET") || u.includes("ULTRA BUDGET")) return "badge-budget";
    if (u.includes("BEST VALUE")) return "badge-value";
    if (u.includes("PREMIUM") || u.includes("KING") || u.includes("ULTIMATE") || u.includes("FLAGSHIP")) return "badge-premium";
    return "badge-default";
}

function toggleSelection(cat, opt, card, optRow, catId) {
    var already = STATE.selections[cat] && STATE.selections[cat].name === opt.name;
    optRow.querySelectorAll(".option-card").forEach(function(c) { c.classList.remove("selected"); });
    if (already) {
        delete STATE.selections[cat];
        var s = document.getElementById("sel-" + catId);
        if (s) { s.textContent = "— NOT SELECTED —";
            s.classList.remove("status-selected"); }
    } else {
        card.classList.add("selected");
        STATE.selections[cat] = { name: opt.name, price: opt.price, condition: opt.condition, cat: cat, badge: opt.badge,
            note: opt.note };
        var s2 = document.getElementById("sel-" + catId);
        if (s2) {
            var nm = opt.name.length > 30 ? opt.name.slice(0, 28) + "…" : opt.name;
            s2.textContent = "✓ " + nm;
            s2.classList.add("status-selected");
        }
    }
    updateBuildSummary();
}

function renderResults(blueprint) {
    var container = document.getElementById("partsContainer");
    if (!container || !blueprint || !blueprint.categories) return;
    container.innerHTML = "";
    STATE.selections = {};

    blueprint.categories.forEach(function(category, catIdx) {
        var section = document.createElement("div");
        section.className = "category-section";
        section.style.animationDelay = catIdx * 60 + "ms";
        var catId = category.cat.replace(/[^a-zA-Z0-9]/g, "_");
        var icon = (typeof category.icon === "string" && category.icon.length <= 4) ? category.icon : "🛠️";
        section.innerHTML =
            '<div class="cat-header"><span class="cat-icon">' + esc(icon) +
            '</span><span class="cat-name">' + esc(category.cat) +
            '</span><span class="cat-selection-status" id="sel-' + catId + '">— NOT SELECTED —</span></div><div class="cat-options-row" id="opts-' +
            catId + '"></div>';
        var optRow = section.querySelector("#opts-" + catId);
        (category.options || []).forEach(function(opt) {
            var card = document.createElement("div");
            card.className = "option-card";
            var bClass = getBadgeClass(opt.badge);
            var cClass = opt.condition === "Used" ? "cond-used" : opt.condition === "Refurbished" ? "cond-refurb" :
                "cond-new";
            card.innerHTML =
                '<div class="option-badge ' + bClass + '">' + esc(opt.badge || "") +
                '</div><div class="option-name">' + esc(opt.name) +
                '</div><div class="option-note">' + esc(opt.note || "") +
                '</div><div class="option-footer"><span class="option-condition ' + cClass + '">' + esc(opt
                    .condition || "New") +
                '</span><span class="option-price">' + formatPrice(opt.price) +
                '</span></div><div class="option-select-indicator">✓ SELECTED</div>';
            card.addEventListener("click", function() {
                toggleSelection(category.cat, opt, card, optRow, catId);
            });
            optRow.appendChild(card);
        });
        container.appendChild(section);
    });
    updateBuildSummary();
}

function updateBuildSummary() {
    var listEl = document.getElementById("buildSummaryList");
    var totalEl = document.getElementById("buildSummaryTotal");
    var countEl = document.getElementById("buildSummaryCount");
    if (!listEl) return;
    listEl.innerHTML = "";
    var totalPKR = 0;
    var selected = Object.values(STATE.selections);
    if (selected.length === 0) {
        listEl.innerHTML = '<div class="summary-empty">Select components to build your rig</div>';
    } else {
        selected.forEach(function(item) {
            totalPKR += item.price;
            var row = document.createElement("div");
            row.className = "summary-item";
            var nm = item.name.length > 28 ? item.name.slice(0, 26) + "…" : item.name;
            row.innerHTML =
                '<div class="summary-item-info"><span class="summary-cat">' + esc(item.cat) +
                '</span><span class="summary-name">' + esc(nm) +
                '</span></div><span class="summary-price">' + formatPrice(item.price) + '</span>';
            listEl.appendChild(row);
        });
    }
    if (totalEl) totalEl.textContent = formatPrice(totalPKR);
    if (countEl) countEl.textContent = selected.length + " component" + (selected.length !== 1 ? "s" : "");

    var prog = document.getElementById("budgetProgress");
    if (prog && STATE.budgetPKR > 0) {
        var pct = Math.min(100, (totalPKR / STATE.budgetPKR) * 100);
        prog.style.width = pct + "%";
        prog.className = "budget-bar-fill" + (pct > 100 ? " over-budget" : pct > 85 ? " near-budget" : "");
    }
    var rem = document.getElementById("budgetRemaining");
    if (rem && STATE.budgetPKR > 0) {
        var left = STATE.budgetPKR - totalPKR;
        rem.textContent = left >= 0 ? formatPrice(left) + " remaining" : formatPrice(Math.abs(left)) + " over budget";
        rem.className = "budget-remaining" + (left < 0 ? " over" : "");
    }
}

function openInvoice() {
    var modal = document.getElementById("invoiceModal");
    var items = document.getElementById("invoiceItemsContainer");
    if (!modal || !items) return;
    items.innerHTML = "";
    var totalPKR = 0;
    var selected = Object.values(STATE.selections);
    if (selected.length === 0) {
        items.innerHTML = '<div class="receipt-empty">No components selected yet.</div>';
    } else {
        selected.forEach(function(item) {
            totalPKR += item.price;
            var row = document.createElement("div");
            row.className = "receipt-row";
            row.innerHTML =
                '<span class="receipt-cat">' + esc(item.cat) +
                '</span><span class="receipt-item">' + esc(item.name) +
                '</span><span class="receipt-price">' + formatPrice(item.price) + '</span>';
            items.appendChild(row);
        });
    }
    var hw = document.getElementById("invoiceHardwareTotal");
    var af = document.getElementById("invoiceAssemblyFee");
    var gt = document.getElementById("invoiceGrandTotal");
    var ts = document.getElementById("invoiceTimestamp");
    if (hw) hw.textContent = formatPrice(totalPKR);
    if (af) af.textContent = formatPrice(STATE.assemblyFee);
    if (gt) gt.textContent = formatPrice(totalPKR + STATE.assemblyFee);
    if (ts) { ts.textContent = "DATETIME: " + new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC"; }
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeInvoice() {
    var m = document.getElementById("invoiceModal");
    if (m && m.classList.contains("active")) { m.classList.remove("active");
        document.body.style.overflow = ""; }
}

function buildFallback(budgetPKR, purpose) {
    var tier = getBudgetTier(budgetPKR);
    var TIERS = {
        entry: {
            CPU: [{ name: "Intel Core i3-12100F", price: 22000, condition: "New", badge: "RECOMMENDED",
                note: "Strong entry CPU" }, { name: "AMD Ryzen 3 3300X", price: 12000, condition: "Used",
                badge: "BUDGET PICK", note: "Good used value" }, { name: "Intel Pentium G6405",
                price: 14000, condition: "New", badge: "BEST VALUE", note: "Minimum viable" }],
            GPU: [{ name: "NVIDIA GTX 1650 4GB", price: 30000, condition: "New", badge: "RECOMMENDED",
                note: "1080p capable" }, { name: "AMD RX 580 8GB", price: 18000, condition: "Used",
                badge: "BUDGET PICK", note: "Great used value" }, { name: "NVIDIA GTX 1630 4GB",
                price: 22000, condition: "New", badge: "BEST VALUE", note: "Budget 1080p" }],
            Motherboard: [{ name: "MSI H610M PRO-E", price: 14000, condition: "New", badge: "RECOMMENDED",
                note: "Solid LGA1700" }, { name: "Gigabyte B450M DS3H", price: 10000, condition: "New",
                badge: "BUDGET PICK", note: "AMD AM4" }, { name: "ASUS PRIME H510M-E", price: 12000,
                condition: "New", badge: "BEST VALUE", note: "Simple, reliable" }],
            RAM: [{ name: "16GB DDR4 3200MHz (2x8)", price: 9500, condition: "New", badge: "RECOMMENDED",
                note: "Dual channel" }, { name: "8GB DDR4 2666MHz", price: 4500, condition: "New",
                badge: "BUDGET PICK", note: "Minimal but works" }, { name: "16GB DDR4 TeamGroup",
                price: 8500, condition: "New", badge: "BEST VALUE", note: "Good brand" }],
            Storage: [{ name: "512GB NVMe M.2 SSD", price: 7500, condition: "New", badge: "RECOMMENDED",
                note: "Fast boot drive" }, { name: "256GB SATA SSD 2.5in", price: 4500, condition: "New",
                badge: "BUDGET PICK", note: "Minimal storage" }, { name: "1TB HDD + 120GB SSD",
                price: 6500, condition: "New", badge: "BEST VALUE", note: "Combo approach" }],
            PSU: [{ name: "550W 80+ Bronze Seasonic", price: 8000, condition: "New", badge: "RECOMMENDED",
                note: "Reliable PSU" }, { name: "500W Generic 80+ PSU", price: 5500, condition: "New",
                badge: "BUDGET PICK", note: "Basic power" }, { name: "450W Corsair CX450", price: 7000,
                condition: "New", badge: "BEST VALUE", note: "Trusted brand" }],
            Case: [{ name: "Deepcool MATREXX 30", price: 4000, condition: "New", badge: "RECOMMENDED",
                note: "Good airflow" }, { name: "Basic ATX Mid Tower", price: 2500, condition: "New",
                badge: "BUDGET PICK", note: "Bare minimum" }, { name: "Antec NX200", price: 3500,
                condition: "New", badge: "BEST VALUE", note: "Decent airflow" }],
            Monitor: [{ name: "22in FHD 75Hz IPS", price: 9000, condition: "New", badge: "RECOMMENDED",
                note: "1080p entry" }, { name: "19in HD 60Hz TN", price: 5500, condition: "Used",
                badge: "BUDGET PICK", note: "Functional" }, { name: "24in FHD 60Hz VA", price: 10000,
                condition: "New", badge: "BEST VALUE", note: "Larger screen" }],
            Peripherals: [{ name: "Basic KB+Mouse Combo", price: 2000, condition: "New",
                badge: "RECOMMENDED", note: "Functional set" }, { name: "Wired Membrane KB+Mouse",
                price: 1500, condition: "New", badge: "BUDGET PICK", note: "Ultra cheap" },
            { name: "Logitech MK220 Wireless", price: 3500, condition: "New", badge: "BEST VALUE",
                note: "Wireless comfort" }]
        },
        budget: {
            CPU: [{ name: "AMD Ryzen 5 5600X", price: 32000, condition: "New", badge: "RECOMMENDED",
                note: "Top AM4 value" }, { name: "Intel Core i5-10400F", price: 20000, condition: "New",
                badge: "BUDGET PICK", note: "Solid 6-core" }, { name: "AMD Ryzen 5 5500", price: 25000,
                condition: "New", badge: "BEST VALUE", note: "Budget Zen 3" }],
            GPU: [{ name: "NVIDIA RTX 3060 12GB", price: 62000, condition: "New", badge: "RECOMMENDED",
                note: "1080p/1440p king" }, { name: "AMD RX 6600", price: 38000, condition: "Used",
                badge: "BUDGET PICK", note: "Strong used 1080p" }, { name: "NVIDIA GTX 1660 Super",
                price: 42000, condition: "New", badge: "BEST VALUE", note: "1080p workhorse" }],
            Motherboard: [{ name: "MSI B550M PRO-VDH", price: 18000, condition: "New", badge: "RECOMMENDED",
                note: "Solid B550" }, { name: "Gigabyte B450M Gaming", price: 12000, condition: "New",
                badge: "BUDGET PICK", note: "Entry AM4" }, { name: "ASUS PRIME B550M-A", price: 16000,
                condition: "New", badge: "BEST VALUE", note: "Feature-rich" }],
            RAM: [{ name: "16GB DDR4 3600MHz Corsair", price: 12000, condition: "New",
                badge: "RECOMMENDED", note: "Speed boost" }, { name: "16GB DDR4 3200MHz Generic",
                price: 9000, condition: "New", badge: "BUDGET PICK", note: "Works fine" },
            { name: "32GB DDR4 3200MHz", price: 18000, condition: "New", badge: "BEST VALUE",
                note: "Future proof" }],
            Storage: [{ name: "1TB NVMe PCIe 3.0 SSD", price: 12000, condition: "New",
                badge: "RECOMMENDED", note: "Fast & spacious" }, { name: "512GB NVMe M.2 SSD",
                price: 7500, condition: "New", badge: "BUDGET PICK", note: "Enough to start" },
            { name: "1TB Samsung 870 EVO SATA", price: 14000, condition: "New", badge: "BEST VALUE",
                note: "Reliable SATA" }],
            PSU: [{ name: "650W 80+ Gold EVGA", price: 12000, condition: "New", badge: "RECOMMENDED",
                note: "Gold efficiency" }, { name: "550W 80+ Bronze CM", price: 8000, condition: "New",
                badge: "BUDGET PICK", note: "Good basic PSU" }, { name: "600W Seasonic 80+ Bronze",
                price: 10000, condition: "New", badge: "BEST VALUE", note: "Trusted brand" }],
            Case: [{ name: "NZXT H510 Mid Tower", price: 9000, condition: "New", badge: "RECOMMENDED",
                note: "Clean build" }, { name: "Deepcool MATREXX 55", price: 6000, condition: "New",
                badge: "BUDGET PICK", note: "Great airflow" }, { name: "Fractal Focus G", price: 7500,
                condition: "New", badge: "BEST VALUE", note: "Quiet design" }],
            Monitor: [{ name: "24in FHD 144Hz IPS", price: 18000, condition: "New", badge: "RECOMMENDED",
                note: "144Hz gaming" }, { name: "24in FHD 75Hz VA", price: 12000, condition: "New",
                badge: "BUDGET PICK", note: "Good colors" }, { name: "27in FHD 144Hz", price: 22000,
                condition: "New", badge: "BEST VALUE", note: "Bigger screen" }],
            Peripherals: [{ name: "Logitech G213 KB + G203 Mouse", price: 7000, condition: "New",
                badge: "RECOMMENDED", note: "Gaming essentials" }, { name: "Redragon K552 + M711",
                price: 5000, condition: "New", badge: "BUDGET PICK", note: "Gamer value set" },
            { name: "Corsair K55 + M55", price: 8500, condition: "New", badge: "BEST VALUE",
                note: "Branded duo" }]
        },
        "mid-range": {
            CPU: [{ name: "AMD Ryzen 7 5800X3D", price: 68000, condition: "New", badge: "RECOMMENDED",
                note: "Best gaming CPU" }, { name: "Intel Core i5-13600K", price: 58000, condition: "New",
                badge: "BUDGET PICK", note: "Excellent IPC" }, { name: "AMD Ryzen 5 7600X", price: 55000,
                condition: "New", badge: "BEST VALUE", note: "AM5 future proof" }],
            GPU: [{ name: "NVIDIA RTX 3080 10GB", price: 95000, condition: "Used", badge: "RECOMMENDED",
                note: "Flagship for less" }, { name: "NVIDIA RTX 4070 12GB", price: 105000,
                condition: "New", badge: "BEST NEW", note: "Efficient Ada" }, { name: "AMD RX 6800 XT",
                price: 80000, condition: "Used", badge: "BEST VALUE", note: "Rasterization beast" }],
            Motherboard: [{ name: "MSI MAG B550 TOMAHAWK", price: 28000, condition: "New",
                badge: "RECOMMENDED", note: "Top B550" }, { name: "ASUS ROG STRIX B550-F", price: 32000,
                condition: "New", badge: "PREMIUM", note: "Feature-rich" }, { name: "Gigabyte B550 AORUS Elite",
                price: 25000, condition: "New", badge: "BEST VALUE", note: "Good VRMs" }],
            RAM: [{ name: "32GB DDR4 3600MHz Corsair", price: 22000, condition: "New",
                badge: "RECOMMENDED", note: "Gaming sweet spot" }, { name: "16GB DDR4 3600MHz G.Skill",
                price: 12000, condition: "New", badge: "BUDGET PICK", note: "Adequate" },
            { name: "32GB DDR4 3200MHz TeamGroup", price: 19000, condition: "New", badge: "BEST VALUE",
                note: "Budget 32GB" }],
            Storage: [{ name: "1TB Samsung 980 Pro NVMe PCIe4", price: 18000, condition: "New",
                badge: "RECOMMENDED", note: "Top-tier speed" }, { name: "1TB WD Black SN770 NVMe",
                price: 14000, condition: "New", badge: "BEST VALUE", note: "Fast & affordable" },
            { name: "2TB Crucial P3 Plus NVMe", price: 22000, condition: "New", badge: "SPACIOUS",
                note: "Double the space" }],
            PSU: [{ name: "750W 80+ Gold Seasonic Focus", price: 16000, condition: "New",
                badge: "RECOMMENDED", note: "For RTX 3080" }, { name: "850W 80+ Gold EVGA SuperNOVA",
                price: 19000, condition: "New", badge: "HEADROOM", note: "Future upgrades" },
            { name: "700W 80+ Bronze CM", price: 12000, condition: "New", badge: "BUDGET PICK",
                note: "Adequate" }],
            Case: [{ name: "Lian Li LANCOOL 205 MESH", price: 12000, condition: "New",
                badge: "RECOMMENDED", note: "Best airflow" }, { name: "Fractal Design Meshify C",
                price: 14000, condition: "New", badge: "SILENT", note: "Quiet & cool" },
            { name: "Corsair 4000D Airflow", price: 13000, condition: "New", badge: "BEST VALUE",
                note: "Premium airflow" }],
            Monitor: [{ name: "27in QHD 165Hz IPS", price: 38000, condition: "New", badge: "RECOMMENDED",
                note: "1440p gaming" }, { name: "24in FHD 240Hz IPS", price: 28000, condition: "New",
                badge: "HIGH REFRESH", note: "Competitive play" }, { name: "27in QHD 144Hz VA",
                price: 30000, condition: "New", badge: "BEST VALUE", note: "Great contrast" }],
            Peripherals: [{ name: "SteelSeries Apex 3 + Rival 3 + HS35", price: 18000, condition: "New",
                badge: "RECOMMENDED", note: "Full gaming set" }, { name: "Logitech G Pro KB + G502 Mouse",
                price: 20000, condition: "New", badge: "LOGITECH SET", note: "Pro gaming combo" },
            { name: "HyperX Alloy Core + Pulsefire", price: 15000, condition: "New", badge: "BEST VALUE",
                note: "Solid set" }]
        },
        "high-end": {
            CPU: [{ name: "AMD Ryzen 9 7900X", price: 105000, condition: "New", badge: "RECOMMENDED",
                note: "AM5 powerhouse" }, { name: "Intel Core i9-13900K", price: 115000, condition: "New",
                badge: "INTEL KING", note: "Top single-thread" }, { name: "AMD Ryzen 7 7700X",
                price: 80000, condition: "New", badge: "BEST VALUE", note: "8-core AM5" }],
            GPU: [{ name: "NVIDIA RTX 4080 16GB", price: 220000, condition: "New", badge: "RECOMMENDED",
                note: "4K flagship" }, { name: "NVIDIA RTX 4080", price: 180000, condition: "Used",
                badge: "USED DEAL", note: "Save vs new" }, { name: "NVIDIA RTX 4070 Ti Super",
                price: 165000, condition: "New", badge: "BEST VALUE", note: "Near 4080 perf" }],
            Motherboard: [{ name: "ASUS ROG STRIX X670E-F", price: 55000, condition: "New",
                badge: "RECOMMENDED", note: "AM5 flagship" }, { name: "MSI MEG X670E ACE", price: 65000,
                condition: "New", badge: "PREMIUM", note: "OC king" }, { name: "Gigabyte X670 AORUS Elite",
                price: 45000, condition: "New", badge: "BEST VALUE", note: "Good AM5" }],
            RAM: [{ name: "32GB DDR5-6000 G.Skill Trident Z5", price: 38000, condition: "New",
                badge: "RECOMMENDED", note: "DDR5 sweet spot" }, { name: "64GB DDR5-5600 Kingston",
                price: 60000, condition: "New", badge: "WORKSTATION", note: "Massive capacity" },
            { name: "32GB DDR5-5200 Corsair Dominator", price: 32000, condition: "New",
                badge: "BEST VALUE", note: "Reliable DDR5" }],
            Storage: [{ name: "2TB Samsung 990 Pro NVMe PCIe4", price: 32000, condition: "New",
                badge: "RECOMMENDED", note: "Flagship SSD" }, { name: "1TB WD Black SN850X + 2TB HDD",
                price: 28000, condition: "New", badge: "COMBO", note: "Speed + storage" },
            { name: "4TB Seagate Firecuda 530", price: 48000, condition: "New", badge: "MASSIVE",
                note: "4TB NVMe" }],
            PSU: [{ name: "1000W 80+ Platinum Seasonic Prime", price: 28000, condition: "New",
                badge: "RECOMMENDED", note: "RTX 4080 ready" }, { name: "850W 80+ Gold ASUS ROG Thor",
                price: 24000, condition: "New", badge: "PREMIUM", note: "OLED meter" },
            { name: "1000W 80+ Gold EVGA SuperNOVA", price: 22000, condition: "New", badge: "BEST VALUE",
                note: "Gold 1kW" }],
            Case: [{ name: "Lian Li PC-O11 Dynamic EVO", price: 22000, condition: "New",
                badge: "RECOMMENDED", note: "Showcase build" }, { name: "Fractal Design Torrent",
                price: 25000, condition: "New", badge: "AIRFLOW KING", note: "Best thermals" },
            { name: "NZXT H9 Flow", price: 20000, condition: "New", badge: "BEST VALUE",
                note: "Premium layout" }],
            Monitor: [{ name: "27in QHD 240Hz OLED LG UltraGear", price: 85000, condition: "New",
                badge: "RECOMMENDED", note: "OLED gaming" }, { name: "32in 4K 144Hz IPS", price: 75000,
                condition: "New", badge: "4K BEAST", note: "True 4K gaming" }, { name: "27in QHD 165Hz Dell S2722DGM",
                price: 45000, condition: "New", badge: "BEST VALUE", note: "Solid 1440p" }],
            Peripherals: [{ name: "Corsair K95 + M65 Ultra + HS80", price: 45000, condition: "New",
                badge: "RECOMMENDED", note: "Premium set" }, { name: "Razer BlackWidow V4 + DeathAdder V3",
                price: 50000, condition: "New", badge: "RAZER SET", note: "Iconic combo" },
            { name: "SteelSeries Apex Pro + Prime Mini", price: 48000, condition: "New",
                badge: "STEELSERIES", note: "Pro gaming" }]
        },
        enthusiast: {
            CPU: [{ name: "AMD Ryzen 9 9950X", price: 170000, condition: "New", badge: "RECOMMENDED",
                note: "Zen 5 flagship" }, { name: "Intel Core Ultra 9 285K", price: 160000,
                condition: "New", badge: "INTEL FLAG", note: "Arrow Lake king" }, { name: "AMD Ryzen 9 7950X3D",
                price: 185000, condition: "New", badge: "GAMING+WORK", note: "3D V-Cache beast" }],
            GPU: [{ name: "NVIDIA RTX 5080 16GB", price: 300000, condition: "New", badge: "RECOMMENDED",
                note: "Latest gen" }, { name: "NVIDIA RTX 4090 24GB", price: 350000, condition: "New",
                badge: "PREVIOUS GEN", note: "Absolute 4K king" }, { name: "NVIDIA RTX 4090",
                price: 290000, condition: "Used", badge: "USED DEAL", note: "Save vs new 5080" }],
            Motherboard: [{ name: "ASUS ROG MAXIMUS Z790 APEX", price: 90000, condition: "New",
                badge: "RECOMMENDED", note: "Extreme OC" }, { name: "MSI MEG Z790 GODLIKE", price: 105000,
                condition: "New", badge: "PREMIUM", note: "Flagship board" }, { name: "Gigabyte Z790 AORUS Master",
                price: 75000, condition: "New", badge: "BEST VALUE", note: "Top Z790" }],
            RAM: [{ name: "64GB DDR5-6400 G.Skill Trident Z5", price: 85000, condition: "New",
                badge: "RECOMMENDED", note: "High speed 64GB" }, { name: "96GB DDR5-5600 Kingston Fury",
                price: 120000, condition: "New", badge: "MAXED OUT", note: "96GB insanity" },
            { name: "32GB DDR5-7200 Corsair Dominator Titanium", price: 55000, condition: "New",
                badge: "SPEED KING", note: "Top OC kit" }],
            Storage: [{ name: "2TB WD Black SN850X + 4TB HDD", price: 50000, condition: "New",
                badge: "RECOMMENDED", note: "Speed+bulk" }, { name: "4TB Samsung 990 Pro PCIe4",
                price: 70000, condition: "New", badge: "ALL NVMe", note: "Pure NVMe" },
            { name: "2TB Corsair MP700 PCIe5", price: 55000, condition: "New", badge: "PCIe 5",
                note: "Next-gen speed" }],
            PSU: [{ name: "1200W 80+ Titanium Seasonic Prime", price: 42000, condition: "New",
                badge: "RECOMMENDED", note: "Titanium eff." }, { name: "1000W 80+ Platinum ASUS ROG Thor",
                price: 38000, condition: "New", badge: "PREMIUM", note: "With display" },
            { name: "1600W 80+ Titanium Corsair AX1600i", price: 75000, condition: "New",
                badge: "EXTREME", note: "Dual-GPU ready" }],
            Case: [{ name: "Lian Li PC-O11 Dynamic XL", price: 35000, condition: "New",
                badge: "RECOMMENDED", note: "Showcase XL" }, { name: "Corsair 7000X RGB Full Tower",
                price: 40000, condition: "New", badge: "FULL TOWER", note: "Extreme size" },
            { name: "Thermaltake Core P8", price: 45000, condition: "New", badge: "OPEN FRAME",
                note: "Display piece" }],
            Monitor: [{ name: "27in 4K 240Hz OLED ASUS ROG Swift", price: 160000, condition: "New",
                badge: "RECOMMENDED", note: "4K OLED" }, { name: "32in 4K 144Hz Mini-LED Gigabyte M32U",
                price: 100000, condition: "New", badge: "MINI-LED", note: "Excellent HDR" },
            { name: "49in Ultrawide QHD 240Hz Samsung", price: 180000, condition: "New",
                badge: "ULTRAWIDE", note: "Immersive" }],
            Peripherals: [{ name: "Wooting 60HE + Finalmouse Air58 + Astro A50 X", price: 80000,
                condition: "New", badge: "RECOMMENDED", note: "Pro peripherals" },
            { name: "Keychron Q6 Pro + G Pro X SL2 + Sony WH-1000XM5", price: 75000, condition: "New",
                badge: "PREMIUM SET", note: "Quality build" }, { name: "ASUS ROG Strix Scope + Chakram X + Delta S",
                price: 70000, condition: "New", badge: "ROG SET", note: "Full ROG" }]
        },
        flagship: {
            CPU: [{ name: "AMD Threadripper PRO 7960X 24-Core", price: 550000, condition: "New",
                badge: "WORKSTATION", note: "Workstation king" }, { name: "Intel Core i9-14900KS Special",
                price: 160000, condition: "New", badge: "GAMING KING", note: "Fastest gaming" },
            { name: "AMD Ryzen 9 9950X", price: 170000, condition: "New", badge: "RECOMMENDED",
                note: "Balanced flagship" }],
            GPU: [{ name: "NVIDIA RTX 5090 32GB", price: 600000, condition: "New", badge: "ULTIMATE",
                note: "Absolute fastest" }, { name: "NVIDIA RTX 4090 24GB", price: 350000,
                condition: "New", badge: "LAST GEN KING", note: "Still unbeatable" },
            { name: "NVIDIA RTX 5080 16GB", price: 300000, condition: "New", badge: "RECOMMENDED",
                note: "Excellent value" }],
            Motherboard: [{ name: "ASUS ROG MAXIMUS Z890 APEX", price: 110000, condition: "New",
                badge: "EXTREME OC", note: "Z890 flagship" }, { name: "MSI MEG Z890 GODLIKE",
                price: 130000, condition: "New", badge: "ABSOLUTE BEST", note: "Top board" },
            { name: "Gigabyte Z890 AORUS Tachyon", price: 95000, condition: "New", badge: "RECOMMENDED",
                note: "OC champion" }],
            RAM: [{ name: "128GB DDR5-8000 G.Skill Trident Z5", price: 250000, condition: "New",
                badge: "MAXIMUM", note: "128GB elite kit" }, { name: "64GB DDR5-8200 Corsair Dominator Titanium",
                price: 120000, condition: "New", badge: "RECOMMENDED", note: "Insane OC RAM" },
            { name: "96GB DDR5-7200 Kingston Fury Renegade", price: 150000, condition: "New",
                badge: "BALANCED", note: "96GB fast kit" }],
            Storage: [{ name: "4TB Samsung 990 Pro + 8TB NAS HDD", price: 95000, condition: "New",
                badge: "RECOMMENDED", note: "Extreme storage" }, { name: "2TB Crucial T705 PCIe5 + 4TB WD Gold",
                price: 80000, condition: "New", badge: "PCIe 5 COMBO", note: "Next-gen fast" },
            { name: "8TB Samsung 870 QVO + 2TB 990 Pro", price: 100000, condition: "New",
                badge: "STORAGE BEAST", note: "10TB total" }],
            PSU: [{ name: "1600W 80+ Titanium Corsair AX1600i", price: 75000, condition: "New",
                badge: "RECOMMENDED", note: "No-compromise" }, { name: "1200W 80+ Titanium Seasonic Prime TX",
                price: 45000, condition: "New", badge: "BEST VALUE", note: "Titanium eff." },
            { name: "2000W 80+ Titanium Enermax Digifanless", price: 120000, condition: "New",
                badge: "EXTREME", note: "2kW monster" }],
            Case: [{ name: "Corsair Obsidian 1000D Super Tower", price: 90000, condition: "New",
                badge: "RECOMMENDED", note: "Dual-system ready" }, { name: "Phanteks Enthoo Elite Full Tower",
                price: 80000, condition: "New", badge: "BEST VALUE", note: "Premium full tower" },
            { name: "Caselabs Mercury S8", price: 150000, condition: "New", badge: "ULTRA PREMIUM",
                note: "Modder's dream" }],
            Monitor: [{ name: "27in 4K 480Hz ASUS ROG Swift PG27AQDM", price: 200000, condition: "New",
                badge: "RECOMMENDED", note: "Fastest 4K OLED" }, { name: "32in 4K 240Hz OLED LG C3 Gaming",
                price: 220000, condition: "New", badge: "ULTRA PREMIUM", note: "TV-quality gaming" },
            { name: "57in 8K Samsung Odyssey Neo G9", price: 400000, condition: "New", badge: "EXTREME",
                note: "Insane ultrawide" }],
            Peripherals: [{ name: "Wooting 60HE + Finalmouse Ultralight X + Sony MDR-Z1R", price: 180000,
                condition: "New", badge: "RECOMMENDED", note: "Audiophile + pro" },
            { name: "Custom 65% KB + G Pro X SL2 DEX + Focal Celestee", price: 200000, condition: "New",
                badge: "CUSTOM", note: "Bespoke setup" }, { name: "ASUS ROG Azoth Extreme + Harpe Ace + Delta Pro",
                price: 120000, condition: "New", badge: "FULL ROG", note: "Ecosystem" }]
        }
    };

    var tierData = TIERS[tier] || TIERS["budget"];
    var ICONS = { CPU: "🔲", GPU: "🎮", Motherboard: "🧩", RAM: "⚡", Storage: "💾", PSU: "🔌", Case: "📦", Monitor: "🖥️",
        Peripherals: "🎧" };
    var categories = Object.keys(tierData).map(function(cat) {
        return { cat: cat, icon: ICONS[cat] || "🛠️", options: tierData[cat] };
    });
    return { tier: tier, categories: categories, _aiPowered: false };
}

function buildFPSData(selectedComponents) {
    var gpuName = "";
    var cpuName = "";
    var gpuTier = "entry";
    var cpuTier = "entry";

    Object.values(selectedComponents).forEach(function(item) {
        var n = item.name.toLowerCase();
        if (item.cat === "GPU" || item.cat === "gpu") {
            gpuName = n;
            if (n.includes("5090") || n.includes("4090") || n.includes("5080") || n.includes("4080")) gpuTier =
                "flagship";
            else if (n.includes("4070") || n.includes("3080") || n.includes("6800") || n.includes("7800"))
                gpuTier = "high-end";
            else if (n.includes("3060") || n.includes("4060") || n.includes("6600") || n.includes("6700") || n
                .includes("7600")) gpuTier = "mid-range";
            else if (n.includes("1650") || n.includes("580") || n.includes("5500")) gpuTier = "budget";
            else gpuTier = "entry";
        }
        if (item.cat === "CPU" || item.cat === "cpu") {
            cpuName = n;
            if (n.includes("9950") || n.includes("14900") || n.includes("13900") || n.includes("7950") || n
                .includes("threadripper")) cpuTier = "flagship";
            else if (n.includes("7900") || n.includes("13700") || n.includes("5800x3d") || n.includes("13600"))
                cpuTier = "high-end";
            else if (n.includes("5600") || n.includes("12400") || n.includes("7600") || n.includes("13400"))
                cpuTier = "mid-range";
            else if (n.includes("5500") || n.includes("12100") || n.includes("10400")) cpuTier = "budget";
            else cpuTier = "entry";
        }
    });

    var tierKey = gpuTier === "flagship" || cpuTier === "flagship" ? "flagship" :
        gpuTier === "high-end" || cpuTier === "high-end" ? "high-end" :
        gpuTier === "mid-range" || cpuTier === "mid-range" ? "mid-range" :
        gpuTier === "budget" || cpuTier === "budget" ? "budget" : "entry";

    var FPS_DATA = {
        flagship: {
            valorant: { name: "Valorant", _1080p: 520, _1440p: 420, _4k: 280, avg: 420, low: 320, rt: "Yes" },
            gta5: { name: "GTA V", _1080p: 190, _1440p: 160, _4k: 110, avg: 160, low: 120, rt: "No" },
            cod: { name: "Call of Duty (Latest)", _1080p: 210, _1440p: 180, _4k: 130, avg: 180, low: 140, rt: "Yes" },
            re4: { name: "Resident Evil 4 Remake", _1080p: 180, _1440p: 150, _4k: 100, avg: 150, low: 110, rt: "Yes" },
            forza5: { name: "Forza Horizon 5", _1080p: 200, _1440p: 170, _4k: 120, avg: 170, low: 130, rt: "Yes" },
            daysgone: { name: "Days Gone", _1080p: 170, _1440p: 140, _4k: 90, avg: 140, low: 100, rt: "No" },
            cyberpunk: { name: "Cyberpunk 2077", _1080p: 150, _1440p: 120, _4k: 80, avg: 120, low: 85, rt: "Yes" },
            rdr2: { name: "Red Dead Redemption 2", _1080p: 160, _1440p: 130, _4k: 85, avg: 130, low: 95, rt: "No" },
            pubg: { name: "PUBG", _1080p: 240, _1440p: 200, _4k: 140, avg: 200, low: 160, rt: "No" },
            cs2: { name: "Counter Strike 2", _1080p: 350, _1440p: 290, _4k: 200, avg: 290, low: 230, rt: "No" }
        },
        "high-end": {
            valorant: { name: "Valorant", _1080p: 400, _1440p: 320, _4k: 200, avg: 320, low: 240, rt: "Yes" },
            gta5: { name: "GTA V", _1080p: 150, _1440p: 120, _4k: 80, avg: 120, low: 90, rt: "No" },
            cod: { name: "Call of Duty (Latest)", _1080p: 160, _1440p: 130, _4k: 90, avg: 130, low: 100, rt: "Yes" },
            re4: { name: "Resident Evil 4 Remake", _1080p: 140, _1440p: 110, _4k: 70, avg: 110, low: 80, rt: "Yes" },
            forza5: { name: "Forza Horizon 5", _1080p: 160, _1440p: 130, _4k: 90, avg: 130, low: 100, rt: "Yes" },
            daysgone: { name: "Days Gone", _1080p: 130, _1440p: 100, _4k: 65, avg: 100, low: 70, rt: "No" },
            cyberpunk: { name: "Cyberpunk 2077", _1080p: 110, _1440p: 85, _4k: 55, avg: 85, low: 60, rt: "Yes" },
            rdr2: { name: "Red Dead Redemption 2", _1080p: 120, _1440p: 95, _4k: 60, avg: 95, low: 70, rt: "No" },
            pubg: { name: "PUBG", _1080p: 190, _1440p: 150, _4k: 100, avg: 150, low: 120, rt: "No" },
            cs2: { name: "Counter Strike 2", _1080p: 270, _1440p: 220, _4k: 150, avg: 220, low: 170, rt: "No" }
        },
        "mid-range": {
            valorant: { name: "Valorant", _1080p: 300, _1440p: 220, _4k: 120, avg: 220, low: 160, rt: "No" },
            gta5: { name: "GTA V", _1080p: 110, _1440p: 85, _4k: 50, avg: 85, low: 65, rt: "No" },
            cod: { name: "Call of Duty (Latest)", _1080p: 120, _1440p: 90, _4k: 55, avg: 90, low: 65, rt: "No" },
            re4: { name: "Resident Evil 4 Remake", _1080p: 100, _1440p: 75, _4k: 45, avg: 75, low: 55, rt: "No" },
            forza5: { name: "Forza Horizon 5", _1080p: 120, _1440p: 90, _4k: 55, avg: 90, low: 65, rt: "No" },
            daysgone: { name: "Days Gone", _1080p: 95, _1440p: 70, _4k: 40, avg: 70, low: 50, rt: "No" },
            cyberpunk: { name: "Cyberpunk 2077", _1080p: 80, _1440p: 55, _4k: 30, avg: 55, low: 40, rt: "No" },
            rdr2: { name: "Red Dead Redemption 2", _1080p: 85, _1440p: 60, _4k: 35, avg: 60, low: 45, rt: "No" },
            pubg: { name: "PUBG", _1080p: 140, _1440p: 100, _4k: 65, avg: 100, low: 75, rt: "No" },
            cs2: { name: "Counter Strike 2", _1080p: 200, _1440p: 150, _4k: 90, avg: 150, low: 110, rt: "No" }
        },
        budget: {
            valorant: { name: "Valorant", _1080p: 200, _1440p: 140, _4k: 80, avg: 140, low: 100, rt: "No" },
            gta5: { name: "GTA V", _1080p: 75, _1440p: 55, _4k: 30, avg: 55, low: 40, rt: "No" },
            cod: { name: "Call of Duty (Latest)", _1080p: 80, _1440p: 55, _4k: 30, avg: 55, low: 40, rt: "No" },
            re4: { name: "Resident Evil 4 Remake", _1080p: 65, _1440p: 45, _4k: 25, avg: 45, low: 30, rt: "No" },
            forza5: { name: "Forza Horizon 5", _1080p: 80, _1440p: 55, _4k: 30, avg: 55, low: 40, rt: "No" },
            daysgone: { name: "Days Gone", _1080p: 60, _1440p: 40, _4k: 20, avg: 40, low: 25, rt: "No" },
            cyberpunk: { name: "Cyberpunk 2077", _1080p: 50, _1440p: 35, _4k: 18, avg: 35, low: 22, rt: "No" },
            rdr2: { name: "Red Dead Redemption 2", _1080p: 55, _1440p: 38, _4k: 20, avg: 38, low: 25, rt: "No" },
            pubg: { name: "PUBG", _1080p: 90, _1440p: 65, _4k: 40, avg: 65, low: 45, rt: "No" },
            cs2: { name: "Counter Strike 2", _1080p: 130, _1440p: 90, _4k: 55, avg: 90, low: 65, rt: "No" }
        },
        entry: {
            valorant: { name: "Valorant", _1080p: 140, _1440p: 90, _4k: 50, avg: 90, low: 60, rt: "No" },
            gta5: { name: "GTA V", _1080p: 50, _1440p: 35, _4k: 18, avg: 35, low: 22, rt: "No" },
            cod: { name: "Call of Duty (Latest)", _1080p: 55, _1440p: 38, _4k: 20, avg: 38, low: 25, rt: "No" },
            re4: { name: "Resident Evil 4 Remake", _1080p: 45, _1440p: 30, _4k: 15, avg: 30, low: 18, rt: "No" },
            forza5: { name: "Forza Horizon 5", _1080p: 55, _1440p: 38, _4k: 20, avg: 38, low: 25, rt: "No" },
            daysgone: { name: "Days Gone", _1080p: 40, _1440p: 25, _4k: 12, avg: 25, low: 15, rt: "No" },
            cyberpunk: { name: "Cyberpunk 2077", _1080p: 35, _1440p: 22, _4k: 10, avg: 22, low: 14, rt: "No" },
            rdr2: { name: "Red Dead Redemption 2", _1080p: 38, _1440p: 25, _4k: 12, avg: 25, low: 16, rt: "No" },
            pubg: { name: "PUBG", _1080p: 60, _1440p: 40, _4k: 22, avg: 40, low: 25, rt: "No" },
            cs2: { name: "Counter Strike 2", _1080p: 90, _1440p: 60, _4k: 35, avg: 60, low: 40, rt: "No" }
        }
    };

    return FPS_DATA[tierKey] || FPS_DATA["entry"];
}

function renderFPS(fpsData) {
    var container = document.getElementById("fpsContainer");
    var body = document.getElementById("fpsBody");
    if (!container || !body) return;
    container.style.display = "block";
    body.innerHTML = "";
    var gameKeys = ["valorant", "gta5", "cod", "re4", "forza5", "daysgone", "cyberpunk", "rdr2", "pubg", "cs2"];
    gameKeys.forEach(function(key) {
        var g = fpsData[key];
        if (!g) return;
        var row = document.createElement("tr");
        row.innerHTML =
            '<td class="game-name">' + esc(g.name) +
            '</td><td class="fps-val">' + g._1080p +
            '</td><td class="fps-val">' + g._1440p +
            '</td><td class="fps-val">' + (g._4k ? g._4k : '<span class="fps-na">—</span>') +
            '</td><td class="fps-val">' + g.avg +
            '</td><td class="fps-low">' + g.low +
            '</td><td>' + (g.rt === "Yes" ? '<span class="fps-rt">✓ RT</span>' : '<span class="fps-na">—</span>') +
            '</td>';
        body.appendChild(row);
    });
}

function buildPeripherals(budgetPKR) {
    var tier = getBudgetTier(budgetPKR);
    var PERIPHERAL_DATA = {
        entry: {
            keyboard: { name: "Basic Membrane KB", price: 1200, note: "Reliable daily driver" },
            mouse: { name: "Wired Optical Mouse", price: 1000, note: "Precise tracking" },
            headphone: { name: "Basic Stereo Headset", price: 1500, note: "Clear audio & mic" }
        },
        budget: {
            keyboard: { name: "Redragon K552 Mechanical", price: 4500, note: "Tactile mechanical" },
            mouse: { name: "Logitech G203", price: 3500, note: "Gaming-grade sensor" },
            headphone: { name: "HyperX Cloud Stinger", price: 5500, note: "Comfortable gaming headset" }
        },
        "mid-range": {
            keyboard: { name: "Corsair K55 RGB", price: 8000, note: "RGB membrane with macros" },
            mouse: { name: "Logitech G502 Hero", price: 7500, note: "Legendary gaming mouse" },
            headphone: { name: "SteelSeries Arctis 5", price: 9000, note: "Surround sound" }
        },
        "high-end": {
            keyboard: { name: "ASUS ROG Strix Scope RX", price: 15000, note: "Optical-mechanical RGB" },
            mouse: { name: "Razer DeathAdder V3 Pro", price: 14000, note: "Wireless pro gaming" },
            headphone: { name: "Corsair Virtuoso RGB", price: 16000, note: "Premium wireless audio" }
        },
        enthusiast: {
            keyboard: { name: "Wooting 60HE", price: 25000, note: "Analog mechanical" },
            mouse: { name: "Finalmouse Ultralight X", price: 22000, note: "Ultra-light pro" },
            headphone: { name: "Astro A50 X", price: 28000, note: "Dolby Atmos flagship" }
        },
        flagship: {
            keyboard: { name: "Custom 65% Mechanical", price: 40000, note: "Bespoke build" },
            mouse: { name: "Finalmouse Ultralight X", price: 22000, note: "Pro-level weight" },
            headphone: { name: "Sony WH-1000XM5", price: 35000, note: "Audiophile wireless" }
        }
    };
    var data = PERIPHERAL_DATA[tier] || PERIPHERAL_DATA["budget"];
    return {
        keyboard: data.keyboard,
        mouse: data.mouse,
        headphone: data.headphone
    };
}

function renderPeripherals(periphData) {
    var container = document.getElementById("peripheralsContainer");
    var grid = document.getElementById("peripheralGrid");
    if (!container || !grid) return;
    container.style.display = "block";
    grid.innerHTML = "";
    var items = [
        { type: "Keyboard", key: "keyboard" },
        { type: "Mouse", key: "mouse" },
        { type: "Headphones", key: "headphone" }
    ];
    items.forEach(function(item) {
        var p = periphData[item.key];
        if (!p) return;
        var card = document.createElement("div");
        card.className = "peripheral-card";
        card.innerHTML =
            '<div class="p-type">' + esc(item.type) +
            '</div><div class="p-name">' + esc(p.name) +
            '</div><div class="p-note">' + esc(p.note) +
            '</div><div class="p-price">' + formatPrice(p.price) + '</div>';
        grid.appendChild(card);
    });
}

function handleFormSubmit(e) {
    e.preventDefault();

    var raw = parseFloat(document.getElementById("budgetInput").value);
    var cur = CURRENCIES[getActiveCurrency()];
    if (!Number.isFinite(raw) || raw <= 0 || raw > 100000000) {
        showError("Please enter a valid budget amount.");
        document.getElementById("budgetInput").focus();
        return;
    }
    var budgetPKR = Math.round(raw / cur.rate);
    var purpose = document.querySelector('input[name="purpose"]:checked') ? .value || "gaming";
    var minInCur = Math.round(30000 * cur.rate);

    if (raw < minInCur) {
        showError("Minimum budget is " + formatRaw(minInCur) + ".");
        document.getElementById("budgetInput").focus();
        return;
    }

    try { checkRateLimit(); } catch (err) {
        if (err.message.startsWith("RATE_LIMITED:")) {
            showError(err.message.replace("RATE_LIMITED:", ""));
            return;
        }
    }

    STATE.budgetPKR = budgetPKR;
    STATE.purpose = purpose;
    STATE.selections = {};

    var btn = document.getElementById("submitBtn");
    if (btn) btn.disabled = true;

    navigateTo("loadingView");
    runTerminal();

    var startTime = Date.now();
    var MIN_LOADING_MS = 2500;
    var usedAI = false;

    // 🔁 Use the renamed Groq endpoint
    fetch("/api/groq", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "custom",
                budgetPKR: budgetPKR,
                purpose: purpose,
                currency: getActiveCurrency(),
                prompt: buildGroqPrompt(budgetPKR, purpose, getActiveCurrency())
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.error) throw new Error(data.error);
            var parsed = data.result;
            if (typeof parsed === "string") {
                var cleaned = parsed.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/m, "").trim();
                var match = cleaned.match(/\{[\s\S]*\}/);
                if (match) parsed = JSON.parse(match[0]);
                else throw new Error("No JSON found");
            }
            if (!parsed.categories || !Array.isArray(parsed.categories) || parsed.categories.length === 0) {
                throw new Error("Invalid response format");
            }
            STATE.blueprint = parsed;
            STATE.blueprint._aiPowered = true;
            usedAI = true;
        })
        .catch(function(err) {
            console.warn("Groq error — using fallback:", err.message);
            STATE.blueprint = buildFallback(budgetPKR, purpose);
            usedAI = false;
        })
        .finally(function() {
            var elapsed = Date.now() - startTime;
            var remaining = Math.max(0, MIN_LOADING_MS - elapsed);
            setTimeout(function() {
                renderResults(STATE.blueprint);

                var fpsData = buildFPSData(STATE.selections);
                STATE.fpsData = fpsData;
                renderFPS(fpsData);

                var periphData = buildPeripherals(budgetPKR);
                STATE.peripherals = periphData;
                renderPeripherals(periphData);

                navigateTo("resultsView");

                var ind = document.getElementById("aiSourceIndicator");
                var txt = document.getElementById("aiSourceText");
                if (ind && txt) {
                    ind.style.display = "flex";
                    if (usedAI) {
                        txt.textContent = "✓ Build generated via Groq AI (Llama 3.3 70B)";
                        ind.style.borderColor = "rgba(0,230,118,.4)";
                        txt.style.color = "#00e676";
                    } else {
                        ind.innerHTML =
                            '<span style="color:#ffb700;">⚠ Using cached data — Groq not connected</span><button onclick="location.reload()" style="margin-left:12px;background:transparent;border:1px solid #ffb700;color:#ffb700;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:11px;font-family:var(--font-mono);">↺ Retry</button>';
                    }
                }
                if (btn) btn.disabled = false;
            }, remaining);
        });
}

function buildGroqPrompt(budgetPKR, purpose, currencyCode) {
    var tier = getBudgetTier(budgetPKR);
    var tierGuide = {
        entry: "Entry-level: very basic components, skip expensive peripherals",
        budget: "Budget: solid mid-entry AMD/Intel CPUs, GTX 1660/RX 6600 class GPU",
        "mid-range": "Mid-range: RTX 3060-3080/RX 6700XT, Ryzen 5 5600X / i5-12600K",
        "high-end": "High-end: RTX 3080Ti/4070-4080, Ryzen 7 5800X3D / i7-13700K",
        enthusiast: "Enthusiast: RTX 4080/5070Ti, Ryzen 9 7900X / i9-13900K",
        flagship: "Flagship: RTX 5090/4090, Ryzen 9 9950X / Threadripper"
    };

    var categoryShares = purpose === "gaming" ?
        { CPU: 0.22, GPU: 0.40, Motherboard: 0.10, RAM: 0.07, Storage: 0.06, PSU: 0.06, Case: 0.03, Monitor: 0.04,
            Peripherals: 0.02 } :
        { CPU: 0.32, GPU: 0.18, Motherboard: 0.11, RAM: 0.12, Storage: 0.10, PSU: 0.06, Case: 0.03, Monitor: 0.04,
            Peripherals: 0.04 };

    var recommendedCap = Math.round(budgetPKR * 0.93);
    var categoryBands = Object.keys(categoryShares).map(function(cat) {
        var share = categoryShares[cat];
        var target = Math.round(recommendedCap * share);
        var low = Math.round(target * 0.55);
        var high = Math.round(target * 1.15);
        return "- " + cat + ": target ≈ " + target.toLocaleString() +
            " PKR (RECOMMENDED near this; BUDGET PICK " + low.toLocaleString() + "–" + target.toLocaleString() +
            " PKR; BEST VALUE " + Math.round(target * 0.8).toLocaleString() + "–" + high.toLocaleString() + " PKR)";
    }).join("\n");

    return "You are FORGE, an expert PC hardware procurement analyst for the Pakistani retail market (Hafeez Centre Lahore, Daraz.pk, itech.com.pk, PriceOye, Paklap, Z-Tech).\n\n" +
        "BUDGET: " + budgetPKR.toLocaleString() + " PKR total\n" +
        "USE CASE: " + purpose + "\n" +
        "BUDGET TIER: " + tier + " — " + tierGuide[tier] + "\n" +
        "TOTAL RECOMMENDED CAP: " + recommendedCap.toLocaleString() + " PKR (sum of all 9 RECOMMENDED prices must not exceed this)\n\n" +
        "PER-CATEGORY PRICE ANCHORS (use these as realistic PKR ranges for THIS budget):\n" + categoryBands +
        "\n\n" +
        "PRICING DISCIPLINE:\n" +
        "- Prices must scale with the budget tier. A flagship-tier build must have flagship-tier RAM/storage/case prices, not entry-level prices reused from habit.\n" +
        "- Before writing each price, check it against the per-category anchor above.\n" +
        "- Never repeat the exact same product+price combination across different budget tiers.\n" +
        "- All prices must be realistic current PKR street prices for Pakistan — round to nearest 100 PKR.\n\n" +
        "CONSISTENCY CHECK:\n" +
        "1. Does the CPU/GPU pairing avoid bottlenecks for this tier and use case?\n" +
        "2. Does every other component's price roughly match its anchor band above?\n" +
        "3. Does the sum of all 9 RECOMMENDED prices stay at or under " + recommendedCap.toLocaleString() +
        " PKR?\n" +
        "4. Do BUDGET PICK and BEST VALUE options offer genuinely different products at sensible price gaps?\n\n" +
        "OUTPUT RULES:\n" +
        "1. Return ONLY a valid JSON object. No explanation text, no markdown fences.\n" +
        "2. Exactly 3 options per category: RECOMMENDED (New), BUDGET PICK (Used/cheaper), BEST VALUE\n" +
        "3. Include all 9 categories: CPU, GPU, Motherboard, RAM, Storage, PSU, Case, Monitor, Peripherals\n" +
        "4. For entry budgets under 80k PKR: skip expensive monitors/peripherals, maximize core hardware.\n" +
        "5. Every 'name' must be a real, currently-sold product (no placeholder/fake model numbers).\n\n" +
        "Return this EXACT JSON structure only (no markdown, no text before or after):\n" +
        '{\n  "tier": "' + tier +
        '",\n  "categories": [\n    {\n      "cat": "CPU",\n      "icon": "🔲",\n      "options": [\n        {"name": "Intel Core i5-13600K", "price": 58000, "condition": "New", "badge": "RECOMMENDED", "note": "Best gaming IPC"},\n        {"name": "AMD Ryzen 5 5600X", "price": 28000, "condition": "Used", "badge": "BUDGET PICK", "note": "Great value"},\n        {"name": "Intel Core i5-12400F", "price": 35000, "condition": "New", "badge": "BEST VALUE", "note": "F-series no iGPU"}\n      ]\n    }\n  ]\n}\n' +
        "Icons: CPU=🔲, GPU=🎮, Motherboard=🧩, RAM=⚡, Storage=💾, PSU=🔌, Case=📦, Monitor=🖥️, Peripherals=🎧";
}

function acceptTerms() {
    try { localStorage.setItem("forge_terms_accepted", "true"); } catch (e) {}
    var overlay = document.getElementById("termsOverlay");
    if (overlay) overlay.classList.add("hidden");
}

function declineTerms() {
    try { localStorage.setItem("forge_terms_accepted", "false"); } catch (e) {}
    var overlay = document.getElementById("termsOverlay");
    if (overlay) overlay.classList.add("hidden");
    document.body.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#04080f;color:#c8d8f0;font-family:sans-serif;padding:20px;text-align:center;"><div><h2 style="color:#ff3c5a;font-family:Orbitron,sans-serif;margin-bottom:12px;">ACCESS DECLINED</h2><p style="color:#7090b0;max-width:400px;margin:0 auto;line-height:1.6;">You must accept the Terms &amp; Conditions and Privacy Policy to use FORGE.</p><button onclick="location.reload()" style="margin-top:20px;padding:10px 24px;background:#00f0ff;color:#04080f;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-family:JetBrains Mono,monospace;">↻ RELOAD &amp; TRY AGAIN</button></div></div>';
}

function showTerms() {
    var overlay = document.getElementById("termsOverlay");
    if (overlay) overlay.classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", function() {
    initParticles();
    setupCursorGlow();
    renderCurrencySelector();
    bindEvents();
    updateBudgetHint();

    try {
        var accepted = localStorage.getItem("forge_terms_accepted");
        if (accepted === "true") {
            document.getElementById("termsOverlay").classList.add("hidden");
        } else {
            document.getElementById("termsOverlay").classList.remove("hidden");
        }
    } catch (e) {
        document.getElementById("termsOverlay").classList.remove("hidden");
    }
});