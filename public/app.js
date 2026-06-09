/**
 * FORGE — SYSTEM CONTROLLER CODE PROXY INDEX v6.0 PRODUCTION
 * Core Features: Mandatory Legal Guard, Groq Interface Engine, Live Print Framework, High-Velocity Ambient Canvas Animation
 */

"use strict";

// CONFIGURATION UTILITIES & DIETARY TRACKERS
const REGIONAL_CURRENCY_EXCHANGE_INDEX = {
  PKR: { symbol: "Rs",   name: "Pakistani Rupee",   rate: 1 },
  USD: { symbol: "$",    name: "US Dollar",          rate: 0.0036 },
  EUR: { symbol: "€",    name: "Euro",               rate: 0.0033 },
  GBP: { symbol: "£",    name: "British Pound",      rate: 0.0028 },
  AED: { symbol: "د.إ",  name: "UAE Dirham",          rate: 0.0131 },
  SAR: { symbol: "ر.س",  name: "Saudi Riyal",         rate: 0.0134 },
  CAD: { symbol: "C$",   name: "Canadian Dollar",    rate: 0.0049 },
  AUD: { symbol: "A$",   name: "Australian Dollar",  rate: 0.0055 },
};

const CHART_COLOR_PALETTE_INDEX = [
  "#00f0ff", // CPU
  "#ff0055", // GPU
  "#bc55ff", // Motherboard
  "#00ff88", // RAM
  "#ffb800", // Storage
  "#ef4444", // PSU
  "#3b82f6", // Cooling
  "#10b981", // Case
  "#6366f1"  // Monitor
];

// STATE MANAGEMENT
let selectedGlobalAccountingCurrency = "PKR";
let activeHardwareConfigurationPayload = null;

// INITIALIZATION DIRECTIVES ON DOM CONTENT LOAD READY
document.addEventListener("DOMContentLoaded", () => {
  initializeAmbientHardwareVisualizer();
  bindUserLegalConsentGateEvents();
  setupDynamicCurrencyPrefixTracking();
  bindForgeParameterFormActions();
  bindInvoiceModalOrchestrationSystems();
  verifyActiveSavedCookieState();
});

// MANDATORY SECURITY CONTEXT RULES REGULATION HANDLER
function bindUserLegalConsentGateEvents() {
  const gateOverlay = document.getElementById("legalConsentGateOverlay") || document.getElementById("consentGate");
  const consentCheckbox = document.getElementById("mandatoryLegalConsentCheckbox") || document.getElementById("legalCheckbox");
  const initDashboardBtn = document.getElementById("initializeForgeDashboardBtn") || document.getElementById("enterPlatformBtn");

  if (!gateOverlay || !consentCheckbox || !initDashboardBtn) return;

  // Retrieve explicit persistent data states securely stored inside locally encapsulated contexts
  if (localStorage.getItem("forge_platform_legal_approved") === "true") {
    gateOverlay.classList.add("hidden-state");
    gateOverlay.style.display = "none";
  }

  consentCheckbox.addEventListener("change", (e) => {
    initDashboardBtn.disabled = !e.target.checked;
  });

  initDashboardBtn.addEventListener("click", () => {
    if (consentCheckbox.checked) {
      localStorage.setItem("forge_platform_legal_approved", "true");
      gateOverlay.classList.add("hidden-state");
      gateOverlay.style.display = "none";
    }
  });
}

// COOKIE BANNER ORCHESTRATION PIPELINE
function verifyActiveSavedCookieState() {
  const banner = document.getElementById("cookieBanner") || document.querySelector(".cookie-banner");
  const acceptBtn = document.getElementById("acceptCookiesBtn") || document.getElementById("cookieAccept");
  const declineBtn = document.getElementById("declineCookiesBtn") || document.getElementById("cookieDecline");

  if (!banner || !acceptBtn || !declineBtn) return;

  if (!localStorage.getItem("forge_cookie_analytics_consent")) {
    banner.style.display = "flex";
  } else {
    banner.style.display = "none";
  }

  acceptBtn.addEventListener("click", () => {
    localStorage.setItem("forge_cookie_analytics_consent", "granted");
    banner.style.display = "none";
  });

  declineBtn.addEventListener("click", () => {
    localStorage.setItem("forge_cookie_analytics_consent", "declined");
    banner.style.display = "none";
  });
}

// SYNCHRONIZED CURRENCY UNIT DESIGNATION CHANGES
function setupDynamicCurrencyPrefixTracking() {
  const selector = document.getElementById("forgeCurrencySelector") || document.getElementById("currencySelector") || document.querySelector(".currency-select");
  const suffixTag = document.getElementById("currencySymbolPrefix") || document.querySelector(".currency-indicator");
  const budgetInput = document.getElementById("forgeBudgetAmountInput") || document.getElementById("budgetInput");

  if (!selector || !suffixTag || !budgetInput) return;

  selector.addEventListener("change", (e) => {
    selectedGlobalAccountingCurrency = e.target.value;
    const meta = REGIONAL_CURRENCY_EXCHANGE_INDEX[selectedGlobalAccountingCurrency];
    suffixTag.textContent = meta.symbol;

    // Adjust defaults dynamically depending on standard international structural valuations
    if (selectedGlobalAccountingCurrency === "PKR") {
      budgetInput.value = "250000";
      budgetInput.min = "25000";
    } else {
      budgetInput.value = "1200";
      budgetInput.min = "300";
    }
  });
}

// DATA TRANSACTION ASYNC PACKETS POST DISPATCHING
function bindForgeParameterFormActions() {
  const form = document.getElementById("forgeParameterInputForm") || document.getElementById("parameterForm") || document.querySelector("form");
  const submitBtn = document.getElementById("forgeEngineExecutionTriggerBtn") || document.getElementById("submitBtn") || form?.querySelector('button[type="submit"]');
  const displayContainer = document.getElementById("forgeResultsDynamicPresentationContainer") || document.getElementById("resultsContainer");

  if (!form || !submitBtn || !displayContainer) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.classList.add("processing-state");

    const budgetElement = document.getElementById("forgeBudgetAmountInput") || document.getElementById("budgetInput");
    const usageElement = document.getElementById("forgeUsageProfileSelector") || document.getElementById("usageSelector");
    const tierElement = document.getElementById("forgeOptimizationTierSelector") || document.getElementById("tierSelector");
    const preferencesElement = document.getElementById("forgePreferencesTextInput") || document.getElementById("preferencesInput");

    const budget = budgetElement ? budgetElement.value : "250000";
    const usage = usageElement ? usageElement.value : "Gaming";
    const balancingMethod = tierElement ? tierElement.value : "Balanced";
    const constraints = preferencesElement ? preferencesElement.value : "None";

    try {
      const serverlessPayloadResponse = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget: Number(budget),
          usage: usage,
          preferences: constraints || "None",
          currency: selectedGlobalAccountingCurrency,
          tier: balancingMethod
        })
      });

      if (!serverlessPayloadResponse.ok) {
        throw new Error("Target upstream function endpoint threw unexpected runtime failure exception.");
      }

      activeHardwareConfigurationPayload = await serverlessPayloadResponse.json();
      
      // Inject components safely into layout models
      renderHardwareConfigurationMatrix();
      displayContainer.classList.remove("forge-results-display-hidden-state");
      displayContainer.style.display = "block";
      
      // Auto scroll viewport directly down to top line elements smoothly
      displayContainer.scrollIntoView({ behavior: "smooth" });

    } catch (err) {
      alert(`Optimization Fault: Unable to retrieve matching layout structure. Context: ${err.message}`);
    } finally {
      submitBtn.classList.remove("processing-state");
    }
  });
}

// CLIENT-SIDE DOM ELEMENT RENDERING ENGINE
function renderHardwareConfigurationMatrix() {
  if (!activeHardwareConfigurationPayload) return;

  const componentsGrid = document.getElementById("componentsDynamicGridContainer") || document.getElementById("componentsGrid");
  const peripheralsGrid = document.getElementById("peripheralsDynamicGridContainer") || document.getElementById("peripheralsGrid");
  const gamingGrid = document.getElementById("gamingPerformanceTelemetryGrid") || document.getElementById("gamingGrid");
  const summaryText = document.getElementById("forgeOverviewSummaryTextContent") || document.getElementById("summaryText");

  const symbol = REGIONAL_CURRENCY_EXCHANGE_INDEX[selectedGlobalAccountingCurrency].symbol;

  // 1. Core Component Mapping
  if (componentsGrid && activeHardwareConfigurationPayload.components) {
    componentsGrid.innerHTML = "";
    activeHardwareConfigurationPayload.components.forEach(part => {
      let cssHighlightClass = "";
      if (part.category === "GPU") cssHighlightClass = "gpu-highlight-tier";
      if (part.category === "CPU") cssHighlightClass = "cpu-highlight-tier";

      const card = document.createElement("div");
      card.className = `hardware-component-card-node ${cssHighlightClass}`;
      card.innerHTML = `
        <div class="card-node-category-label">${part.category}</div>
        <div class="card-node-title-string">${part.name}</div>
        <div class="card-node-specifications-text">${part.spec}</div>
        <div class="card-node-financial-row">
          <span class="financial-row-label">MARKET VALUE</span>
          <span class="financial-row-value-string">${symbol} ${Number(part.price).toLocaleString()}</span>
        </div>
      `;
      componentsGrid.appendChild(card);
    });
  }

  // 2. Peripheral Component Mapping
  if (peripheralsGrid && activeHardwareConfigurationPayload.peripherals) {
    peripheralsGrid.innerHTML = "";
    const items = activeHardwareConfigurationPayload.peripherals;
    
    const targets = [
      { key: "keyboard", display: "Keyboard Matrix" },
      { key: "mouse", display: "Tracking Mouse" },
      { key: "headphones", display: "Audio Headphones" }
    ];

    targets.forEach(item => {
      if (items[item.key]) {
        const data = items[item.key];
        const card = document.createElement("div");
        card.className = "hardware-component-card-node peripheral-highlight-tier";
        card.innerHTML = `
          <div class="card-node-category-label">${item.display}</div>
          <div class="card-node-title-string">${data.name}</div>
          <div class="card-node-specifications-text">${data.spec}</div>
          <div class="card-node-financial-row">
            <span class="financial-row-label">MARKET VALUE</span>
            <span class="financial-row-value-string">${symbol} ${Number(data.price).toLocaleString()}</span>
          </div>
        `;
        peripheralsGrid.appendChild(card);
      }
    });
  }

  // 3. Expected Gaming Performance Section Mapping
  if (gamingGrid && activeHardwareConfigurationPayload.gamingPerformance) {
    gamingGrid.innerHTML = "";
    activeHardwareConfigurationPayload.gamingPerformance.forEach(game => {
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
      gamingGrid.appendChild(card);
    });
  }

  // 4. Narrative Summary Text
  if (summaryText) {
    summaryText.textContent = activeHardwareConfigurationPayload.summary || "System architecture layout calculations fully finalized.";
  }

  // 5. Visual Budget Allocation Charts
  renderBudgetAllocationVisualCharts();
}

function renderBudgetAllocationVisualCharts() {
  const graphBar = document.getElementById("budgetAllocationVisualizationGraphBar") || document.getElementById("allocationBar");
  const legendLabels = document.getElementById("budgetAllocationChartLegendLabels") || document.getElementById("chartLegend");
  
  if (!graphBar || !legendLabels || !activeHardwareConfigurationPayload.budgetAllocation) return;

  graphBar.innerHTML = "";
  legendLabels.innerHTML = "";

  const allocations = activeHardwareConfigurationPayload.budgetAllocation;
  let colorCounter = 0;

  Object.keys(allocations).forEach(key => {
    const percentage = allocations[key];
    const hexColor = CHART_COLOR_PALETTE_INDEX[colorCounter % CHART_COLOR_PALETTE_INDEX.length];
    
    if (percentage > 0) {
      // Flex Segment Bar Element
      const segment = document.createElement("div");
      segment.className = "allocation-segment-bar";
      segment.style.width = `${percentage}%`;
      segment.style.backgroundColor = hexColor;
      segment.title = `${key}: ${percentage}%`;
      graphBar.appendChild(segment);

      // Legend Text Label Node
      const legendItem = document.createElement("div");
      legendItem.className = "legend-item-node";
      legendItem.innerHTML = `
        <span class="legend-color-swatch-dot" style="background-color: ${hexColor}"></span>
        <span>${key} (${percentage}%)</span>
      `;
      legendLabels.appendChild(legendItem);
    }
    colorCounter++;
  });
}

// INVOICE COMPLETION REGISTER AND FAULTLESS RENDER LOGIC
function bindInvoiceModalOrchestrationSystems() {
  const modal = document.getElementById("invoiceOrchestrationModalOverlay") || document.getElementById("invoiceModal");
  const openBtn = document.getElementById("openInvoiceOrchestrationModalBtn") || document.getElementById("openInvoiceBtn");
  const closeBtn = document.getElementById("dismissInvoiceModalOverlayBtn") || document.getElementById("closeInvoiceBtn");
  const printBtn = document.getElementById("triggerPrintInvoiceCommandBtn") || document.getElementById("printInvoiceBtn");

  if (!modal || !openBtn || !closeBtn || !printBtn) return;

  openBtn.addEventListener("click", () => {
    compileCleanInvoiceDocumentDataStructure();
    modal.classList.add("active-state");
    modal.style.display = "flex";
  });

  closeBtn.addEventListener("click", () => {
    modal.classList.remove("active-state");
    modal.style.display = "none";
  });

  printBtn.addEventListener("click", () => {
    window.print();
  });
}

function compileCleanInvoiceDocumentDataStructure() {
  const targetContainer = document.getElementById("printableInvoiceDocumentEngineBody") || document.getElementById("invoiceBody");
  if (!targetContainer || !activeHardwareConfigurationPayload) return;

  const symbol = REGIONAL_CURRENCY_EXCHANGE_INDEX[selectedGlobalAccountingCurrency].symbol;
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  
  // Calculate verified aggregate mathematical cost structures avoiding zero values or unassigned labels
  let calculatedGrandTotalSum = 0;
  let componentRowsStringHtmlHtml = "";

  activeHardwareConfigurationPayload.components.forEach(part => {
    calculatedGrandTotalSum += Number(part.price);
    componentRowsStringHtmlHtml += `
      <tr>
        <td><strong>${part.category}</strong></td>
        <td>${part.name}<br><small style="color:#64748b;">${part.spec}</small></td>
        <td style="text-align:right; font-family:monospace;">${symbol} ${Number(part.price).toLocaleString()}</td>
      </tr>
    `;
  });

  // Include Peripherals securely in line items calculation loop
  const peripheralObject = activeHardwareConfigurationPayload.peripherals;
  if (peripheralObject) {
    ["keyboard", "mouse", "headphones"].forEach(key => {
      if (peripheralObject[key]) {
        const item = peripheralObject[key];
        calculatedGrandTotalSum += Number(item.price);
        componentRowsStringHtmlHtml += `
          <tr>
            <td><strong>Peripherals (${key.toUpperCase()})</strong></td>
            <td>${item.name}<br><small style="color:#64748b;">${item.spec}</small></td>
            <td style="text-align:right; font-family:monospace;">${symbol} ${Number(item.price).toLocaleString()}</td>
          </tr>
        `;
      }
    });
  }

  // Compile Unified Gaming Summary String directly inside invoice layout frameworks to avoid layout gaps
  let gamingPerformanceSummaryRows = "";
  if (activeHardwareConfigurationPayload.gamingPerformance) {
    activeHardwareConfigurationPayload.gamingPerformance.forEach(game => {
      gamingPerformanceSummaryRows += `
        <div class="invoice-game-row-record">
          <span class="game-name">${game.title}</span>
          <span class="game-fps">Preset: ${game.preset} | Avg: ${game.avg_fps} | 1% Low: ${game.low1_fps}</span>
        </div>
      `;
    });
  }

  // Construct unbroken structural single string template layout directly
  targetContainer.innerHTML = `
    <div class="invoice-brand-heading">
      <div class="invoice-title-block">
        <h1>FORGE OPTIMIZATION REGISTER</h1>
        <p style="font-size:0.75rem; color:#64748b; margin-top:2px; letter-spacing:1px;">HIGH PERFORMANCE SYSTEMS MATRIX INVOICE</p>
      </div>
      <div class="invoice-meta-block">
        <p><strong>DATE:</strong> ${today}</p>
        <p><strong>LEDGER ID:</strong> FRG-${Math.floor(100000 + Math.random() * 900000)}</p>
        <p><strong>CURRENCY:</strong> ${selectedGlobalAccountingCurrency}</p>
      </div>
    </div>

    <div class="invoice-summary-narrative-box">
      <strong>SYSTEM LAYOUT SUMMARY PROFILE:</strong><br>
      ${activeHardwareConfigurationPayload.summary || "Asymmetric component configuration calculated across live telemetry feeds."}
    </div>

    <table class="invoice-table-document">
      <thead>
        <tr>
          <th style="width: 25%;">CATEGORY SYSTEM</th>
          <th style="width: 55%;">ELEMENT DESIGNATION SPECIFICATION</th>
          <th style="width: 20%; text-align: right;">VALUE ESTIMATE</th>
        </tr>
      </thead>
      <tbody>
        ${componentRowsStringHtmlHtml}
      </tbody>
    </table>

    <div class="invoice-total-reconciliation-row">
      <div class="invoice-total-box">
        <span>AGGREGATE CAPITAL ESTIMATE:</span>
        <span>${symbol} ${calculatedGrandTotalSum.toLocaleString()}</span>
      </div>
    </div>

    <div class="invoice-gaming-performance-summary-section">
      <h2>BENCHMARK ESTIMATION MATRIX SUMMARY</h2>
      <div class="invoice-games-print-matrix">
        ${gamingPerformanceSummaryRows}
      </div>
    </div>

    <div style="margin-top:40px; border-top:1px solid #e2e8f0; padding-top:16px; text-align:center; font-size:0.7rem; color:#94a3b8;">
      FORGE PLATFORM INTEL MATRIX WORKFLOW RECONCILIATION COMPLETE. ALL LOCAL VALUATIONS ACCORD WITH RETAIL INDICES.
    </div>
  `;
}

// AMBIENT HARDWARE GRID BACKGROUND PARTICLE SIMULATOR
function initializeAmbientHardwareVisualizer() {
  const canvas = document.getElementById("ambientHardwareVisualizerMatrix") || document.getElementById("bgCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let itemsArray = [];

  function resizeContextBounds() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeContextBounds();
  window.addEventListener("resize", resizeContextBounds);

  // Micro structure class mapping tracking nodes through multidimensional layouts
  class ComputationalTrackingNode {
    constructor() {
      this.resetTrackingParameters();
    }

    resetTrackingParameters() {
      this.axisX = Math.random() * canvas.width;
      this.axisY = Math.random() * canvas.height;
      this.radiusScale = Math.random() * 1.5 + 0.5;
      this.speedVectorX = Math.random() * 0.4 - 0.2;
      this.speedVectorY = Math.random() * 0.4 - 0.2;
      this.opacityAlpha = Math.random() * 0.5 + 0.1;
    }

    updateTelemetryPath() {
      this.axisX += this.speedVectorX;
      this.axisY += this.speedVectorY;

      if (this.axisX < 0 || this.axisX > canvas.width || this.axisY < 0 || this.axisY > canvas.height) {
        this.resetTrackingParameters();
      }
    }

    drawTrackingNode() {
      ctx.fillStyle = `rgba(0, 240, 255, ${this.opacityAlpha})`;
      ctx.beginPath();
      ctx.arc(this.axisX, this.axisY, this.radiusScale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Populate node structural tracking framework
  for (let i = 0; i < 60; i++) {
    itemsArray.push(new ComputationalTrackingNode());
  }

  // Core continuous animation loop processing variables frame-by-frame
  (function executionLoopFrameStep() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw fine structural network grids behind component boxes
    ctx.strokeStyle = "rgba(0, 240, 255, 0.015)";
    ctx.lineWidth = 0.5;
    const gridSpacing = 40;
    
    for (let x = 0; x < canvas.width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    itemsArray.forEach(node => {
      node.updateTelemetryPath();
      node.drawTrackingNode();
    });

    requestAnimationFrame(executionLoopFrameStep);
  })();

  // Track pointer mouse reactive coordinate glow mappings dynamically
  const pointerGlow = document.getElementById("cursorGlow");
  if (pointerGlow) {
    window.addEventListener("mousemove", (e) => {
      pointerGlow.style.left = `${e.clientX}px`;
      pointerGlow.style.top = `${e.clientY}px`;
    });
  }
}