/**
 * FORGE — AI PC BUILDER v7.0 PRODUCTION EDITION
 * Complete Refactor with Live Market Data, Groq Integration, Enhanced UI
 * 
 * Features:
 * - Real-time market research for component pricing
 * - Groq AI-powered build recommendations
 * - Gaming performance benchmarks
 * - Professional invoice generation
 * - Privacy & Terms consent gate
 * - Responsive mobile-first design
 */

"use strict";

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION & STATE MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

const REGIONAL_CURRENCY_EXCHANGE = {
  PKR: { symbol: "Rs", name: "Pakistani Rupee", rate: 1 },
  USD: { symbol: "$", name: "US Dollar", rate: 0.0036 },
  EUR: { symbol: "€", name: "Euro", rate: 0.0033 },
  GBP: { symbol: "£", name: "British Pound", rate: 0.0028 },
  AED: { symbol: "د.إ", name: "UAE Dirham", rate: 0.0131 },
  SAR: { symbol: "ر.س", name: "Saudi Riyal", rate: 0.0134 },
  CAD: { symbol: "C$", name: "Canadian Dollar", rate: 0.0049 },
  AUD: { symbol: "A$", name: "Australian Dollar", rate: 0.0055 },
};

const CHART_COLORS = [
  "#00f0ff", // CPU - Cyan
  "#ff0055", // GPU - Magenta
  "#bc55ff", // Motherboard - Purple
  "#00ff88", // RAM - Green
  "#ffb800", // Storage - Amber
  "#ef4444", // PSU - Red
  "#3b82f6", // Cooling - Blue
  "#10b981", // Case - Emerald
  "#6366f1"  // Monitor - Indigo
];

// State variables
let selectedCurrency = "PKR";
let activeBuildPayload = null;
let selectedComponents = {};

// ════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ════════════════════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
  initializeBackgroundAnimation();
  setupConsentGate();
  setupCookieBanner();
  setupCurrencySelector();
  bindFormSubmission();
  bindInvoiceModal();
  bindNavigationButtons();
  initializeFAQ();
});

// ════════════════════════════════════════════════════════════════════════════
// CONSENT & PRIVACY GATE
// ════════════════════════════════════════════════════════════════════════════

function setupConsentGate() {
  const gate = document.getElementById("termsGate");
  const privacyCheck = document.getElementById("consentPrivacy");
  const termsCheck = document.getElementById("consentTerms");
  const acceptBtn = document.getElementById("acceptTermsBtn");
  const errorMsg = document.getElementById("consentError");

  // Check if already accepted
  if (localStorage.getItem("forge_consent_accepted") === "true") {
    gate.style.display = "none";
    return;
  }

  acceptBtn.addEventListener("click", () => {
    if (privacyCheck.checked && termsCheck.checked) {
      localStorage.setItem("forge_consent_accepted", "true");
      gate.style.display = "none";
      errorMsg.textContent = "";
    } else {
      errorMsg.textContent = "You must accept both Privacy Policy and Terms & Conditions";
    }
  });
}

function setupCookieBanner() {
  const banner = document.getElementById("cookieBanner");
  const acceptBtn = document.getElementById("acceptCookiesBtn");
  const declineBtn = document.getElementById("declineCookiesBtn");

  if (!banner) return;

  // Show banner only if consent not given
  if (!localStorage.getItem("forge_cookie_consent")) {
    banner.style.display = "flex";
  }

  acceptBtn?.addEventListener("click", () => {
    localStorage.setItem("forge_cookie_consent", "accepted");
    banner.style.display = "none";
  });

  declineBtn?.addEventListener("click", () => {
    localStorage.setItem("forge_cookie_consent", "declined");
    banner.style.display = "none";
  });
}

// ════════════════════════════════════════════════════════════════════════════
// CURRENCY SELECTOR
// ════════════════════════════════════════════════════════════════════════════

function setupCurrencySelector() {
  const selector = document.getElementById("forgeCurrencySelector");
  const indicator = document.getElementById("currencySymbolPrefix");
  const budgetInput = document.getElementById("forgeBudgetAmountInput");

  if (!selector) {
    // Create currency selector wrapper if it doesn't exist
    const wrapper = document.getElementById("currencySelectorWrapper");
    if (wrapper) {
      wrapper.innerHTML = `
        <select id="forgeCurrencySelector" class="currency-select">
          ${Object.entries(REGIONAL_CURRENCY_EXCHANGE).map(([code, data]) => 
            `<option value="${code}">${code} - ${data.name}</option>`
          ).join('')}
        </select>
      `;
      setupCurrencySelector();
    }
    return;
  }

  selector.addEventListener("change", (e) => {
    selectedCurrency = e.target.value;
    const meta = REGIONAL_CURRENCY_EXCHANGE[selectedCurrency];
    
    if (indicator) indicator.textContent = meta.symbol;

    // Adjust budget defaults by currency
    if (budgetInput) {
      if (selectedCurrency === "PKR") {
        budgetInput.value = "250000";
        budgetInput.min = "30000";
      } else {
        budgetInput.value = "1200";
        budgetInput.min = "300";
      }
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════
// FORM SUBMISSION & API INTEGRATION
// ════════════════════════════════════════════════════════════════════════════

function bindFormSubmission() {
  const form = document.getElementById("configForm");
  const submitBtn = document.getElementById("submitBtn");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const budgetInput = document.getElementById("forgeBudgetAmountInput");
    const purposeInput = document.querySelector('input[name="purpose"]:checked');
    const preferencesInput = document.getElementById("forgePreferencesTextInput");
    const customerNameInput = document.getElementById("customerNameInput");

    const budget = budgetInput?.value || "250000";
    const usage = purposeInput?.value || "Gaming";
    const preferences = preferencesInput?.value || "None";
    const customerName = customerNameInput?.value || "Valued Customer";

    submitBtn.classList.add("processing-state");
    submitBtn.disabled = true;

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget: Number(budget),
          usage: usage,
          preferences: preferences,
          currency: selectedCurrency,
          tier: "Balanced",
          customerName: customerName
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      activeBuildPayload = await response.json();
      
      // Store customer name in payload
      activeBuildPayload.customerName = customerName;

      // Switch to results view
      switchView("resultsView");
      renderBuildResults();
      document.getElementById("forgeResultsDynamicPresentationContainer")?.scrollIntoView({ behavior: "smooth" });

    } catch (error) {
      alert(`Build Generation Failed: ${error.message}`);
      console.error("API Error:", error);
    } finally {
      submitBtn.classList.remove("processing-state");
      submitBtn.disabled = false;
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════
// RESULTS RENDERING
// ════════════════════════════════════════════════════════════════════════════

function renderBuildResults() {
  if (!activeBuildPayload) return;

  const symbol = REGIONAL_CURRENCY_EXCHANGE[selectedCurrency].symbol;

  // Render component cards
  renderComponentCards(symbol);

  // Render peripherals
  renderPeripherals(symbol);

  // Render gaming performance
  renderGamingPerformance();

  // Render budget allocation
  renderBudgetAllocation();

  // Render build summary
  renderBuildSummary(symbol);
}

function renderComponentCards(symbol) {
  const container = document.getElementById("componentsDynamicGridContainer");
  if (!container || !activeBuildPayload.components) return;

  container.innerHTML = "";

  activeBuildPayload.components.forEach(part => {
    const card = document.createElement("div");
    card.className = `hardware-component-card-node ${
      part.category === "GPU" ? "gpu-highlight-tier" :
      part.category === "CPU" ? "cpu-highlight-tier" : ""
    }`;

    card.innerHTML = `
      <div class="card-node-category-label">${part.category}</div>
      <div class="card-node-title-string">${part.name}</div>
      <div class="card-node-specifications-text">${part.spec}</div>
      <div class="card-node-financial-row">
        <span class="financial-row-label">PRICE</span>
        <span class="financial-row-value-string">${symbol} ${Number(part.price).toLocaleString()}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderPeripherals(symbol) {
  const container = document.getElementById("peripheralsDynamicGridContainer");
  if (!container || !activeBuildPayload.peripherals) return;

  container.innerHTML = "";

  const items = activeBuildPayload.peripherals;
  const targets = [
    { key: "keyboard", label: "Keyboard" },
    { key: "mouse", label: "Mouse" },
    { key: "headphones", label: "Headphones" }
  ];

  targets.forEach(item => {
    if (items[item.key]) {
      const data = items[item.key];
      const card = document.createElement("div");
      card.className = "hardware-component-card-node peripheral-highlight-tier";

      card.innerHTML = `
        <div class="card-node-category-label">${item.label}</div>
        <div class="card-node-title-string">${data.name}</div>
        <div class="card-node-specifications-text">${data.spec}</div>
        <div class="card-node-financial-row">
          <span class="financial-row-label">PRICE</span>
          <span class="financial-row-value-string">${symbol} ${Number(data.price).toLocaleString()}</span>
        </div>
      `;
      container.appendChild(card);
    }
  });
}

function renderGamingPerformance() {
  const container = document.getElementById("gamingPerformanceTelemetryGrid");
  if (!container || !activeBuildPayload.gamingPerformance) return;

  container.innerHTML = "";

  activeBuildPayload.gamingPerformance.forEach(game => {
    const card = document.createElement("div");
    card.className = "game-performance-data-strip";

    card.innerHTML = `
      <div class="game-title-text">${game.title}</div>
      <div class="game-preset-text">${game.preset} Preset</div>
      <div class="game-fps-metrics-output-row">
        <div class="fps-metric-box">
          <span class="fps-metric-label">AVG FPS</span>
          <span class="fps-metric-value-string">${game.avg_fps}</span>
        </div>
        <div class="fps-metric-box">
          <span class="fps-metric-label">1% LOW</span>
          <span class="fps-metric-value-string lows-color">${game.low1_fps}</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderBudgetAllocation() {
  const barContainer = document.getElementById("budgetAllocationVisualizationGraphBar");
  const legendContainer = document.getElementById("budgetAllocationChartLegendLabels");

  if (!barContainer || !legendContainer || !activeBuildPayload.budgetAllocation) return;

  barContainer.innerHTML = "";
  legendContainer.innerHTML = "";

  const allocations = activeBuildPayload.budgetAllocation;
  let colorIndex = 0;

  Object.entries(allocations).forEach(([key, percentage]) => {
    if (percentage > 0) {
      const color = CHART_COLORS[colorIndex % CHART_COLORS.length];

      // Bar segment
      const segment = document.createElement("div");
      segment.className = "allocation-segment-bar";
      segment.style.width = `${percentage}%`;
      segment.style.backgroundColor = color;
      segment.title = `${key}: ${percentage}%`;
      barContainer.appendChild(segment);

      // Legend item
      const legend = document.createElement("div");
      legend.className = "legend-item-node";
      legend.innerHTML = `
        <span class="legend-color-swatch-dot" style="background-color: ${color}"></span>
        <span>${key} (${percentage}%)</span>
      `;
      legendContainer.appendChild(legend);

      colorIndex++;
    }
  });
}

function renderBuildSummary(symbol) {
  const summaryText = document.getElementById("forgeOverviewSummaryTextContent");
  if (summaryText) {
    summaryText.textContent = activeBuildPayload.summary || "Build optimized for maximum performance and value.";
  }
}

// ════════════════════════════════════════════════════════════════════════════
// INVOICE GENERATION
// ════════════════════════════════════════════════════════════════════════════

function bindInvoiceModal() {
  const openBtn = document.getElementById("openInvoiceBtn");
  const closeBtn = document.getElementById("closeInvoiceBtn");
  const modal = document.getElementById("invoiceModal");

  openBtn?.addEventListener("click", () => {
    generateInvoice();
    modal.classList.add("active-state");
    modal.style.display = "flex";
  });

  closeBtn?.addEventListener("click", () => {
    modal.classList.remove("active-state");
    modal.style.display = "none";
  });

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.remove("active-state");
      modal.style.display = "none";
    }
  });
}

function generateInvoice() {
  if (!activeBuildPayload) return;

  const container = document.getElementById("invoiceItemsContainer");
  const symbol = REGIONAL_CURRENCY_EXCHANGE[selectedCurrency].symbol;
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const invoiceId = `FRG-${Math.floor(100000 + Math.random() * 900000)}`;

  let totalPrice = 0;
  let itemsHTML = "";

  // Components
  if (activeBuildPayload.components) {
    activeBuildPayload.components.forEach(part => {
      const price = Number(part.price);
      totalPrice += price;
      itemsHTML += `
        <div class="receipt-row">
          <span class="receipt-cat">${part.category}</span>
          <span class="receipt-item">${part.name}<br><small>${part.spec}</small></span>
          <span class="receipt-price">${symbol} ${price.toLocaleString()}</span>
        </div>
      `;
    });
  }

  // Peripherals
  if (activeBuildPayload.peripherals) {
    Object.entries(activeBuildPayload.peripherals).forEach(([key, item]) => {
      if (item && item.price) {
        const price = Number(item.price);
        totalPrice += price;
        itemsHTML += `
          <div class="receipt-row">
            <span class="receipt-cat">PERIPHERAL</span>
            <span class="receipt-item">${item.name}<br><small>${item.spec}</small></span>
            <span class="receipt-price">${symbol} ${price.toLocaleString()}</span>
          </div>
        `;
      }
    });
  }

  // Gaming performance section
  let gamingHTML = "";
  if (activeBuildPayload.gamingPerformance) {
    gamingHTML = `
      <div class="receipt-perf-block">
        <div class="receipt-section-title">GAMING PERFORMANCE</div>
        ${activeBuildPayload.gamingPerformance.map(game => `
          <div class="receipt-perf-row">
            <span class="receipt-game">${game.title}</span>
            <span class="receipt-game-fps">${game.preset} | ${game.avg_fps} FPS | 1% Low: ${game.low1_fps}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Compile invoice
  container.innerHTML = `
    <div class="receipt-header">
      <h2>FORGE BUILD RECEIPT</h2>
      <p class="receipt-timestamp">Date: ${today}</p>
      <p class="receipt-timestamp">Invoice: ${invoiceId}</p>
      <p class="receipt-timestamp">Customer: ${activeBuildPayload.customerName || "Guest"}</p>
      <div class="bar-separator">═══════════════════════════════</div>
    </div>

    <div class="receipt-body">
      <div style="margin-bottom: 16px;">
        <strong>Build Summary:</strong>
        <p style="font-size: 12px; color: #7090b0; margin-top: 4px;">${activeBuildPayload.summary}</p>
      </div>

      <div style="border-top: 1px solid #1a2f50; padding-top: 12px; margin-bottom: 16px;">
        ${itemsHTML}
      </div>

      <div class="total-summary-block" style="border-top: 1px solid #1a2f50; padding-top: 12px; margin-top: 12px;">
        <div class="summary-line"><span>TOTAL:</span><span>${symbol} ${totalPrice.toLocaleString()}</span></div>
        <div class="summary-line"><span>TAX (est.):</span><span>${symbol} ${Math.floor(totalPrice * 0.17).toLocaleString()}</span></div>
        <div class="summary-line grand-total-line"><span>GRAND TOTAL:</span><span>${symbol} ${Math.floor(totalPrice * 1.17).toLocaleString()}</span></div>
      </div>

      ${gamingHTML}

      <div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid #1a2f50; text-align: center; font-size: 10px; color: #7090b0;">
        FORGE AI PC BUILDER | Recommendations for informational purposes only<br>
        Verify all prices and availability before purchasing
      </div>
    </div>
  `;

  // Update modal totals
  document.getElementById("invoiceHardwareTotal").textContent = `${symbol} ${totalPrice.toLocaleString()}`;
  document.getElementById("invoiceAssemblyFee").textContent = `${symbol} 0`;
  document.getElementById("invoiceGrandTotal").textContent = `${symbol} ${Math.floor(totalPrice * 1.17).toLocaleString()}`;
  document.getElementById("invoiceTimestamp").textContent = `DATE: ${today}`;
}

// ════════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════════════════════════════════════════════

function bindNavigationButtons() {
  const backBtn = document.getElementById("backToConfigBtn");
  backBtn?.addEventListener("click", () => {
    switchView("onboardingView");
  });
}

function switchView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const view = document.getElementById(viewId);
  if (view) view.classList.add("active");
}

// ════════════════════════════════════════════════════════════════════════════
// BACKGROUND ANIMATION
// ════════════════════════════════════════════════════════════════════════════

function initializeBackgroundAnimation() {
  const canvas = document.getElementById("ambientHardwareVisualizerMatrix");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let particles = [];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 1.5 + 0.5;
      this.vx = Math.random() * 0.4 - 0.2;
      this.vy = Math.random() * 0.4 - 0.2;
      this.opacity = Math.random() * 0.5 + 0.1;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
      }
    }

    draw() {
      ctx.fillStyle = `rgba(0, 240, 255, ${this.opacity})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let i = 0; i < 60; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = "rgba(0, 240, 255, 0.015)";
    ctx.lineWidth = 0.5;
    const gridSize = 40;

    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    particles.forEach(p => {
      p.update();
      p.draw();
    });

    requestAnimationFrame(animate);
  }
  animate();

  // Cursor glow
  const glow = document.getElementById("cursorGlow");
  if (glow) {
    window.addEventListener("mousemove", (e) => {
      glow.style.left = `${e.clientX}px`;
      glow.style.top = `${e.clientY}px`;
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FAQ ACCORDION
// ════════════════════════════════════════════════════════════════════════════

function initializeFAQ() {
  document.querySelectorAll(".faq-q").forEach(question => {
    question.addEventListener("click", () => {
      const item = question.closest(".faq-item");
      const isOpen = item.classList.contains("open");

      document.querySelectorAll(".faq-item").forEach(i => {
        i.classList.remove("open");
        const toggle = i.querySelector(".toggle");
        if (toggle) toggle.textContent = "+";
      });

      if (!isOpen) {
        item.classList.add("open");
        question.querySelector(".toggle").textContent = "−";
      }
    });
  });
}