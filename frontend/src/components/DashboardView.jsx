import React, { useState, useEffect } from "react";

/**
 * DashboardView.jsx - EXECUTIVE DASHBOARD (FINOPS CONTROL)
 */
export default function DashboardView({ darkMode = true }) {
  const [maxDailyBudget, setMaxDailyBudget] = useState("500.00");
  const [autoFallback, setAutoFallback] = useState(true);
  const [currentSpend] = useState(142.85);
  const [timeWindow, setTimeWindow] = useState("5m");
  const [liveTick, setLiveTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTick((prev) => (prev + 1) % 6);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

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
      {/* Header Banner */}
      <header className={`p-5 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${cardSurface}`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <h2 className="text-xl font-bold tracking-tight">
              Executive Dashboard &mdash; FinOps &amp; AIOps Control Plane
            </h2>
          </div>
          <p className={`text-sm mt-1 ${mutedText}`}>
            Real-time token budget governance, autonomous multi-model routing efficiency, and host saturation telemetry.
          </p>
        </div>
        <span className="px-3 py-1 text-xs font-mono font-semibold uppercase rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          ● FinOps Enforcer Active
        </span>
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

