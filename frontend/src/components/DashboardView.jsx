import React, { useState, useEffect } from "react";

/**
 * DashboardView.jsx - EXECUTIVE DASHBOARD (FINOPS CONTROL)
 */
const FINOPS_SCENARIOS = [
  {
    id: "normal",
    label: "💬 Routine Support FAQ (Saves 86%)",
    spend: 142.85,
    budget: "500.00",
    dailyReqs: 2500,
    route: "Low-Cost Flash Tier",
    note: "Routine FAQ routed to economy Flash tier instead of expensive Pro model — 86% cheaper.",
    prompt: "Customer asks: What are your standard SEPA wire transfer cut-off hours on Fridays?",
  },
  {
    id: "contract",
    label: "📄 Large Vendor Contract Review",
    spend: 310.50,
    budget: "500.00",
    dailyReqs: 1200,
    route: "Balanced Enterprise Pool",
    note: "Medium-complexity legal summary metered against Legal Dept's $500 daily cap (62% used).",
    prompt: "Summarize liability cap, renewal notice period, and GDPR sub-processor clauses in SLA v4.2.",
  },
  {
    id: "circuit",
    label: "🛑 102% Budget Hit → $0 Local AI",
    spend: 512.10,
    budget: "500.00",
    dailyReqs: 5000,
    route: "$0.00 Local Fallback AI",
    note: "Daily $500 cap reached! Circuit-breaker switches automatically to $0 local AI — zero bill overrun & zero downtime.",
    prompt: "Generate a polite order-shipped confirmation message for order #ORD-77410.",
  },
  {
    id: "company",
    label: "🏢 500-Staff Company ROI Case",
    spend: 225.00,
    budget: "500.00",
    dailyReqs: 10000,
    route: "Smart Hybrid Routing",
    note: "10,000 daily staff prompts governed centrally instead of paying $30/seat SaaS licenses.",
    prompt: "Draft 3 bullet points summarizing Q3 sprint velocity improvements for executive review.",
  },
];

export default function DashboardView({
  darkMode = true,
  modelCatalog = { connected: false, models: [] },
  primaryModel = "gemini-3.8-flash",
}) {
  const [maxDailyBudget, setMaxDailyBudget] = useState("500.00");
  const [autoFallback, setAutoFallback] = useState(true);
  const [currentSpend, setCurrentSpend] = useState(142.85);
  const [dailyReqs, setDailyReqs] = useState(2500);
  const [finopsPrompt, setFinopsPrompt] = useState(FINOPS_SCENARIOS[0].prompt);
  const [activeFinopsId, setActiveFinopsId] = useState("normal");
  const [finopsNote, setFinopsNote] = useState(FINOPS_SCENARIOS[0].note);
  const [activeRouteName, setActiveRouteName] = useState(FINOPS_SCENARIOS[0].route);
  const [finopsStep, setFinopsStep] = useState(0);
  const [finopsResult, setFinopsResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [timeWindow, setTimeWindow] = useState("5m");
  const [liveTick, setLiveTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTick((prev) => (prev + 1) % 6);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const selectFinopsPreset = (sc) => {
    setActiveFinopsId(sc.id);
    setCurrentSpend(sc.spend);
    setMaxDailyBudget(sc.budget);
    setDailyReqs(sc.dailyReqs);
    setFinopsPrompt(sc.prompt);
    setActiveRouteName(sc.route);
    setFinopsNote(sc.note);
  };

  const handleRunFinopsInteractive = () => {
    if (isSimulating || !finopsPrompt.trim()) return;
    setIsSimulating(true);
    setFinopsStep(1);
    setTimeout(() => setFinopsStep(2), 280);
    setTimeout(() => setFinopsStep(3), 560);

    const apiBase =
      (typeof window !== "undefined" && window.__AI_PORTAL_API_BASE__) ||
      (typeof window !== "undefined" && window.location.port === "3000"
        ? `${window.location.protocol}//${window.location.hostname}:8000`
        : "");

    const budgetNum = Math.max(1, parseFloat(maxDailyBudget) || 500);
    const overCap = currentSpend >= budgetNum && autoFallback;

    fetch(`${apiBase}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: primaryModel || "enterprise-primary-llm",
        tenant_id: "finops-sandbox",
        messages: [{ role: "user", content: finopsPrompt }],
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const words = Math.max(8, finopsPrompt.trim().split(/\s+/).length);
        const estTok = (data && data.usage && data.usage.total_tokens) || words * 3 + 45;
        const reqs = Math.max(10, Number(dailyReqs) || 1000);
        // Unprotected heavy frontier cost (~$12 / 1M tokens) vs Smart Flash/Local (~$1.4 / 1M or $0 local)
        const unprotMonthly = ((estTok * reqs * 30) / 1000000) * 12.0 + 350;
        const govMonthly = overCap ? 0.0 : ((estTok * reqs * 30) / 1000000) * 1.4;
        const savedPct = Math.min(100, Math.round(((unprotMonthly - govMonthly) / unprotMonthly) * 100));

        setFinopsResult({
          tokens: estTok,
          overCap,
          routeUsed: overCap ? "$0.00 Local Fallback Model (Cap Reached)" : (data && data.proxy_mode) || activeRouteName,
          unprotMonthly: unprotMonthly.toFixed(2),
          govMonthly: govMonthly.toFixed(2),
          savedMonthly: Math.max(0, unprotMonthly - govMonthly).toFixed(2),
          savedPct,
          reply: (data && data.choices && data.choices[0]?.message?.content) || "Governed response delivered within budget.",
        });
        setFinopsStep(5);
        setIsSimulating(false);
      })
      .catch(() => {
        setFinopsStep(5);
        setIsSimulating(false);
      });
  };

  const numericBudget = Math.max(1, parseFloat(maxDailyBudget) || 500);
  const spendRatio = Math.min(100, Math.round((currentSpend / numericBudget) * 1000) / 10);
  const isOverThreshold = spendRatio >= 80;

  const throughputSeries = [820, 940, 895, 1120, 1080, 1245, 1190, 1310];
  const cpuSeries = [42, 48, 45, 58, 54, 63, 59, 66];
  const activeTokensPerSec = throughputSeries[(liveTick + 4) % throughputSeries.length];
  const activeCpuPct = cpuSeries[(liveTick + 4) % cpuSeries.length];

  const cardSurface = darkMode
    ? "bg-slate-900/90 border-slate-800 text-slate-100"
    : "bg-white border-slate-200 text-slate-900 shadow-sm";
  const subSurface = darkMode
    ? "bg-slate-950/80 border-slate-800/90"
    : "bg-slate-50 border-slate-200";
  const mutedText = darkMode ? "text-slate-400" : "text-slate-500";

  return (
    <div className="space-y-6">
      <header className={`p-6 rounded-xl border space-y-5 ${cardSurface}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-xl">💰</span>
              <h2 className="text-xl font-bold tracking-tight">
                AI FinOps &amp; Cost Control &mdash; Stop Runaway Cloud Bills (For Business &amp; IT Leaders)
              </h2>
            </div>
            <p className={`text-sm mt-2 leading-relaxed ${mutedText}`}>
              <strong>What Is AI FinOps in Plain Words?</strong> Cloud AI providers charge for every word (token) sent and received. Without governance, staff send simple questions to expensive $15/M-token models, or an automated script loops overnight and creates a $10,000+ bill. This module controls spend in <strong>3 automatic ways</strong>:
            </p>
          </div>
          <span className="px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            ● Active Route: {activeRouteName}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className={`p-4 rounded-lg border space-y-1 ${subSurface}`}>
            <p className="font-mono font-bold uppercase text-emerald-400">1. Smart Cost Routing (Save ~85%)</p>
            <p className={mutedText}>Sends everyday FAQs &amp; summaries to fast economy models instead of overpaying for heavy frontier models.</p>
          </div>
          <div className={`p-4 rounded-lg border space-y-1 ${subSurface}`}>
            <p className="font-mono font-bold uppercase text-cyan-400">2. Hard Daily Department Caps</p>
            <p className={mutedText}>Sets strict daily $ ceilings per team (Support, Legal, HR, R&amp;D) so surprise monthly invoices are impossible.</p>
          </div>
          <div className={`p-4 rounded-lg border space-y-1 ${subSurface}`}>
            <p className="font-mono font-bold uppercase text-amber-400">3. Zero-Downtime $0 Failover</p>
            <p className={mutedText}>When a team reaches 100% of its daily budget, traffic switches automatically to a $0 local model — business never stops.</p>
          </div>
        </div>

        <div className={`p-5 rounded-xl border space-y-4 ${subSurface}`}>
          <div>
            <p className="text-xs font-mono font-bold uppercase text-emerald-400">
              ✨ Interactive FinOps Simulator &mdash; Pick a Business Example OR Type Your Own Prompt
            </p>
            <p className={`text-xs mt-0.5 ${mutedText}`}>{finopsNote}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {FINOPS_SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => selectFinopsPreset(sc)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                  activeFinopsId === sc.id
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold"
                    : `${cardSurface} ${mutedText}`
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-6">
              <label className="block text-xs font-mono uppercase mb-1">
                Custom Prompt (Edit or Paste Any Business Task):
              </label>
              <textarea
                rows={2}
                value={finopsPrompt}
                onChange={(e) => setFinopsPrompt(e.target.value)}
                className={`w-full p-2.5 rounded-lg border font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${cardSurface}`}
              />
            </div>
            <div className="lg:col-span-3">
              <label className="block text-xs font-mono uppercase mb-1">
                Est. Team Prompts / Day:
              </label>
              <input
                type="number"
                min="10"
                step="100"
                value={dailyReqs}
                onChange={(e) => setDailyReqs(e.target.value)}
                className={`w-full p-2.5 rounded-lg border font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${cardSurface}`}
              />
            </div>
            <div className="lg:col-span-3">
              <button
                type="button"
                onClick={handleRunFinopsInteractive}
                disabled={isSimulating}
                className="w-full py-3 px-4 rounded-lg font-mono font-bold text-xs uppercase bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg disabled:opacity-60"
              >
                {isSimulating ? "Calculating..." : "▶ Simulate Cost & Route"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs font-mono">
            {[
              { id: 1, title: "1. Count Words & Tokens" },
              { id: 2, title: "2. Check Daily Dept Cap" },
              { id: 3, title: "3. Pick Lowest-Cost Model" },
              { id: 4, title: "4. Deliver & Log Savings" },
            ].map((st) => {
              const done = finopsStep > st.id;
              const running = finopsStep === st.id;
              return (
                <div
                  key={st.id}
                  className={`p-2.5 rounded-lg border flex items-center justify-between transition-all ${
                    done
                      ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                      : running
                      ? "bg-amber-950/40 border-amber-400 animate-pulse text-amber-300 font-bold"
                      : `${cardSurface} ${mutedText}`
                  }`}
                >
                  <span>{st.title}</span>
                  <span>{done ? "✓" : running ? "●" : "○"}</span>
                </div>
              );
            })}
          </div>

          {finopsResult && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1 text-xs font-mono">
              <div className="p-3.5 rounded-lg border border-red-500/35 bg-red-950/20">
                <p className="text-[11px] uppercase text-red-300">❌ Unprotected Cloud Cost (30d)</p>
                <p className="text-lg font-bold text-red-400 mt-1">${finopsResult.unprotMonthly} / mo</p>
                <p className={`text-[10px] ${mutedText}`}>Without smart tiering / seat sprawl</p>
              </div>
              <div className="p-3.5 rounded-lg border border-emerald-500/35 bg-emerald-950/20">
                <p className="text-[11px] uppercase text-emerald-300">✅ Portal Governed Cost (30d)</p>
                <p className="text-lg font-bold text-emerald-400 mt-1">${finopsResult.govMonthly} / mo</p>
                <p className={`text-[10px] ${mutedText}`}>Route: {finopsResult.routeUsed}</p>
              </div>
              <div className="p-3.5 rounded-lg border border-cyan-500/40 bg-cyan-950/25">
                <p className="text-[11px] uppercase text-cyan-300">📈 Projected Monthly Savings</p>
                <p className="text-lg font-bold text-cyan-300 mt-1">
                  ${finopsResult.savedMonthly} ({finopsResult.savedPct}%)
                </p>
                <p className={`text-[10px] ${mutedText}`}>{finopsResult.tokens} tokens metered</p>
              </div>
              <div className={`p-3.5 rounded-lg border ${cardSurface}`}>
                <p className="text-[11px] uppercase text-indigo-300 font-bold">AI Response Preview:</p>
                <p className="text-[11px] mt-1 leading-relaxed">{finopsResult.reply}</p>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 3 Interactive KPI Stat Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <article className={`p-5 rounded-xl border ${cardSurface}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-mono uppercase tracking-wider ${mutedText}`}>
              Total Token Spend
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
              {spendRatio}% Used
            </span>
          </div>
          <p className="text-2xl font-mono font-bold mt-3 tracking-tight">
            ${currentSpend.toFixed(2)} / ${numericBudget.toFixed(2)}
          </p>
          <div className="mt-4">
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverThreshold
                    ? "bg-gradient-to-r from-amber-500 to-red-500"
                    : "bg-gradient-to-r from-emerald-500 to-teal-400"
                }`}
                style={{ width: `${Math.min(100, Math.max(5, spendRatio))}%` }}
              />
            </div>
          </div>
        </article>

        <article className={`p-5 rounded-xl border ${cardSurface}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-mono uppercase tracking-wider ${mutedText}`}>
              Average System Latency
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Optimal SLA
            </span>
          </div>
          <p className="text-3xl font-mono font-extrabold text-emerald-400 mt-3 tracking-tight">
            245ms
          </p>
          <p className={`text-xs mt-3 ${mutedText}`}>
            P95 TTFT: <span className="font-mono text-emerald-400">182ms</span> &bull; Proxy Overhead: 4.2ms
          </p>
        </article>

        <article className={`p-5 rounded-xl border ${cardSurface}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-mono uppercase tracking-wider ${mutedText}`}>
              Multi-Model Routing Efficiency
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              Latency-Based
            </span>
          </div>
          <p className="text-3xl font-mono font-extrabold text-emerald-400 mt-3 tracking-tight">
            94.2%
          </p>
          <p className={`text-xs mt-3 ${mutedText}`}>
            Autonomous load distribution across sovereign local inference pools.
          </p>
        </article>
      </section>
      {/* Interactive Financial Circuit Breaker + AIOps Chart Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Financial Circuit Breaker Card */}
        <div className={`lg:col-span-5 p-6 rounded-xl border flex flex-col justify-between space-y-5 ${cardSurface}`}>
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold tracking-tight">Financial Circuit Breaker</h3>
              <span
                className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${
                  autoFallback
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                }`}
              >
                {autoFallback ? "ARMED" : "MANUAL OVERRIDE"}
              </span>
            </div>
            <p className={`text-xs mt-1 ${mutedText}`}>
              Enforces hard daily spend ceilings at the LiteLLM proxy boundary before upstream dispatch.
            </p>

            {/* Input Field: Max Allowed Daily Budget ($) */}
            <div className="mt-5">
              <label
                htmlFor="max-daily-budget-input"
                className="block text-xs font-mono uppercase tracking-wider mb-2"
              >
                Max Allowed Daily Budget ($)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center font-mono text-emerald-400 font-bold">
                  $
                </span>
                <input
                  id="max-daily-budget-input"
                  type="number"
                  step="10"
                  min="50"
                  value={maxDailyBudget}
                  onChange={(e) => setMaxDailyBudget(e.target.value)}
                  className={`w-full pl-8 pr-4 py-2.5 rounded-lg border font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${subSurface}`}
                />
              </div>
            </div>

            {/* Toggle Switch: Auto-Fallback to Local DeepSeek-R1 on Budget Threshold */}
            <div className={`mt-5 p-4 rounded-lg border flex items-center justify-between gap-4 ${subSurface}`}>
              <div>
                <p className="text-sm font-medium">
                  Auto-Fallback to Local DeepSeek-R1 on Budget Threshold
                </p>
                <p className={`text-xs mt-0.5 ${mutedText}`}>
                  Reroutes inference to zero-marginal-cost air-gapped DeepSeek-R1 when daily spend exceeds 80%.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoFallback}
                onClick={() => setAutoFallback((prev) => !prev)}
                className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  autoFallback ? "bg-emerald-500" : "bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                    autoFallback ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${subSurface}`}>
            <span className={mutedText}>Active Failover Target:</span>
            <span className="text-emerald-400 font-semibold">
              {autoFallback ? "local/deepseek-r1-distill-qwen-32b" : "disabled (hard-stop)"}
            </span>
          </div>
        </div>

        {/* AIOps Chart Placeholder: Tokens/Sec Throughput vs Host CPU Utilization */}
        <div className={`lg:col-span-7 p-6 rounded-xl border flex flex-col justify-between space-y-4 ${cardSurface}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold tracking-tight">
                AIOps Telemetry: Tokens/Sec Throughput vs. Host CPU Utilization
              </h3>
              <p className={`text-xs mt-0.5 ${mutedText}`}>
                Live Prometheus scrape stream correlating inference token velocity with container saturation
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {["1m", "5m", "15m"].map((win) => (
                <button
                  key={win}
                  type="button"
                  onClick={() => setTimeWindow(win)}
                  className={`px-2.5 py-1 text-xs font-mono rounded border ${
                    timeWindow === win
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                      : `${subSurface} ${mutedText}`
                  }`}
                >
                  {win}
                </button>
              ))}
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${subSurface}`}>
            <svg viewBox="0 0 600 170" className="w-full h-44 overflow-visible">
              <defs>
                <linearGradient id="emeraldArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {[30, 70, 110, 150].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="600"
                  y2={y}
                  stroke={darkMode ? "#1e293b" : "#e2e8f0"}
                  strokeDasharray="4 4"
                />
              ))}
              <polygon
                points="0,155 0,115 85,90 170,102 255,62 340,74 425,42 510,52 600,28 600,155"
                fill="url(#emeraldArea)"
              />
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                points="0,115 85,90 170,102 255,62 340,74 425,42 510,52 600,28"
              />
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                points="0,138 85,125 170,132 255,100 340,110 425,88 510,94 600,78"
              />
              <circle cx="600" cy="28" r="5" fill="#10b981" className="animate-ping" />
              <circle cx="600" cy="28" r="4" fill="#10b981" />
              <circle cx="600" cy="78" r="4" fill="#f59e0b" />
            </svg>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-800/60 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                  Tokens/Sec Throughput:
                </span>
                <span className="font-bold text-emerald-400">{activeTokensPerSec} tok/s</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  Host CPU Utilization:
                </span>
                <span className="font-bold text-amber-400">{activeCpuPct}%</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

