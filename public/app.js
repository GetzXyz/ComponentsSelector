/**
 * FORGE — AI PC BUILDER v7.4 COMPLETE FIX
 * Full Groq Integration with working receipt generation
 */

"use strict";

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
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
  "#00f0ff", "#ff0055", "#bc55ff", "#00ff88", "#ffb800",
  "#ef4444", "#3b82f6", "#10b981", "#6366f1"
];

// State
let selectedCurrency = "PKR";
let activeBuildPayload = null;

// ════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ════════════════════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 FORGE initializing...");
  
  initializeBackgroundAnimation();
  setupConsentGate();
  setupCookieBanner();
  setupCurrencySelector();
  bindFormSubmission();
  bindInvoiceModal();
  bindNavigationButtons();
  
  console.log("✅ FORGE initialization complete");
});

// ════════════════════════════════════════════════════════════════════════════
// CONSENT GATE
// ════════════════════════════════════════════════════════════════════════════

function setupConsentGate() {
  const gate = document.getElementById("termsGate");
  const privacyCheck = document.getElementById("consentPrivacy");
  const termsCheck = document.getElementById("consentTerms");
  const acceptBtn = document.getElementById("acceptTermsBtn");
  const errorMsg = document.getElementById("consentError");

  if (!gate || !acceptBtn) {
    console.error("❌ Terms gate elements not found");
    return;
  }

  const consentStored = localStorage.getItem("forge_consent_accepted");
  
  if (consentStored === "true") {
    gate.style.display = "none";
    return;
  }

  acceptBtn.addEventListener("click", (e) => {
    e.preventDefault();

    if (privacyCheck?.checked && termsCheck?.checked) {
      localStorage.setItem("forge_consent_accepted", "true");
      gate.style.display = "none";
      if (errorMsg) errorMsg.textContent = "";
    } else {
      const msg = "You must accept both Privacy Policy and Terms & Conditions";
      if (errorMsg) errorMsg.textContent = msg;
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════
// COOKIE BANNER
// ════════════════════════════════════════════════════════════════════════════

function setupCookieBanner() {
  const banner = document.getElementById("cookieBanner");
  const acceptBtn = document.getElementById("acceptCookiesBtn");
  const declineBtn = document.getElementById("declineCookiesBtn");

  if (!banner) return;

  if (!localStorage.getItem("forge_cookie_consent")) {
    banner.style.display = "flex";
  } else {
    banner.style.display = "none";
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
  let selector = document.getElementById("forgeCurrencySelector");
  
  if (!selector) {
    const wrapper = document.getElementById("currencySelectorWrapper");
    if (wrapper) {
      const options = Object.entries(REGIONAL_CURRENCY_EXCHANGE)
        .map(([code, data]) => `<option value="${code}">${code} - ${data.name}</option>`)
        .join('');
      
      wrapper.innerHTML = `
        <select id="forgeCurrencySelector" class="currency-select">
          ${options}
        </select>
      `;
      selector = document.getElementById("forgeCurrencySelector");
    }
  }

  if (!selector) return;

  const indicator = document.getElementById("currencySymbolPrefix");
  const budgetInput = document.getElementById("forgeBudgetAmountInput");

  selector.addEventListener("change", (e) => {
    selectedCurrency = e.target.value;
    const meta = REGIONAL_CURRENCY_EXCHANGE[selectedCurrency];
    
    if (indicator) indicator.textContent = meta.symbol;

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
// FORM SUBMISSION
// ════════════════════════════════════════════════════════════════════════════

function bindFormSubmission() {
  const form = document.getElementById("configForm");
  const submitBtn = document.getElementById("submitBtn");

  if (!form || !submitBtn) {
    console.error("❌ Form elements not found");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("📝 Form submitted");

    const budgetInput = document.getElementById("forgeBudgetAmountInput");
    const purposeInput = document.querySelector('input[name="purpose"]:checked');
    const preferencesInput = document.getElementById("forgePreferencesTextInput");
    const customerNameInput = document.getElementById("customerNameInput");

    const budget = budgetInput?.value || "250000";
    const usage = purposeInput?.value || "gaming";
    const preferences = preferencesInput?.value || "None";
    const customerName = customerNameInput?.value || "Valued Customer";

    console.log("📦 Build parameters:", { budget, usage, preferences, currency: selectedCurrency });

    submitBtn.classList.add("processing-state");
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ GENERATING BUILD...";

    try {
      console.log("🌐 Sending request to /api/gemini...");
      
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget: Number(budget),
          usage: usage,
          preferences: preferences,
          currency: selectedCurrency,
          customerName: customerName,
          tier: "Balanced"
        })
      });

      console.log("📡 API Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error:", response.status, errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      activeBuildPayload = await response.json();
      console.log("✅ Build received with", activeBuildPayload.components?.length, "components");

      if (activeBuildPayload.note) {
        console.warn("⚠️ Fallback note:", activeBuildPayload.note);
      }

      activeBuildPayload.customerName = customerName;

      switchView("resultsView");
      
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        renderBuildResults();
        
        const resultsContainer = document.getElementById("forgeResultsDynamicPresentationContainer");
        if (resultsContainer) {
          resultsContainer.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);

    } catch (error) {
      console.error("❌ Build generation failed:", error);
      alert(`❌ Build Generation Failed:\n\n${error.message}`);
    } finally {
      submitBtn.classList.remove("processing-state");
      submitBtn.disabled = false;
      submitBtn.textContent = "⚡ GENERATE MY BUILD";
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════
// RESULTS RENDERING - FIXED
// ════════════════════════════════════════════════════════════════════════════

function renderBuildResults() {
  if (!activeBuildPayload) {
    console.error("❌ No build payload");
    return;
  }

  console.log("🎨 Rendering build results...");

  const symbol = REGIONAL_CURRENCY_EXCHANGE[selectedCurrency].symbol;

  // Render all sections
  renderBuildSummaryPanel(symbol);
  renderComponentCards(symbol);
  renderPeripherals(symbol);
  renderGamingPerformance();
  renderBudgetAllocation();

  console.log("✅ Build rendering complete");
}

function renderBuildSummaryPanel(symbol) {
  // Calculate total price
  let totalPrice = 0;
  
  if (activeBuildPayload.components) {
    activeBuildPayload.components.forEach(c => {
      totalPrice += Number(c.price || 0);
    });
  }

  if (activeBuildPayload.peripherals) {
    Object.values(activeBuildPayload.peripherals).forEach(p => {
      if (p) totalPrice += Number(p.price || 0);
    });
  }

  // Update summary panel
  const countEl = document.getElementById("buildSummaryCount");
  const remainingEl = document.getElementById("budgetRemaining");
  const totalEl = document.getElementById("buildSummaryTotal");
  const barEl = document.getElementById("budgetProgress");
  const listEl = document.getElementById("buildSummaryList");

  if (countEl) countEl.textContent = (activeBuildPayload.components?.length || 0) + " components";
  if (remainingEl) remainingEl.textContent = `${symbol} ${totalPrice.toLocaleString()}`;
  if (totalEl) totalEl.textContent = `${symbol} ${totalPrice.toLocaleString()}`;
  if (barEl) barEl.style.width = "100%";

  // Build summary list
  if (listEl) {
    listEl.innerHTML = "";
    
    if (activeBuildPayload.components) {
      activeBuildPayload.components.forEach(comp => {
        const item = document.createElement("div");
        item.className = "summary-item";
        item.innerHTML = `
          <div class="summary-item-info">
            <div class="summary-cat">${comp.category}</div>
            <div class="summary-name">${comp.name}</div>
          </div>
          <div class="summary-price">${symbol} ${Number(comp.price || 0).toLocaleString()}</div>
        `;
        listEl.appendChild(item);
      });
    }
  }
}

function getCategoryIcon(category) {
  const icons = {
    CPU: "⚙️", GPU: "🎮", Motherboard: "🔌", RAM: "💾",
    Storage: "💿", PSU: "⚡", Cooling: "❄️", Case: "📦", Monitor: "🖥️"
  };
  return icons[category] || "📦";
}

function createComponentCard(part, symbol, category) {
  const card = document.createElement("div");
  card.className = `hardware-component-card-node ${
    category === "GPU" ? "gpu-highlight-tier" :
    category === "CPU" ? "cpu-highlight-tier" : ""
  }`;

  const conditionColor = part.condition === "used" ? "var(--gold)" : "var(--accent)";
  const conditionBg = part.condition === "used" ? "rgba(255,184,0,.15)" : "rgba(0,240,255,.15)";
  const conditionText = part.condition === "used" ? "USED" : "NEW";

  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; gap: 8px;">
      <div class="card-node-category-label" style="flex: 1;">${part.brand || "Generic"}</div>
      <span style="
        font-size: 9px;
        padding: 3px 6px;
        border-radius: 3px;
        background: ${conditionBg};
        color: ${conditionColor};
        font-weight: 700;
        text-transform: uppercase;
        white-space: nowrap;
      ">${conditionText}</span>
    </div>
    
    <div class="card-node-title-string">${part.name}</div>
    
    <div class="card-node-specifications-text">${part.spec || "Specifications available"}</div>
    
    <div class="card-node-financial-row">
      <span class="financial-row-label">PRICE</span>
      <span class="financial-row-value-string">${symbol} ${Number(part.price || 0).toLocaleString()}</span>
    </div>
  `;

  return card;
}

function renderComponentCards(symbol) {
  const container = document.getElementById("componentsDynamicGridContainer");
  if (!container) {
    console.error("❌ Components container not found");
    return;
  }

  if (!activeBuildPayload.components || activeBuildPayload.components.length === 0) {
    container.innerHTML = "<p>No components received</p>";
    return;
  }

  container.innerHTML = "";

  // Group by category
  const grouped = {};
  activeBuildPayload.components.forEach(part => {
    if (!grouped[part.category]) grouped[part.category] = [];
    grouped[part.category].push(part);
  });

  console.log("📊 Component groups:", Object.keys(grouped));

  // Render each category
  Object.entries(grouped).forEach(([category, items]) => {
    const section = document.createElement("div");
    section.className = "category-section";
    section.style.marginBottom = "32px";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.marginBottom = "16px";
    header.style.paddingBottom = "12px";
    header.style.borderBottom = "2px solid var(--border)";

    header.innerHTML = `
      <span style="font-size: 24px; margin-right: 12px;">${getCategoryIcon(category)}</span>
      <h3 style="
        font-family: var(--font-display);
        font-size: 14px;
        color: var(--accent);
        letter-spacing: 2px;
        text-transform: uppercase;
        margin: 0;
        flex: 1;
      ">${category}</h3>
      <span style="font-size: 12px; color: var(--text2); font-family: var(--font-mono);">
        ${items.length} option${items.length !== 1 ? 's' : ''}
      </span>
    `;

    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
    grid.style.gap = "12px";

    items.forEach(part => {
      grid.appendChild(createComponentCard(part, symbol, category));
    });

    section.appendChild(header);
    section.appendChild(grid);
    container.appendChild(section);
  });

  console.log("✅ Components rendered");
}

function renderPeripherals(symbol) {
  const container = document.getElementById("peripheralsDynamicGridContainer");
  if (!container) return;

  if (!activeBuildPayload.peripherals) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = "";

  const items = activeBuildPayload.peripherals;
  const targets = [
    { key: "keyboard", label: "⌨️ Keyboard" },
    { key: "mouse", label: "🖱️ Mouse" },
    { key: "headphones", label: "🎧 Headphones" }
  ];

  targets.forEach(item => {
    if (items[item.key]) {
      const data = items[item.key];
      const card = document.createElement("div");
      card.className = "hardware-component-card-node peripheral-highlight-tier";

      card.innerHTML = `
        <div class="card-node-category-label">${item.label}</div>
        <div class="card-node-title-string">${data.name}</div>
        <div class="card-node-specifications-text">${data.spec || "Specifications available"}</div>
        <div class="card-node-financial-row">
          <span class="financial-row-label">PRICE</span>
          <span class="financial-row-value-string">${symbol} ${Number(data.price || 0).toLocaleString()}</span>
        </div>
      `;
      container.appendChild(card);
    }
  });
}

function renderGamingPerformance() {
  const container = document.getElementById("gamingPerformanceTelemetryGrid");
  if (!container) return;

  if (!activeBuildPayload.gamingPerformance || activeBuildPayload.gamingPerformance.length === 0) {
    container.innerHTML = "";
    return;
  }

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

  if (!barContainer || !legendContainer) return;

  if (!activeBuildPayload.budgetAllocation) {
    barContainer.innerHTML = "";
    legendContainer.innerHTML = "";
    return;
  }

  barContainer.innerHTML = "";
  legendContainer.innerHTML = "";

  const allocations = activeBuildPayload.budgetAllocation;
  let colorIndex = 0;

  Object.entries(allocations).forEach(([key, percentage]) => {
    if (percentage > 0) {
      const color = CHART_COLORS[colorIndex % CHART_COLORS.length];

      const segment = document.createElement("div");
      segment.className = "allocation-segment-bar";
      segment.style.width = `${percentage}%`;
      segment.style.backgroundColor = color;
      segment.title = `${key}: ${percentage}%`;
      barContainer.appendChild(segment);

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

// ════════════════════════════════════════════════════════════════════════════
// INVOICE GENERATION - COMPLETE FIX
// ════════════════════════════════════════════════════════════════════════════

function bindInvoiceModal() {
  const openBtn = document.getElementById("openInvoiceBtn");
  const closeBtn = document.getElementById("closeInvoiceBtn");
  const modal = document.getElementById("invoiceModal");

  if (!openBtn || !closeBtn || !modal) {
    console.error("❌ Invoice modal elements not found");
    return;
  }

  openBtn.addEventListener("click", () => {
    console.log("📋 Opening invoice...");
    generateInvoice();
    modal.classList.add("active");
    modal.style.display = "flex";
  });

  closeBtn.addEventListener("click", () => {
    modal.classList.remove("active");
    modal.style.display = "none";
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.remove("active");
      modal.style.display = "none";
    }
  });
}

function generateInvoice() {
  if (!activeBuildPayload) {
    alert("❌ No build generated yet");
    console.error("❌ No build payload for invoice");
    return;
  }

  console.log("📝 Generating invoice...");

  const container = document.getElementById("invoiceItemsContainer");
  if (!container) {
    console.error("❌ Invoice container not found");
    return;
  }

  const symbol = REGIONAL_CURRENCY_EXCHANGE[selectedCurrency].symbol;
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const invoiceId = `FRG-${Math.floor(100000 + Math.random() * 900000)}`;

  let totalPrice = 0;
  let itemsHTML = "";

  // Components
  if (activeBuildPayload.components && Array.isArray(activeBuildPayload.components)) {
    activeBuildPayload.components.forEach(part => {
      const price = Number(part.price || 0);
      totalPrice += price;
      itemsHTML += `
        <div class="receipt-row">
          <span class="receipt-cat">${part.category || "ITEM"}</span>
          <span class="receipt-item">
            <strong>${part.name}</strong>
            <br><small>${part.spec || ""}</small>
          </span>
          <span class="receipt-price">${symbol} ${price.toLocaleString()}</span>
        </div>
      `;
    });
  }

  // Peripherals
  if (activeBuildPayload.peripherals && typeof activeBuildPayload.peripherals === 'object') {
    Object.entries(activeBuildPayload.peripherals).forEach(([key, item]) => {
      if (item && item.price) {
        const price = Number(item.price);
        totalPrice += price;
        itemsHTML += `
          <div class="receipt-row">
            <span class="receipt-cat">PERIPHERAL</span>
            <span class="receipt-item">
              <strong>${item.name}</strong>
              <br><small>${item.spec || ""}</small>
            </span>
            <span class="receipt-price">${symbol} ${price.toLocaleString()}</span>
          </div>
        `;
      }
    });
  }

  // Gaming performance
  let gamingHTML = "";
  if (activeBuildPayload.gamingPerformance && Array.isArray(activeBuildPayload.gamingPerformance)) {
    gamingHTML = `
      <div class="receipt-perf-block" style="margin-top: 16px;">
        <div class="receipt-section-title">🎮 GAMING PERFORMANCE ESTIMATES</div>
        ${activeBuildPayload.gamingPerformance.map(game => `
          <div class="receipt-perf-row">
            <span class="receipt-game">${game.title}</span>
            <span class="receipt-game-fps">${game.preset} | ${game.avg_fps} FPS | 1% Low: ${game.low1_fps}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  const tax = Math.floor(totalPrice * 0.17);
  const grandTotal = totalPrice + tax;

  container.innerHTML = `
    <div class="receipt-header">
      <h2>FORGE DIGITAL RECEIPT</h2>
      <p class="receipt-timestamp">📅 Date: ${today}</p>
      <p class="receipt-timestamp">📑 Invoice: ${invoiceId}</p>
      <p class="receipt-timestamp">👤 Customer: ${activeBuildPayload.customerName || "Guest"}</p>
      <div class="bar-separator">═══════════════════════════════════</div>
    </div>

    <div class="receipt-body">
      <div style="margin-bottom: 20px; background: rgba(0,240,255,.05); border-left: 3px solid var(--accent); padding: 12px; border-radius: 4px;">
        <strong style="color: var(--accent);">📋 BUILD SUMMARY:</strong>
        <p style="font-size: 12px; color: var(--text2); margin-top: 8px; line-height: 1.5;">
          ${activeBuildPayload.summary || "Optimized PC build configuration"}
        </p>
      </div>

      <div style="border-top: 1px solid var(--border); padding-top: 16px; margin-bottom: 20px;">
        <h3 style="font-size: 12px; color: var(--accent); font-family: var(--font-display); letter-spacing: 2px; margin-bottom: 12px; text-transform: uppercase;">COMPONENTS</h3>
        ${itemsHTML}
      </div>

      <div class="total-summary-block" style="border-top: 2px solid var(--border); padding-top: 16px; margin-top: 16px;">
        <div class="summary-line">
          <span>HARDWARE SUBTOTAL:</span>
          <span style="font-weight: 700;">${symbol} ${totalPrice.toLocaleString()}</span>
        </div>
        <div class="summary-line">
          <span>TAX (17%):</span>
          <span style="font-weight: 700;">${symbol} ${tax.toLocaleString()}</span>
        </div>
        <div class="summary-line grand-total-line" style="border-top: 1px solid var(--border); padding-top: 12px; margin-top: 12px;">
          <span style="font-size: 14px;">GRAND TOTAL:</span>
          <span style="font-size: 16px; font-weight: 900; color: var(--accent);">${symbol} ${grandTotal.toLocaleString()}</span>
        </div>
      </div>

      ${gamingHTML}

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border); text-align: center; font-size: 10px; color: var(--text2); line-height: 1.6;">
        <strong style="display: block; margin-bottom: 8px; font-family: var(--font-display); letter-spacing: 1px;">FORGE AI PC BUILDER</strong>
        Recommendations for informational purposes only<br>
        Verify all prices and availability before purchasing<br>
        © 2025 FORGE - All rights reserved
      </div>
    </div>
  `;

  // Update modal header totals
  const hardwareEl = document.getElementById("invoiceHardwareTotal");
  const taxEl = document.getElementById("invoiceAssemblyFee");
  const grandTotalEl = document.getElementById("invoiceGrandTotal");
  const timestampEl = document.getElementById("invoiceTimestamp");

  if (hardwareEl) hardwareEl.textContent = `${symbol} ${totalPrice.toLocaleString()}`;
  if (taxEl) taxEl.textContent = `${symbol} ${tax.toLocaleString()}`;
  if (grandTotalEl) grandTotalEl.textContent = `${symbol} ${grandTotal.toLocaleString()}`;
  if (timestampEl) timestampEl.textContent = `DATE: ${today} | INVOICE: ${invoiceId}`;

  console.log("✅ Invoice generated:", { totalPrice, tax, grandTotal });
}

// ════════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════════════════════════════════════════════

function bindNavigationButtons() {
  const backBtn = document.getElementById("backToConfigBtn");
  backBtn?.addEventListener("click", () => {
    console.log("🔄 Returning to config view");
    switchView("onboardingView");
  });
}

function switchView(viewId) {
  console.log("🔄 Switching to view:", viewId);
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const view = document.getElementById(viewId);
  if (view) {
    view.classList.add("active");
    console.log("✅ View switched successfully");
  } else {
    console.error("❌ View not found:", viewId);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// BACKGROUND ANIMATION
// ════════════════════════════════════════════════════════════════════════════

function initializeBackgroundAnimation() {
  const canvas = document.getElementById("ambientHardwareVisualizerMatrix");
  if (!canvas) {
    console.warn("⚠️ Canvas not found");
    return;
  }

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

  const glow = document.getElementById("cursorGlow");
  if (glow) {
    window.addEventListener("mousemove", (e) => {
      glow.style.left = `${e.clientX}px`;
      glow.style.top = `${e.clientY}px`;
    });
  }
}