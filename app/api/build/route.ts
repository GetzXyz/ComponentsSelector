import { NextResponse } from "next/server";
import { z } from "zod";
import { generateFallbackBuild } from "@/lib/market";
import type { BuildResult } from "@/lib/types";

const schema = z.object({
  budget: z.number().min(100).max(100_000_000),
  currency: z.enum(["PKR", "USD", "EUR", "GBP", "AED", "INR"]),
  usage: z.enum(["Gaming", "Streaming", "Video Editing", "Programming", "AI/ML", "Productivity", "Mixed Use"]),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid build request." }, { status: 400 });
  }

  const fallback = generateFallbackBuild(parsed.data);
  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ result: fallback, fallback: true });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are FORGE AI, a PC hardware expert. Return only valid JSON matching the provided shape. Use realistic current market estimates, regional pricing, compatibility reasoning, benchmark-driven FPS estimates, and never guarantee FPS.",
          },
          {
            role: "user",
            content: JSON.stringify({
              task: "Create a complete PC build with CPU, GPU, motherboard, RAM, SSD, PSU, case, cooler, monitor, market notes, FPS estimates for 10 named games, peripherals, and high-end optimization notes.",
              input: parsed.data,
              requiredShape: fallback,
            }),
          },
        ],
      }),
    });
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    const ai = JSON.parse(raw) as BuildResult;
    return NextResponse.json({ result: { ...fallback, ...ai, id: fallback.id, generatedAt: fallback.generatedAt, aiPowered: true } });
  } catch {
    return NextResponse.json({ result: fallback, fallback: true });
  }
}
