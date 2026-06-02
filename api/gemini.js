// ═══════════════════════════════════════════════════════
//  FORGE — Gemini API Handler  v2.0
//  Route 1: POST /api/gemini     → component recommendations
//  Route 2: POST /api/hot-items  → trending PC hardware today
// ═══════════════════════════════════════════════════════

// ── Route 1: Component build (existing) ─────────────────
export async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY environment variable is not set" });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(500).json({ error: data });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) return res.status(500).json({ error: "Empty response from Gemini" });

    res.status(200).json({ result: text });
  } catch (err) {
    console.error("Handler error:", err);
    res.status(500).json({ error: err.message });
  }
}

export default handler;

// ── Route 2: Hot items today ────────────────────────────
//
//  Register this as a separate endpoint in your framework:
//    Next.js:   /pages/api/hot-items.js  → export default hotItemsHandler
//    Express:   app.post('/api/hot-items', hotItemsHandler)
//
// ───────────────────────────────────────────────────────
export async function hotItemsHandler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not set" });

  // Prompt: ask Gemini to use its grounding/web-search tool to find
  // today's hottest PC hardware items and return strict JSON.
  const prompt = `You are a PC hardware expert. Search the web right now and find the TOP 10 hottest / most-talked-about PC hardware items trending TODAY (${new Date().toISOString().slice(0, 10)}). Include GPUs, CPUs, RAM, monitors, peripherals, and any big new releases.

Return ONLY a JSON array — no markdown, no explanation, no backticks. Schema:
[
  { "name": "RTX 5090", "category": "GPU", "badge": "NEW RELEASE", "reason": "Just launched, fastest GPU ever" },
  ...
]

Rules:
- Exactly 10 items
- badge must be one of: NEW RELEASE | PRICE DROP | BEST SELLER | HOT DEAL | JUST ANNOUNCED
- Keep "reason" under 8 words
- Real products only — no hallucinations
- category must be one of: GPU | CPU | RAM | SSD | Monitor | Keyboard | Mouse | Headset | Cooler | PSU | Case | Motherboard`;

  try {
    const response = await fetch(
      // Use gemini-2.0-flash with Google Search grounding for live web data
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }],          // ← enables live web search grounding
          generationConfig: {
            temperature: 0.1,                      // very low — we want factual results
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini hot-items error:", data);
      return res.status(500).json({ error: data });
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!raw) return res.status(500).json({ error: "Empty response" });

    // Strip any accidental ```json fences
    const clean = raw.replace(/```json|```/gi, "").trim();

    let items;
    try {
      items = JSON.parse(clean);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "\nRaw:", clean);
      return res.status(500).json({ error: "Could not parse hot-items JSON", raw: clean });
    }

    // Validate shape minimally
    if (!Array.isArray(items)) {
      return res.status(500).json({ error: "Expected JSON array", raw: clean });
    }

    return res.status(200).json({ items });
  } catch (err) {
    console.error("hotItemsHandler error:", err);
    return res.status(500).json({ error: err.message });
  }
}