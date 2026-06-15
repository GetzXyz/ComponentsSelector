export type Currency = "PKR" | "USD" | "EUR" | "GBP" | "AED" | "INR";

export type UsageType =
  | "Gaming"
  | "Streaming"
  | "Video Editing"
  | "Programming"
  | "AI/ML"
  | "Productivity"
  | "Mixed Use";

export type ComponentCategory =
  | "CPU"
  | "GPU"
  | "Motherboard"
  | "RAM"
  | "SSD"
  | "PSU"
  | "Case"
  | "Cooler"
  | "Monitor";

export type ComponentPick = {
  category: ComponentCategory;
  name: string;
  price: number;
  reason: string;
  source: string;
  specs?: string;
};

export type FpsEstimate = {
  game: string;
  preset: string;
  fps1080p: number;
  fps1440p: number;
  fps4k: number;
  onePercentLow: number;
  note: string;
};

export type PeripheralRecommendation = {
  type: "Keyboard" | "Mouse" | "Headphones";
  name: string;
  price: number;
  tier: "Affordable" | "Best Value" | "Premium";
  reason: string;
};

export type BuildRequest = {
  budget: number;
  currency: Currency;
  usage: UsageType;
};

export type BuildResult = {
  id: string;
  title: string;
  tier: string;
  budget: number;
  currency: Currency;
  usage: UsageType;
  generatedAt: string;
  total: number;
  compatibility: string;
  marketNotes: string[];
  components: ComponentPick[];
  fps: FpsEstimate[];
  peripherals: PeripheralRecommendation[];
  highEndOptimization: string;
  disclaimer: string;
  aiPowered: boolean;
};

export type ComparisonResult = {
  left: string;
  right: string;
  winner: string;
  specs: string[];
  benchmarks: string[];
  gamingPerformance: string;
  productivityPerformance: string;
  valueRating: string;
};
