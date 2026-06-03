/**
 * FORGE — MAIN APPLICATION CONTROLLER
 * Runtime Build: 3.0.0
 *
 * Responsibilities:
 *   1. View navigation (onboarding → loading → results)
 *   2. Form validation and event binding
 *   3. Fallback hardware allocation (when Gemini is unavailable)
 *   4. DOM rendering (parts cards + AI insights panels)
 *   5. Invoice modal management
 *   6. Canvas particle system + cursor glow
 *   7. Terminal loading simulation
 *
 * Depends on: gemini.js (contactForgeIntelligenceEngine)
 */

"use strict";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PAK_TECHNICIAN_RATE = 3500; // Fixed assembly surcharge in PKR

// ─── FALLBACK COMPONENT DATABASE ─────────────────────────────────────────────
// Used when Gemini API is unavailable or the key is not configured.

const COMPONENT_DB = {
    gaming: [
        {
            threshold: 40000,
            parts: [
                { cat: "CPU",     name: "Intel Core i3-10100F",        price: 16500, icon: "🔳" },
                { cat: "GPU",     name: "AMD Radeon RX 550 4GB",        price: 14000, icon: "🎮" },
                { cat: "RAM",     name: "8GB DDR4 3200MHz Lexar",        price:  5500, icon: "⚡" },
                { cat: "Storage", name: "256GB NVMe M.2 SSD",           price:  6000, icon: "💾" }
            ]
        },
        {
            threshold: 90000,
            parts: [
                { cat: "CPU",     name: "AMD Ryzen 5 3600",             price: 24000, icon: "🔳" },
                { cat: "GPU",     name: "NVIDIA GTX 1660 Super 6GB",    price: 42000, icon: "🎮" },
                { cat: "RAM",     name: "16GB DDR4 (8×2) 3200MHz",      price: 10500, icon: "⚡" },
                { cat: "Storage", name: "512GB NVMe M.2 SSD",           price:  9500, icon: "💾" }
            ]
        },
        {
            threshold: 160000,
            parts: [
                { cat: "CPU",     name: "AMD Ryzen 5 5600X",            price: 41000, icon: "🔳" },
                { cat: "GPU",     name: "NVIDIA RTX 3060 Ti 8GB",       price: 85000, icon: "🎮" },
                { cat: "RAM",     name: "16GB DDR4 3600MHz Corsair",     price: 12000, icon: "⚡" },
                { cat: "Storage", name: "1TB NVMe PCIe 4.0 SSD",        price: 16000, icon: "💾" }
            ]
        }
    ],
    editing: [
        {
            threshold: 50000,
            parts: [
                { cat: "CPU",     name: "Intel Core i5-10400F",         price: 23000, icon: "🔳" },
                { cat: "GPU",     name: "NVIDIA GT 1030 2GB GDDR5",     price: 13500, icon: "🎮" },
                { cat: "RAM",     name: "16GB DDR4 3200MHz",             price: 10500, icon: "⚡" },
                { cat: "Storage", name: "512GB NVMe M.2 SSD",           price:  9500, icon: "💾" }
            ]
        },
        {
            threshold: 120000,
            parts: [
                { cat: "CPU",     name: "Intel Core i5-12400F",         price: 38000, icon: "🔳" },
                { cat: "GPU",     name: "NVIDIA GTX 1650 4GB",          price: 34000, icon: "🎮" },
                { cat: "RAM",     name: "32GB DDR4 (16×2) 3200MHz",     price: 21000, icon: "⚡" },
                { cat: "Storage", name: "1TB NVMe M.2 SSD",             price: 15500, icon: "💾" }
            ]
        }
    ],
    coding: [
        {
            threshold: 60000,
            parts: [
                { cat: "CPU",     name: "AMD Ryzen 5 4650G (APU)",      price: 29000, icon: "🔳" },
                { cat: "RAM",     name: "16GB DDR4 3200MHz TeamGroup",   price: 10500, icon: "⚡" },
                { cat: "Storage", name: "512GB NVMe Ultra SSD",          price:  9500, icon: "💾" },
                { cat: "Power",   name: "500W 80+ Bronze PSU",           price:  8500, icon: "🔌" }
            ]
        },
        {
            threshold: 130000,
            parts: [
                { cat: "CPU",     name: "Intel Core i7-12700F",         price: 64000, icon: "🔳" },
                { cat: "RAM",     name: "32GB DDR4 3600MHz Ripjaws",     price: 22000, icon: "⚡" },
                { cat: "Storage", name: "1TB NVMe PCIe 4.0 SSD",        price: 16500, icon: "💾" },
                { cat: "Cooler",  name: "Thermalright Assassin X 120",   price:  7500, icon: "❄️" }
            ]
        }
    ],
    office: [
        {
            threshold: 35000,
            parts: [
                { cat: "CPU",     name: "Intel Core i5-6500",           price: 11500, icon: "🔳" },
                { cat: "RAM",     name: "8GB DDR4 2666MHz Desktop",      price:  5000, icon: "⚡" },
                { cat: "Storage", name: "256GB SATA III 2.5in SSD",     price:  4800, icon: "💾" },
                { cat: "Chassis", name: "Standard Office Case + PSU",   price:  6500, icon: "📦" }
            ]
        },
        {
            threshold: 70000,
            parts: [
                { cat: "CPU",     name: "Intel Core i3-12100",          price: 26500, icon: "🔳" },
                { cat: "RAM",     name: "16GB DDR4 3200MHz Value",       price: 10500, icon: "⚡" },
                { cat: "Storage", name: "512GB NVMe M.2 SSD",           price:  9500, icon: "💾" },
                { cat: "Power",   name: "450W 80+ Efficient PSU",        price:  7000, icon: "🔌" }
            ]
        }
    ]
};

// ─── GLOBAL STATE ─────────────────────────────────────────────────────────────

let currentGlobalBlueprint = null;

// ─── BOOT ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    initializeParticleCanvas();
    setupCursorGlow();
    bindApplicationEvents();
});

// ─── 1. VIEW NAVIGATION ───────────────────────────────────────────────────────

/**
 * Switches the visible view. Uses visibility/position approach so CSS
 * opacity + transform transitions actually fire (display:none blocks them).
 * @param {string} targetViewId
 */
function navigateToView(targetViewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    const target = document.getElementById(targetViewId);
    if (target) {
        target.classList.add("active");
        window.history.replaceState({ activeView: targetViewId }, "");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

// ─── 2. EVENT BINDING ─────────────────────────────────────────────────────────

function bindApplicationEvents() {
    const configForm     = document.getElementById("configForm");
    const backBtn        = document.getElementById("backToConfigBtn");
    const openInvoiceBtn = document.getElementById("openInvoiceBtn");
    const closeInvoiceBtn= document.getElementById("closeInvoiceBtn");
    const invoiceModal   = document.getElementById("invoiceModal");
    const budgetInput    = document.getElementById("budgetInput");
    const budgetWrapper  = budgetInput?.closest(".budget-input-wrapper");

    // ── Radio card highlight sync ──────────────────────────────────────────
    // Keeps the visual .active state in sync when the user picks a card.
    document.querySelectorAll('.selectable-card input[type="radio"]').forEach(radio => {
        radio.addEventListener("change", () => {
            document.querySelectorAll(".selectable-card").forEach(card =>
                card.classList.remove("active")
            );
            radio.closest(".selectable-card")?.classList.add("active");
        });
    });

    // ── Budget live validation ──────────────────────────────────────────────
    if (budgetInput) {
        budgetInput.addEventListener("input", () => {
            clearBudgetError(budgetWrapper);
        });
    }

    // ── Form submit ────────────────────────────────────────────────────────
    if (configForm) {
        configForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const budget  = parseInt(budgetInput.value, 10);
            const purpose = document.querySelector('input[name="purpose"]:checked')?.value || "gaming";

            // Validate
            if (!budget || budget < 30000) {
                showBudgetError(budgetWrapper, "Minimum budget is 30,000 PKR.");
                budgetInput.focus();
                return;
            }
            if (budget > 5000000) {
                showBudgetError(budgetWrapper, "Maximum budget is 5,000,000 PKR.");
                budgetInput.focus();
                return;
            }

            // Disable button to prevent double-submit
            const submitBtn = document.getElementById("submitBtn");
            if (submitBtn) submitBtn.disabled = true;

            navigateToView("loadingView");
            runTerminalSimulation();

            try {
                currentGlobalBlueprint = await contactForgeIntelligenceEngine(budget, purpose);
            } catch (err) {
                console.warn("Gemini unavailable — engaging local fallback engine:", err.message);
                currentGlobalBlueprint = executeFallbackAllocation(budget, purpose);
            }

            // Wait for terminal animation to finish before revealing results
            setTimeout(() => {
                renderMatrixBlueprintUI(currentGlobalBlueprint);
                navigateToView("resultsView");
                if (submitBtn) submitBtn.disabled = false;
            }, 6200);
        });
    }

    // ── Navigation buttons ─────────────────────────────────────────────────
    backBtn?.addEventListener("click", () => navigateToView("onboardingView"));

    openInvoiceBtn?.addEventListener("click", () => toggleModalFrame(invoiceModal, true));

    closeInvoiceBtn?.addEventListener("click", () => toggleModalFrame(invoiceModal, false));

    // Close modal on backdrop click
    invoiceModal?.addEventListener("click", (e) => {
        if (e.target === invoiceModal) toggleModalFrame(invoiceModal, false);
    });

    // Close modal on Escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && invoiceModal?.classList.contains("active")) {
            toggleModalFrame(invoiceModal, false);
        }
    });
}

// ─── 3. FALLBACK ALLOCATION ENGINE ───────────────────────────────────────────

/**
 * Returns a deterministic blueprint from the local COMPONENT_DB
 * when the Gemini API is unavailable.
 * @param {number} budget
 * @param {string} purpose
 * @returns {{ parts: Array, insights: Object }}
 */
function executeFallbackAllocation(budget, purpose) {
    const dataset = COMPONENT_DB[purpose] || COMPONENT_DB["gaming"];

    // Select the highest tier whose threshold is at or below the budget
    let selectedTier = dataset[0];
    for (const tier of dataset) {
        if (budget >= tier.threshold) selectedTier = tier;
    }

    const partsArray = JSON.parse(JSON.stringify(selectedTier.parts)); // deep clone

    // Check what's already present to avoid duplicates
    const hasCategory = (cat) =>
        partsArray.some(p => p.cat.toLowerCase() === cat.toLowerCase());

    const hardwareSum  = partsArray.reduce((sum, p) => sum + p.price, 0);
    const remainder    = budget - hardwareSum - PAK_TECHNICIAN_RATE;

    if (remainder > 12000) {
        if (!hasCategory("Chassis"))
            partsArray.push({ cat: "Chassis", name: "RGB Gaming Matrix Case + 3 ARGB Fans", price: 9500, icon: "📦" });
        if (!hasCategory("Power"))
            partsArray.push({ cat: "Power",   name: "550W 80+ Rated Power Supply Unit",     price: 8000, icon: "🔌" });
    } else {
        if (!hasCategory("Chassis"))
            partsArray.push({ cat: "Chassis", name: "Standard Mid-Tower ATX Airflow Casing", price: 4500, icon: "📦" });
    }

    const purposeLabels = {
        gaming:  "gaming",
        editing: "creative work",
        coding:  "software development",
        office:  "office productivity"
    };
    const label = purposeLabels[purpose] || purpose;

    return {
        parts: partsArray,
        insights: {
            summary:     `Offline fail-safe active. Configured a solid, reliable layout emphasizing high-performance stability for a ${label} profile at ${budget.toLocaleString()} PKR.`,
            performance: `Excellent capability targeting standard workloads. Stable rendering and compute pathways across predictable benchmarks for ${label}.`,
            upgrades:    `Highly scalable infrastructure. Perfect structural baseline allowing seamless modular upgrades — drop in a higher-tier GPU or more RAM without changing the board or PSU.`
        }
    };
}

// ─── 4. DOM RENDERING ─────────────────────────────────────────────────────────

/**
 * Injects parts cards and AI insight paragraphs into the results view,
 * then pre-populates the invoice modal.
 * @param {{ parts: Array, insights: Object }} blueprintData
 */
function renderMatrixBlueprintUI(blueprintData) {
    const container = document.getElementById("partsContainer");
    if (!container) return;

    container.innerHTML = "";

    blueprintData.parts.forEach((part, index) => {
        const card = document.createElement("div");
        card.className = "component-item-card";
        card.style.animationDelay = `${index * 80}ms`;
        card.innerHTML = `
            <div class="comp-meta-core">
                <div class="comp-icon-box" aria-hidden="true">${part.icon || "🛠️"}</div>
                <div class="comp-text-details">
                    <span class="comp-category">${escapeHtml(part.cat)}</span>
                    <span class="comp-title"   title="${escapeHtml(part.name)}">${escapeHtml(part.name)}</span>
                </div>
            </div>
            <div class="comp-financial-node">
                <span class="comp-price-tag">${Number(part.price).toLocaleString()} PKR</span>
            </div>
        `;
        container.appendChild(card);
    });

    // Feed AI insight panels
    setText("aiSummaryText",     blueprintData.insights?.summary     || "—");
    setText("aiPerformanceText", blueprintData.insights?.performance || "—");
    setText("aiUpgradeText",     blueprintData.insights?.upgrades    || "—");

    // Pre-build invoice
    populateModalInvoiceReceipt(blueprintData.parts);
}

// ─── 5. INVOICE MODAL ─────────────────────────────────────────────────────────

/**
 * Populates the receipt modal with part rows and totals.
 * @param {Array} partsList
 */
function populateModalInvoiceReceipt(partsList) {
    const itemsContainer  = document.getElementById("invoiceItemsContainer");
    const hardwareTotalEl = document.getElementById("invoiceHardwareTotal");
    const assemblyFeeEl   = document.getElementById("invoiceAssemblyFee");
    const grandTotalEl    = document.getElementById("invoiceGrandTotal");
    const timestampEl     = document.getElementById("invoiceTimestamp");

    if (!itemsContainer) return;
    itemsContainer.innerHTML = "";

    let hardwareTotal = 0;

    partsList.forEach(part => {
        hardwareTotal += Number(part.price);
        const row = document.createElement("div");
        row.className = "receipt-row";
        row.innerHTML = `
            <span class="receipt-cat">${escapeHtml(part.cat)}</span>
            <span class="receipt-item" title="${escapeHtml(part.name)}">${escapeHtml(part.name)}</span>
            <span class="receipt-price">${Number(part.price).toLocaleString()} PKR</span>
        `;
        itemsContainer.appendChild(row);
    });

    const grandTotal = hardwareTotal + PAK_TECHNICIAN_RATE;

    if (hardwareTotalEl) hardwareTotalEl.textContent = `${hardwareTotal.toLocaleString()} PKR`;
    if (assemblyFeeEl)   assemblyFeeEl.textContent   = `${PAK_TECHNICIAN_RATE.toLocaleString()} PKR`;
    if (grandTotalEl)    grandTotalEl.textContent     = `${grandTotal.toLocaleString()} PKR`;

    if (timestampEl) {
        const now = new Date();
        timestampEl.textContent =
            `DATETIME: ${now.toLocaleDateString("en-PK")} ${now.toLocaleTimeString("en-PK")}`;
    }
}

/**
 * Shows or hides the invoice modal overlay.
 * @param {HTMLElement} modalElement
 * @param {boolean}     show
 */
function toggleModalFrame(modalElement, show) {
    if (!modalElement) return;
    modalElement.classList.toggle("active", show);
    // Prevent body scroll when modal is open
    document.body.style.overflow = show ? "hidden" : "";
}

// ─── 6. CANVAS PARTICLE ENGINE ────────────────────────────────────────────────

function initializeParticleCanvas() {
    const canvas = document.getElementById("particleCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const particleCount = 45;
    let particles       = [];

    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    window.addEventListener("resize", resize);
    resize();

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x      = Math.random() * canvas.width;
            this.y      = Math.random() * canvas.height;
            this.size   = Math.random() * 1.5 + 0.5;
            this.speedX = Math.random() * 0.4 - 0.2;
            this.speedY = Math.random() * 0.4 - 0.2;
            this.alpha  = Math.random() * 0.5 + 0.1;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x < 0 || this.x > canvas.width ||
                this.y < 0 || this.y > canvas.height) {
                this.reset();
            }
        }
        draw() {
            ctx.fillStyle = `rgba(0, 240, 255, ${this.alpha})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    for (let i = 0; i < particleCount; i++) particles.push(new Particle());

    (function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animate);
    })();
}

// ─── 7. CURSOR GLOW ───────────────────────────────────────────────────────────

function setupCursorGlow() {
    const glow = document.getElementById("cursorGlow");
    if (!glow) return;
    window.addEventListener("mousemove", (e) => {
        glow.style.left = `${e.clientX}px`;
        glow.style.top  = `${e.clientY}px`;
    });
}

// ─── 8. TERMINAL ANIMATION ────────────────────────────────────────────────────

/**
 * Sequentially lights up terminal lines using their data-delay attributes.
 * Each line fires its own independent setTimeout so they never block each other.
 */
function runTerminalSimulation() {
    const lines = document.querySelectorAll(".terminal-line");

    // Reset all lines first
    lines.forEach(line => {
        line.className = "terminal-line";
    });

    lines.forEach((line, index) => {
        const delay = parseInt(line.getAttribute("data-delay"), 10) || 0;

        setTimeout(() => {
            // Mark the previous line as processed
            if (index > 0) {
                lines[index - 1].className = "terminal-line processed-line";
            }
            // Activate current line
            line.className = "terminal-line active-line";
        }, delay);
    });
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────

/** Safely sets textContent on an element by ID. */
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

/** Escapes HTML special characters to prevent XSS from API-sourced strings. */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g,  "&amp;")
        .replace(/</g,  "&lt;")
        .replace(/>/g,  "&gt;")
        .replace(/"/g,  "&quot;")
        .replace(/'/g,  "&#039;");
}

/** Shows a validation error on the budget field. */
function showBudgetError(wrapper, message) {
    const errorEl = document.getElementById("budgetError");
    if (errorEl) errorEl.textContent = message;
    wrapper?.classList.add("error-state");
}

/** Clears any validation error on the budget field. */
function clearBudgetError(wrapper) {
    const errorEl = document.getElementById("budgetError");
    if (errorEl) errorEl.textContent = "";
    wrapper?.classList.remove("error-state");
}