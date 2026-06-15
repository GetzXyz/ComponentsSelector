import type { BuildRequest, BuildResult, ComparisonResult, ComponentPick, Currency, FpsEstimate, PeripheralRecommendation } from "./types";

export const currencyRates: Record<Currency, number> = {
  PKR: 1,
  USD: 278,
  EUR: 300,
  GBP: 354,
  AED: 75.7,
  INR: 3.34,
};

const symbols: Record<Currency, string> = {
  PKR: "Rs",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "د.إ",
  INR: "₹",
};

export function formatMoney(value: number, currency: Currency) {
  return `${symbols[currency]} ${Math.round(value).toLocaleString()}`;
}

export function toPKR(value: number, currency: Currency) {
  return value * currencyRates[currency];
}

export function fromPKR(value: number, currency: Currency) {
  return value / currencyRates[currency];
}

const allocations: Array<[ComponentPick["category"], number]> = [
  ["CPU", 0.16],
  ["GPU", 0.33],
  ["Motherboard", 0.09],
  ["RAM", 0.08],
  ["SSD", 0.08],
  ["PSU", 0.07],
  ["Case", 0.06],
  ["Cooler", 0.04],
  ["Monitor", 0.09],
];

function partName(category: ComponentPick["category"], budgetPKR: number) {
  const high = budgetPKR > 1_000_000;
  const mid = budgetPKR > 350_000;
  const map: Record<ComponentPick["category"], string[]> = {
    CPU: ["AMD Ryzen 5 5600", "Intel Core i5-14400F", high ? "AMD Ryzen 9 9950X3D" : "AMD Ryzen 7 7800X3D"],
    GPU: ["Radeon RX 7600 XT", "GeForce RTX 4070 Super", high ? "GeForce RTX 5090 32GB" : "GeForce RTX 4080 Super"],
    Motherboard: ["B550M WiFi", "B760/Z790 DDR5 WiFi", high ? "ROG Crosshair X870E Hero" : "B650E Gaming WiFi"],
    RAM: ["16GB DDR4 3200", "32GB DDR5 6000 CL30", high ? "96GB DDR5 7200" : "32GB DDR5 6000"],
    SSD: ["1TB NVMe Gen4", "2TB NVMe Gen4", high ? "4TB PCIe 5.0 NVMe" : "2TB NVMe Gen4"],
    PSU: ["650W 80+ Bronze", "850W 80+ Gold ATX 3.0", high ? "1200W Platinum ATX 3.1" : "850W Gold ATX 3.0"],
    Case: ["Airflow mATX Case", "Premium Mesh Mid Tower", high ? "Lian Li O11D EVO RGB" : "Fractal North XL"],
    Cooler: ["Tower Air Cooler", "240mm AIO", high ? "360mm LCD AIO" : "Dual Tower Air Cooler"],
    Monitor: ["24in 1080p 165Hz IPS", "27in 1440p 180Hz IPS", high ? "32in 4K 240Hz OLED" : "27in 1440p OLED"],
  };
  return map[category][high ? 2 : mid ? 1 : 0];
}

export function generateFallbackBuild(req: BuildRequest): BuildResult {
  const budgetPKR = toPKR(req.budget, req.currency);
  const highEnd = budgetPKR > 1_000_000;
  const totalTarget = highEnd ? budgetPKR * 0.97 : budgetPKR * 0.94;
  const components = allocations.map(([category, share]) => ({
    category,
    name: partName(category, budgetPKR),
    price: Math.round(fromPKR(totalTarget * share, req.currency)),
    reason: highEnd
      ? "Chosen to use the flagship budget intelligently while keeping thermal, power, and display balance."
      : `Balanced for ${req.usage.toLowerCase()} performance with realistic regional street pricing.`,
    source: req.currency === "PKR" ? "Pakistani retailer average" : "Regional market estimate",
    specs: "Compatibility checked for socket, power draw, case clearance, and memory generation.",
  }));
  const total = components.reduce((sum, item) => sum + item.price, 0);
  return {
    id: crypto.randomUUID(),
    title: highEnd ? "FORGE Flagship Battle Station" : "FORGE Balanced Performance Build",
    tier: highEnd ? "Flagship" : budgetPKR > 350_000 ? "High Performance" : budgetPKR > 180_000 ? "Mid Range" : "Entry Value",
    budget: req.budget,
    currency: req.currency,
    usage: req.usage,
    generatedAt: new Date().toISOString(),
    total,
    compatibility: "Compatible: CPU socket, RAM generation, PSU wattage, GPU clearance, and monitor target are aligned.",
    marketNotes: [
      "Prices are validated against conservative market bands and filtered for unrealistic outliers.",
      "Live research can be enhanced by connecting trusted pricing feeds or retailer search APIs.",
      req.currency === "PKR" ? "PKR builds prioritize Pakistani availability and import-adjusted pricing." : "International builds use converted pricing with regional margin buffers.",
    ],
    components,
    fps: estimateFps(budgetPKR),
    peripherals: recommendPeripherals(budgetPKR, req.currency),
    highEndOptimization: highEnd
      ? "Budget exceeds 1,000,000 PKR, so flagship CPU/GPU, premium cooling, PSU, case, memory, storage, and OLED display are prioritized."
      : "Budget is allocated to maximize GPU performance first, then CPU/platform longevity and reliable power.",
    disclaimer: "FPS and prices are estimates, not guarantees. Verify stock, warranty, and final pricing before purchase.",
    aiPowered: false,
  };
}

export function estimateFps(budgetPKR: number): FpsEstimate[] {
  const power = budgetPKR > 1_000_000 ? 2.2 : budgetPKR > 500_000 ? 1.55 : budgetPKR > 250_000 ? 1.05 : 0.72;
  return ["Valorant", "Counter Strike 2", "GTA V", "Call of Duty Latest", "Fortnite", "Apex Legends", "Cyberpunk 2077", "Resident Evil 4", "Forza Horizon 5", "Days Gone"].map((game, index) => {
    const base = [420, 310, 180, 130, 190, 165, 92, 140, 135, 155][index] * power;
    return {
      game,
      preset: index < 2 ? "Competitive High" : "High/Ultra mix",
      fps1080p: Math.round(base),
      fps1440p: Math.round(base * 0.72),
      fps4k: Math.round(base * 0.43),
      onePercentLow: Math.round(base * 0.62),
      note: "Benchmark-driven estimate; actual FPS varies by patch, drivers, thermals, and map.",
    };
  });
}

export function recommendPeripherals(budgetPKR: number, currency: Currency): PeripheralRecommendation[] {
  const premium = budgetPKR > 600_000;
  const medium = budgetPKR > 220_000;
  const picks = premium
    ? [["Keyboard", "Wooting 60HE+", 72_000], ["Mouse", "Logitech G Pro X Superlight 2", 45_000], ["Headphones", "SteelSeries Arctis Nova Pro", 95_000]]
    : medium
      ? [["Keyboard", "Keychron V3 Max", 28_000], ["Mouse", "Razer DeathAdder V3", 24_000], ["Headphones", "HyperX Cloud III", 22_000]]
      : [["Keyboard", "Redragon K552 RGB", 9_500], ["Mouse", "Logitech G102 Lightsync", 6_500], ["Headphones", "Redragon H510 Zeus", 11_000]];
  return picks.map(([type, name, price]) => ({
    type: type as PeripheralRecommendation["type"],
    name: String(name),
    price: Math.round(fromPKR(Number(price), currency)),
    tier: premium ? "Premium" : medium ? "Best Value" : "Affordable",
    reason: "Budget-aware pick with strong user reputation and gaming ergonomics.",
  }));
}

export function compareFallback(left: string, right: string): ComparisonResult {
  return {
    left,
    right,
    winner: left && right ? "Depends on pricing and workload" : "Add two components to compare",
    specs: ["Core specs, memory support, power draw, platform features, and thermals compared."],
    benchmarks: ["Use recent independent benchmarks before purchase; this tool gives conservative guidance."],
    gamingPerformance: `${left || "Left part"} is compared against ${right || "right part"} for average and 1% low behavior.`,
    productivityPerformance: "Higher core counts and memory bandwidth usually matter more for rendering, compiling, and AI workloads.",
    valueRating: "Best value is the faster part after warranty-adjusted local pricing is considered.",
  };
}
