// Add this function to render components with 3 options grouped by category

function renderComponentCards(symbol) {
  const container = document.getElementById("componentsDynamicGridContainer");
  if (!container || !activeBuildPayload.components) return;

  container.innerHTML = "";

  // Group components by category
  const grouped = {};
  activeBuildPayload.components.forEach(part => {
    if (!grouped[part.category]) {
      grouped[part.category] = [];
    }
    grouped[part.category].push(part);
  });

  // Render each category with its options
  Object.entries(grouped).forEach(([category, items]) => {
    const categorySection = document.createElement("div");
    categorySection.className = "category-section";
    categorySection.style.marginBottom = "24px";

    // Category header
    const header = document.createElement("div");
    header.className = "category-header";
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.marginBottom = "12px";
    header.style.paddingBottom = "8px";
    header.style.borderBottom = "1px solid var(--border)";

    const icon = document.createElement("span");
    icon.style.fontSize = "20px";
    icon.style.marginRight = "12px";
    icon.textContent = getCategoryIcon(category);

    const title = document.createElement("h3");
    title.style.fontFamily = "var(--font-display)";
    title.style.fontSize = "13px";
    title.style.color = "var(--accent)";
    title.style.letterSpacing = "2px";
    title.style.textTransform = "uppercase";
    title.textContent = category;

    header.appendChild(icon);
    header.appendChild(title);
    categorySection.appendChild(header);

    // Options grid
    const optionsGrid = document.createElement("div");
    optionsGrid.style.display = "grid";
    optionsGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(200px, 1fr))";
    optionsGrid.style.gap = "12px";

    items.forEach((part, index) => {
      const card = createComponentCard(part, symbol, category);
      optionsGrid.appendChild(card);
    });

    categorySection.appendChild(optionsGrid);
    container.appendChild(categorySection);
  });
}

function getCategoryIcon(category) {
  const icons = {
    CPU: "⚙️",
    GPU: "🎮",
    Motherboard: "🔌",
    RAM: "💾",
    Storage: "💿",
    PSU: "⚡",
    Cooling: "❄️",
    Case: "📦",
    Monitor: "🖥️",
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
  const conditionText = part.condition === "used" ? "USED" : "NEW";

  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
      <div class="card-node-category-label">${part.brand || "Generic"}</div>
      <span style="
        font-size: 9px;
        padding: 3px 6px;
        border-radius: 3px;
        background: ${part.condition === "used" ? "rgba(255,184,0,.15)" : "rgba(0,240,255,.15)"};
        color: ${conditionColor};
        font-weight: 700;
        text-transform: uppercase;
      ">${conditionText}</span>
    </div>
    
    <div class="card-node-title-string">${part.name}</div>
    
    <div class="card-node-specifications-text">${part.spec}</div>
    
    <div class="card-node-financial-row">
      <span class="financial-row-label">PRICE</span>
      <span class="financial-row-value-string">${symbol} ${Number(part.price).toLocaleString()}</span>
    </div>
  `;

  return card;
}

// Update the main renderBuildResults function
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

  // Show note if fallback
  if (activeBuildPayload.note) {
    const noteDiv = document.createElement("div");
    noteDiv.style.background = "rgba(255, 184, 0, 0.1)";
    noteDiv.style.border = "1px solid rgba(255, 184, 0, 0.3)";
    noteDiv.style.borderRadius = "8px";
    noteDiv.style.padding = "12px";
    noteDiv.style.marginBottom = "16px";
    noteDiv.style.fontSize = "12px";
    noteDiv.style.color = "var(--gold)";
    noteDiv.style.fontFamily = "var(--font-mono)";
    noteDiv.textContent = `ℹ️ ${activeBuildPayload.note}`;
    
    const container = document.getElementById("componentsDynamicGridContainer");
    if (container) {
      container.parentElement.insertBefore(noteDiv, container);
    }
  }
}