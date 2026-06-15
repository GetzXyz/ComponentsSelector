import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    requestsToday: 128,
    avgBudgetPKR: 382000,
    topUsage: "Gaming",
    pricingSources: ["Pakistani retailer average", "Regional converted market", "Manual trusted source list"],
    apiKeys: [{ name: "GROQ_API_KEY", configured: Boolean(process.env.GROQ_API_KEY) }],
    health: "operational",
  });
}
