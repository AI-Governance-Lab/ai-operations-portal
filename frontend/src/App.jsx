import React, { useState, useEffect } from "react";
import WorkflowView from "./components/WorkflowView";
import DashboardView from "./components/DashboardView";
import SecurityView from "./components/SecurityView";
import ComplianceView from "./components/ComplianceView";
import StressTestingView from "./components/StressTestingView";

const NAV_ITEMS = [
  {
    id: "workflow",
    icon: "🧭",
    label: "Overview: Scope & Workflow",
    sublabel: "4-Stage Pipeline",
  },
  {
    id: "dashboard",
    icon: "📊",
    label: "Tab 1: Executive Dashboard",
    sublabel: "FinOps Control",
  },
  {
    id: "security",
    icon: "🛡️",
    label: "Tab 2: Security Console",
    sublabel: "Content Firewall",
  },
  {
    id: "compliance",
    icon: "⚖️",
    label: "Tab 3: Compliance & Audit Ledger",
    sublabel: "Trust Layer",
  },
  {
    id: "stress",
    icon: "⚛️",
    label: "Tab 4: System Stress Testing",
    sublabel: "HPC Workloads",
  },
];

// Poze specifice pentru frame-ul din STANGA (Sidebar)
const LEFT_IMAGES = {
  workflow: "/images/left-dashboard.jpg",
  dashboard: "/images/left-dashboard.jpg",
  security: "/images/left-security.jpg",
  compliance: "/images/left-compliance.jpg",
  stress: "/images/left-stress.jpg",
};

// Poze diferite pentru frame-ul din DREAPTA (Main Content Background)
const RIGHT_IMAGES = {
  workflow: "/images/right-dashboard.jpg",
  dashboard: "/images/right-dashboard.jpg",
  security: "/images/right-security.jpg",
  compliance: "/images/right-compliance.jpg",
  stress: "/images/right-stress.jpg",
};

export default function App() {
  const [activeTab, setActiveTab] = useState("workflow");
  const [darkMode, setDarkMode] = useState(true);
  const [editionInfo, setEditionInfo] = useState({
    edition: "open-core",
    plugin_source: "open-core-builtin",
  });

  // Preload all local images and probe active Open-Core vs Enterprise edition
  useEffect(() => {
    Object.values(LEFT_IMAGES).concat(Object.values(RIGHT_IMAGES)).forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    const apiBase =
      (typeof window !== "undefined" && window.__AI_PORTAL_API_BASE__) ||
      (typeof window !== "undefined" && window.location.port === "3000"
        ? `${window.location.protocol}//${window.location.hostname}:8000`
        : "");
    fetch(`${apiBase}/api/v1/edition`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.edition) {
          setEditionInfo(data);
        }
      })
      .catch(() => {
        // Standalone UI demo mode fallback
      });
  }, []);

  const rootTheme = darkMode
    ? "bg-slate-950 text-slate-100"
    : "bg-slate-100 text-slate-900";
  const barTheme = darkMode
    ? "bg-slate-900/95 border-slate-800"
    : "bg-white border-slate-200 shadow-sm";
  const badgeTheme = darkMode
    ? "bg-slate-950 border-slate-800 text-slate-300"
    : "bg-slate-100 border-slate-300 text-slate-700";

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${rootTheme}`}>
      {/* 1. Top Telemetry Status Bar */}
      <header className={`border-b px-5 py-3 flex flex-wrap items-center justify-between gap-3 ${barTheme}`}>
        <div className="flex items-center gap-3">
          {/* Brand Emblem: Hexagon + Neural Node Motif */}
          <div className="relative">
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_8px_rgba(16,185,129,0.45)]">
              <defs>
                <linearGradient id="brandGradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#34d399" />
                  <stop offset="0.5" stopColor="#10b981" />
                  <stop offset="1" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <path d="M24 3.5 L41.6 13.5 L41.6 34.5 L24 44.5 L6.4 34.5 L6.4 13.5 Z"
                stroke="url(#brandGradient)" strokeWidth="2.2" strokeLinejoin="round" />
              <circle cx="24" cy="24" r="4" fill="url(#brandGradient)" />
              <circle cx="14" cy="18" r="2.2" fill="#34d399" />
              <circle cx="34" cy="18" r="2.2" fill="#10b981" />
              <circle cx="14" cy="30" r="2.2" fill="#06b6d4" />
              <circle cx="34" cy="30" r="2.2" fill="#34d399" />
              <path d="M14 18 L24 24 L34 18 M14 30 L24 24 L34 30"
                stroke="url(#brandGradient)" strokeWidth="1.4" opacity="0.7" />
            </svg>
            <span className="absolute -bottom-0.5 right-0 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
          </div>

          <div className="flex flex-col leading-none">
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                AI Operations
              </span>
              <span className="text-lg font-light tracking-tight text-slate-300/80">
                Portal
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest bg-emerald-500/15 text-emerald-400 border border-emerald-500/40">
                Sovereign Core
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Enterprise Command Center
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
          <span className="px-2.5 py-1 rounded border bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold">
            System Engine Status: [🟢 RUNNING - AIR-GAPPED]
          </span>
          <span className={`px-2.5 py-1 rounded border ${badgeTheme}`}>
            Proxy Port: <strong className="text-emerald-400">:4001</strong>
          </span>
          <span className={`px-2.5 py-1 rounded border ${badgeTheme}`}>
            Active Enforcement Plane:{" "}
            <strong className={editionInfo.edition === "enterprise" ? "text-amber-400" : "text-indigo-400"}>
              {editionInfo.edition === "enterprise"
                ? "Enterprise Plugins ● Active"
                : "Open-Core Demo Shell"}
            </strong>
          </span>
          <span className="px-2.5 py-1 rounded border bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold">
            Memory Integrity: [🔒 SECURE - SHA-256 LEGIT]
          </span>

          <button
            type="button"
            onClick={() => setDarkMode((prev) => !prev)}
            aria-label="Toggle Light/Dark Mode"
            className={`px-3 py-1 rounded border font-bold transition-colors ${
              darkMode
                ? "bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700"
                : "bg-slate-200 border-slate-300 text-slate-800 hover:bg-slate-300"
            }`}
          >
            {darkMode ? "☀ Light" : "🌙 Dark"}
          </button>
        </div>
      </header>

      {/* Main Workspace Container: Left Sidebar Navigation + Active View Area */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* 2. Left Sidebar Navigation (Frame Stanga - Poze Specifice Stanga) */}
        <aside className={`w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r p-4 flex flex-col justify-between relative overflow-hidden ${barTheme}`}>
          {/* Fundal discret pe frame-ul din stanga */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            <img
              src={LEFT_IMAGES[activeTab]}
              alt=""
              className="w-full h-full object-cover opacity-35"
              style={{ filter: "blur(3px)", transform: "scale(1.04)" }}
            />
            <div className={`absolute inset-0 ${darkMode ? "bg-slate-950/75" : "bg-white/80"}`} />
          </div>

          <nav className="space-y-2 relative z-10" aria-label="Primary Operational Modules">
            <p className="px-3 py-1 text-[11px] font-mono uppercase tracking-widest text-slate-400">
              Governance Modules
            </p>
            {NAV_ITEMS.map((item) => {
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3.5 py-3 rounded-xl border transition-colors flex items-start gap-3 ${
                    isSelected
                      ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400 shadow-sm"
                      : darkMode
                      ? "bg-slate-900/75 border-slate-800/80 text-slate-200 hover:bg-slate-800/90"
                      : "bg-white/80 border-slate-200 text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-lg leading-none mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-xs font-bold tracking-tight">{item.label}</p>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">({item.sublabel})</p>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Card Foto dedicat in Frame-ul din Stanga (diferit de dreapta) */}
          <div className="my-4 relative z-10">
            <div className="rounded-xl overflow-hidden border border-emerald-500/40 shadow-lg h-40 relative">
              <img
                src={LEFT_IMAGES[activeTab]}
                alt={activeTab}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />
              <div className="absolute bottom-2.5 left-3 right-3 z-10">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 mb-1">
                  {NAV_ITEMS.find((i) => i.id === activeTab)?.sublabel}
                </span>
                <p className="text-white font-bold text-xs tracking-wide drop-shadow">
                  {NAV_ITEMS.find((i) => i.id === activeTab)?.label}
                </p>
              </div>
            </div>
          </div>

          <div className={`p-3.5 rounded-xl border text-xs font-mono space-y-1 relative z-10 ${badgeTheme}`}>
            <p className="text-emerald-400 font-bold">● K3s / OpenShift Ready</p>
            <p className="text-[11px] text-slate-400">Zero Cloud Lock-in &bull; Air-Gap Verified</p>
          </div>
        </aside>

        {/* 3. Main Content State Machine (Frame Dreapta - Poze Diferite + Blur Placut) */}
        <main className="flex-1 p-6 overflow-y-auto relative">
          {/* Imaginea de fundal din dreapta (blurata optim pentru citire usoara si performanta 60fps) */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            <img
              src={RIGHT_IMAGES[activeTab]}
              alt=""
              className="w-full h-full object-cover"
              style={{ filter: "blur(5px)", transform: "scale(1.04)" }}
            />
            <div className={`absolute inset-0 ${darkMode ? "bg-slate-950/60" : "bg-slate-100/65"}`} />
          </div>

          <div className="max-w-6xl mx-auto relative z-10">
            {activeTab === "workflow" && (
              <WorkflowView
                darkMode={darkMode}
                editionInfo={editionInfo}
                onNavigate={setActiveTab}
              />
            )}
            {activeTab === "dashboard" && <DashboardView darkMode={darkMode} />}
            {activeTab === "security" && <SecurityView darkMode={darkMode} />}
            {activeTab === "compliance" && <ComplianceView darkMode={darkMode} />}
            {activeTab === "stress" && <StressTestingView darkMode={darkMode} />}
          </div>
        </main>
      </div>
    </div>
  );
}

