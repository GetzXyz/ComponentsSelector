import { NextResponse } from "next/server";
import { z } from "zod";
import { compareFallback } from "@/lib/market";

const schema = z.object({
  left: z.string().min(1).max(120),
  right: z.string().min(1).max(120),
  type: z.enum(["CPU", "GPU"]),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid comparison request." }, { status: 400 });
  const fallback = compareFallback(parsed.data.left, parsed.data.right);
  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ result: fallback, fallback: true });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        temperature: 0.1,
        messages: [
          { role: "system", content: "Return valid JSON for a CPU/GPU comparison with specs, benchmarks, gaming, productivity, value, and winner fields." },
          { role: "user", content: JSON.stringify(parsed.data) },
        ],
      }),
    });
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    return NextResponse.json({ result: JSON.parse(data.choices?.[0]?.message?.content) });
  } catch {
    return NextResponse.json({ result: fallback, fallback: true });
  }
}
