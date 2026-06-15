"use client";

import { useEffect, useMemo, useState } from "react";
import { Cpu, Download, FileText, Moon, Printer, Share2, ShieldCheck, Sparkles, Sun, Zap } from "lucide-react";
import jsPDF from "jspdf";
import { formatMoney } from "@/lib/market";
import type { BuildResult, ComparisonResult, Currency, UsageType } from "@/lib/types";

const currencies: Currency[] = ["PKR", "USD", "EUR", "GBP", "AED", "INR"];
const usages: UsageType[] = ["Gaming", "Streaming", "Video Editing", "Programming", "AI/ML", "Productivity", "Mixed Use"];

export function ForgeApp() {
  const [accepted, setAccepted] = useState(false);
  const [light, setLight] = useState(false);
  const [budget, setBudget] = useState(300000);
  const [currency, setCurrency] = useState<Currency>("PKR");
  const [usage, setUsage] = useState<UsageType>("Gaming");
  const [loading, setLoading] = useState(false);
  const [build, setBuild] = useState<BuildResult | null>(null);
  const [compare, setCompare] = useState({ type: "GPU", left: "RTX 4070 Super", right: "RX 7800 XT" });
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [admin, setAdmin] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    setAccepted(localStorage.getItem("forge_terms_accepted") === "true");
  }, []);

  const pageClass = light ? "light-mode" : "";

  async function generateBuild() {
    setLoading(true);
    const response = await fetch("/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budget, currency, usage }),
    });
    const data = await response.json();
    setBuild(data.result);
    setLoading(false);
    localStorage.setItem("forge_last_request", JSON.stringify({ budget, currency, usage, date: new Date().toISOString() }));
  }

  async function runCompare() {
    const response = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(compare),
    });
    const data = await response.json();
    setComparison(data.result);
  }

  async function loadAdmin() {
    const response = await fetch("/api/admin");
    setAdmin(await response.json());
  }

  function exportPdf() {
    if (!build) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("FORGE AI PC Builder Invoice", 16, 18);
    doc.setFontSize(10);
    doc.text(`Date: ${new Date(build.generatedAt).toLocaleDateString()}`, 16, 28);
    doc.text(`Build: ${build.title}`, 16, 36);
    let y = 48;
    build.components.forEach((item) => {
      doc.text(`${item.category}: ${item.name} - ${formatMoney(item.price, build.currency)}`, 16, y);
      y += 8;
    });
    doc.text(`Total: ${formatMoney(build.total, build.currency)}`, 16, y + 6);
    doc.text("FPS values are estimates, not guarantees.", 16, y + 16);
    doc.save(`forge-build-${build.id}.pdf`);
  }

  const totalVsBudget = useMemo(() => (build ? Math.round((build.total / build.budget) * 100) : 0), [build]);

  if (!accepted) {
    return (
      <main className="grid-bg min-h-screen px-4 py-8 text-white">
        <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center">
          <div className="rounded-lg border border-cyan-300/25 bg-black/65 p-6 shadow-glow backdrop-blur">
            <ShieldCheck className="mb-4 h-10 w-10 text-cyan-300" />
            <h1 className="text-3xl font-black tracking-wide">FORGE Access Terms</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Accept the Privacy Policy and Terms & Conditions before using build generation, comparison, admin analytics, and invoice tools.
            </p>
            <div className="mt-5 max-h-48 overflow-auto rounded border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              We store only functional consent and local build history in your browser. AI requests may be sent to Groq if configured. Prices and FPS are estimates and must be verified before purchase.
            </div>
            <label className="mt-5 flex items-start gap-3 text-sm">
              <input id="terms" type="checkbox" className="mt-1 h-4 w-4" />
              I accept the Privacy Policy and Terms & Conditions.
            </label>
            <button
              className="mt-5 rounded-md bg-cyan-300 px-5 py-3 font-bold text-black"
              onClick={() => {
                const box = document.getElementById("terms") as HTMLInputElement | null;
                if (!box?.checked) return alert("Please accept the terms to continue.");
                localStorage.setItem("forge_terms_accepted", "true");
                setAccepted(true);
              }}
            >
              Enter FORGE
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={`${pageClass} grid-bg min-h-screen text-[var(--fg)]`}>
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md border border-cyan-300/40 bg-cyan-300/10"><Cpu className="text-cyan-300" /></div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">FORGE</p>
              <h1 className="text-xl font-black">AI PC Builder</h1>
            </div>
          </div>
          <button className="rounded-md border border-white/15 p-3" title="Toggle theme" onClick={() => setLight(!light)}>
            {light ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </header>

        <section className="grid gap-8 py-10 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded border border-lime-300/25 bg-lime-300/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-lime-200"><Sparkles size={14} /> Live-ready AI optimizer</p>
            <h2 className="max-w-3xl text-4xl font-black leading-tight sm:text-6xl">Build a faster, cleaner gaming PC from any budget.</h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">Generate compatible parts, conservative market pricing, FPS estimates, peripherals, comparison data, and print-ready invoices.</p>
          </div>
          <div className="relative h-80 overflow-hidden rounded-lg border border-cyan-300/25 bg-black/50 shadow-glow">
            <div className="absolute inset-8 rounded-lg border border-cyan-300/40 bg-slate-950">
              <div className="absolute left-8 top-8 h-20 w-20 animate-pulseGlow rounded-md border border-lime-300/60 bg-lime-300/10" />
              <div className="absolute bottom-10 left-8 right-8 h-16 animate-float rounded border border-violet-300/60 bg-violet-400/10" />
              <div className="absolute right-10 top-12 h-36 w-20 rounded border border-cyan-300/60 bg-cyan-300/10" />
              <div className="absolute inset-x-0 top-0 h-20 animate-scan bg-gradient-to-b from-cyan-300/0 via-cyan-300/20 to-cyan-300/0" />
            </div>
          </div>
        </section>

        <section className="no-print grid gap-4 rounded-lg border border-white/10 bg-white/[0.04] p-4 backdrop-blur md:grid-cols-[1fr_160px_220px_auto]">
          <input className="rounded-md border border-white/10 bg-black/30 px-4 py-3" type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
          <select className="rounded-md border border-white/10 bg-black/30 px-4 py-3" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            {currencies.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select className="rounded-md border border-white/10 bg-black/30 px-4 py-3" value={usage} onChange={(e) => setUsage(e.target.value as UsageType)}>
            {usages.map((item) => <option key={item}>{item}</option>)}
          </select>
          <button className="rounded-md bg-cyan-300 px-5 py-3 font-black text-black" onClick={generateBuild} disabled={loading}>
            {loading ? "Researching..." : "Generate Build"}
          </button>
        </section>

        {build && (
          <section className="mt-8 space-y-6">
            <div className="rounded-lg border border-white/10 bg-black/45 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-cyan-300">{build.tier} | {build.usage} | {build.aiPowered ? "Groq AI" : "Offline market engine"}</p>
                  <h2 className="text-3xl font-black">{build.title}</h2>
                  <p className="mt-2 text-slate-300">{build.compatibility}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Total</p>
                  <p className="text-3xl font-black text-lime-200">{formatMoney(build.total, build.currency)}</p>
                  <p className="text-xs text-slate-400">{totalVsBudget}% of budget</p>
                </div>
              </div>
              <div className="no-print mt-4 flex flex-wrap gap-2">
                <button className="rounded-md border border-white/15 px-3 py-2" onClick={exportPdf}><Download className="mr-2 inline h-4 w-4" />PDF</button>
                <button className="rounded-md border border-white/15 px-3 py-2" onClick={() => window.print()}><Printer className="mr-2 inline h-4 w-4" />Print</button>
                <button className="rounded-md border border-white/15 px-3 py-2" onClick={() => navigator.share?.({ title: build.title, text: build.disclaimer })}><Share2 className="mr-2 inline h-4 w-4" />Share</button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {build.components.map((item) => (
                <article key={item.category} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-violet-200">{item.category}</p>
                  <h3 className="mt-2 text-lg font-bold">{item.name}</h3>
                  <p className="mt-1 text-xl font-black text-cyan-200">{formatMoney(item.price, build.currency)}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{item.reason}</p>
                </article>
              ))}
            </div>

            <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/40">
              <h3 className="p-4 text-xl font-black"><Zap className="mr-2 inline text-lime-200" />Expected Gaming Performance</h3>
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-white/5 text-slate-300"><tr><th className="p-3">Game</th><th>Preset</th><th>1080p</th><th>1440p</th><th>4K</th><th>1% Low</th></tr></thead>
                <tbody>{build.fps.map((row) => <tr className="border-t border-white/10" key={row.game}><td className="p-3 font-bold">{row.game}</td><td>{row.preset}</td><td>{row.fps1080p}</td><td>{row.fps1440p}</td><td>{row.fps4k}</td><td>{row.onePercentLow}</td></tr>)}</tbody>
              </table>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {build.peripherals.map((item) => <div key={item.type} className="rounded-lg border border-white/10 bg-white/[0.04] p-4"><p className="text-cyan-300">{item.type}</p><h3 className="text-lg font-bold">{item.name}</h3><p>{formatMoney(item.price, build.currency)} | {item.tier}</p><p className="mt-2 text-sm text-slate-300">{item.reason}</p></div>)}
            </div>
          </section>
        )}

        <section className="no-print mt-8 grid gap-4 rounded-lg border border-white/10 bg-white/[0.04] p-4 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-xl font-black">Component Comparison</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <select className="rounded-md bg-black/30 p-3" value={compare.type} onChange={(e) => setCompare({ ...compare, type: e.target.value })}><option>GPU</option><option>CPU</option></select>
              <input className="rounded-md bg-black/30 p-3" value={compare.left} onChange={(e) => setCompare({ ...compare, left: e.target.value })} />
              <input className="rounded-md bg-black/30 p-3" value={compare.right} onChange={(e) => setCompare({ ...compare, right: e.target.value })} />
            </div>
            <button className="mt-3 rounded-md bg-violet-300 px-4 py-2 font-bold text-black" onClick={runCompare}>Compare</button>
          </div>
          <div className="text-sm leading-6 text-slate-300">{comparison ? <><b className="text-white">{comparison.winner}</b><p>{comparison.gamingPerformance}</p><p>{comparison.productivityPerformance}</p><p>{comparison.valueRating}</p></> : "Run a CPU vs CPU or GPU vs GPU comparison."}</div>
        </section>

        <section className="no-print mt-8 rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-black"><FileText className="mr-2 inline" />Admin Dashboard</h3>
            <button className="rounded-md border border-white/15 px-4 py-2" onClick={loadAdmin}>Load Stats</button>
          </div>
          {admin && <pre className="mt-4 overflow-auto rounded bg-black/40 p-4 text-xs">{JSON.stringify(admin, null, 2)}</pre>}
        </section>

        <footer className="mt-10 border-t border-white/10 py-6 text-sm text-slate-400">
          FAQ: verify all prices before purchase. Privacy: functional local storage only. Terms: FPS and market data are estimates.
        </footer>
      </div>
    </main>
  );
}
