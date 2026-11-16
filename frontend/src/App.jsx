import React, { useState, useEffect } from "react";
import AegisChatWidget from "./components/AegisChatWidget";
import WorkflowView from "./components/WorkflowView";
import DashboardView from "./components/DashboardView";
import SecurityView from "./components/SecurityView";
import ComplianceView from "./components/ComplianceView";
import StressTestingView from "./components/StressTestingView";

const NAV_ITEMS = [
  {
    id: "workflow",
    icon: "🧭",
    label: "Overview: Interactive Flow Map",
    sublabel: "5 Animated Business Cases",
    tryBadge: "🎬 Animated Diagram + Live Test",
  },
  {
    id: "dashboard",
    icon: "💰",
    label: "Tab 1: FinOps & Cost Control",
    sublabel: "Stop Runaway AI Bills",
    tryBadge: "✨ 4 Examples + Try Your Own",
  },
  {
    id: "security",
    icon: "🛡️",
    label: "Tab 2: Protect PII & Secrets",
    sublabel: "GDPR / HIPAA / IP Shield",
    tryBadge: "✨ 6 Examples + Try Your Own",
  },
  {
    id: "compliance",
    icon: "⚖️",
    label: "Tab 3: AI Jury & Audit Trail",
    sublabel: "Block Tricks & Prove Logs",
    tryBadge: "✨ 5 Examples + Try Your Own",
  },
  {
    id: "stress",
    icon: "⚡",
    label: "Tab 4: Scale & Burst Lab",
    sublabel: "High-Speed Stress Proof",
    tryBadge: "✨ 4 Examples + Try Your Own",
  },
];

// Poze specifice pentru frame-ul din STANGA (Sidebar)
const LEFT_IMAGES = {
  workflow: "/images/left-dashboard.jpg",
  dashboard: "/images/left-dashboard.jpg",
  security: "/images/left-security.jpg",
  compliance: "/images/left-compliance.jpg",
  stress: "/images/left-stress.jpg",
  admin: "/images/left-security.jpg",
};

// Poze diferite pentru frame-ul din DREAPTA (Main Content Background)
const RIGHT_IMAGES = {
  workflow: "/images/right-dashboard.jpg",
  dashboard: "/images/right-dashboard.jpg",
  security: "/images/right-security.jpg",
  compliance: "/images/right-compliance.jpg",
  stress: "/images/right-stress.jpg",
  admin: "/images/right-security.jpg",
};

function installAccessFetchBridge() {
  if (typeof window === "undefined" || window.__AI_PORTAL_FETCH_BRIDGED__) return;
  window.__AI_PORTAL_FETCH_BRIDGED__ = true;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const urlStr = typeof input === "string" ? input : input?.url || "";
    const key = window.__AI_PORTAL_ACCESS_KEY__ || "";
    if (key && (urlStr.includes("/api/v1/") || urlStr.includes("/v1/"))) {
      const nextHeaders = new Headers(init.headers || {});
      if (!nextHeaders.has("X-Portal-Access-Key")) {
        nextHeaders.set("X-Portal-Access-Key", key);
      }
      return nativeFetch(input, Object.assign({}, init, { headers: nextHeaders }));
    }
    return nativeFetch(input, init);
  };
}

function EnterpriseAdminLoader({ darkMode, modelCatalog }) {
  const [AdminComp, setAdminComp] = useState(null);
  const [loadErr, setLoadErr] = useState("");

  useEffect(() => {
    const apiBase =
      (typeof window !== "undefined" && window.__AI_PORTAL_API_BASE__) ||
      (typeof window !== "undefined" && window.location.port === "3000"
        ? `${window.location.protocol}//${window.location.hostname}:8000`
        : "");
    fetch(`${apiBase}/api/v1/enterprise/admin/ui-bundle`)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((jsCode) => {
        const factory = new Function("React", jsCode);
        const Comp = factory(React);
        setAdminComp(() => Comp);
      })
      .catch((err) => setLoadErr(String(err.message || "Admin bundle unavailable")));
  }, []);

  if (loadErr) {
    return (
      <div className="p-6 rounded-xl border border-red-500/40 bg-slate-900/90 text-red-300 font-mono text-xs">
        Admin Console Restricted: {loadErr}
      </div>
    );
  }
  if (!AdminComp) {
    return (
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/90 text-emerald-300 font-mono text-xs animate-pulse">
        Loading Private Enterprise Admin Console...
      </div>
    );
  }
  return <AdminComp darkMode={darkMode} modelCatalog={modelCatalog} />;
}

export default function App() {
  installAccessFetchBridge();
  const [activeTab, setActiveTab] = useState("workflow");
  const [darkMode, setDarkMode] = useState(true);
  const [isAegisOpen, setIsAegisOpen] = useState(false);
  const [aegisExternalPrompt, setAegisExternalPrompt] = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState("");
  const [tierInfo, setTierInfo] = useState({
    tier: "anonymous",
    label: "Public Guest",
    rate_limit_per_min: 10,
    daily_limit: 200,
    daily_used: 0,
    admin_console_available: false,
  });

  const askAegisCase = (question, mode = "normal") => {
    setAegisExternalPrompt({ question, mode });
    setIsAegisOpen(true);
  };
  const [editionInfo, setEditionInfo] = useState({
    edition: "open-core",
    plugin_source: "open-core-builtin",
  });
  const [modelCatalog, setModelCatalog] = useState({
    connected: false,
    mode: "loading",
    endpoint: "http://127.0.0.1:4001/v1",
    models: [
      { id: "gemini-3.8-flash", provider: "Google Vertex AI" },
      { id: "ministral-14b-latest", provider: "Mistral AI" },
      { id: "nvidia/nemotron-3.5-lightning-30b-a3b", provider: "NVIDIA NIM" },
      { id: "glm-5.2-maas", provider: "Zhipu GLM (Vertex)" },
      { id: "codestral-2508", provider: "Mistral AI" },
    ],
  });
  const [primaryModel, setPrimaryModel] = useState("gemini-3.8-flash");
  const [selectedJudges, setSelectedJudges] = useState([
    "gemini-3.8-flash",
    "ministral-14b-latest",
    "codestral-2508",
  ]);

  const toggleJudgeModel = (modelId) => {
    setSelectedJudges((prev) => {
      if (prev.includes(modelId)) {
        return prev.length > 1 ? prev.filter((id) => id !== modelId) : prev;
      }
      if (prev.length >= 4) {
        return prev.slice(1).concat(modelId);
      }
      return prev.concat(modelId);
    });
  };

  const getApiBase = () =>
    (typeof window !== "undefined" && window.__AI_PORTAL_API_BASE__) ||
    (typeof window !== "undefined" && window.location.port === "3000"
      ? `${window.location.protocol}//${window.location.hostname}:8000`
      : "");

  const refreshTierAndModels = () => {
    const apiBase = getApiBase();
    fetch(`${apiBase}/api/v1/auth/tier`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Invalid key"))))
      .then((tData) => {
        if (tData && tData.tier) setTierInfo(tData);
      })
      .catch(() => {
        if (typeof window !== "undefined") {
          window.__AI_PORTAL_ACCESS_KEY__ = "";
          try {
            window.sessionStorage.removeItem("ai_portal_access_key");
          } catch (_) {}
        }
      });

    fetch(`${apiBase}/api/v1/models`)
      .then((res) => (res.ok ? res.json() : null))
      .then((cat) => {
        if (cat && Array.isArray(cat.models) && cat.models.length > 0) {
          setModelCatalog(cat);
          if (cat.default_model) setPrimaryModel(cat.default_model);
          if (Array.isArray(cat.default_judges) && cat.default_judges.length > 0) {
            setSelectedJudges(cat.default_judges.slice(0, 4));
          }
        }
      })
      .catch(() => {});
  };

  const handleApplyAccessKey = (rawKey) => {
    const trimmed = (rawKey || "").trim();
    const extracted = trimmed.includes("#invite=") ? trimmed.split("#invite=")[1].trim() : trimmed;
    if (!extracted) return;
    setKeyError("");
    window.__AI_PORTAL_ACCESS_KEY__ = extracted;
    fetch(`${getApiBase()}/api/v1/auth/tier`)
      .then((res) => (res.ok ? res.json() : res.json().then((e) => Promise.reject(new Error(e.detail || "Invalid key")))))
      .then((tData) => {
        try {
          window.sessionStorage.setItem("ai_portal_access_key", extracted);
        } catch (_) {}
        setTierInfo(tData);
        setKeyInput("");
        setShowKeyModal(false);
        refreshTierAndModels();
      })
      .catch((err) => {
        window.__AI_PORTAL_ACCESS_KEY__ = "";
        setKeyError(err.message || "Invalid or expired Access Pass.");
      });
  };

  const handleSignOutTier = () => {
    window.__AI_PORTAL_ACCESS_KEY__ = "";
    try {
      window.sessionStorage.removeItem("ai_portal_access_key");
    } catch (_) {}
    setTierInfo({
      tier: "anonymous",
      label: "Public Guest",
      rate_limit_per_min: 10,
      daily_limit: 200,
      daily_used: 0,
      admin_console_available: false,
    });
    if (activeTab === "admin") setActiveTab("workflow");
    setShowKeyModal(false);
    refreshTierAndModels();
  };

  // Preload all local images, redeem #invite= magic link if present, and probe edition/models
  useEffect(() => {
    Object.values(LEFT_IMAGES)
      .concat(Object.values(RIGHT_IMAGES))
      .concat(["/images/aegis-normal.jpg?v=4", "/images/aegis-sme.jpg?v=4"])
      .forEach((src) => {
        const img = new Image();
        img.src = src;
      });

    if (typeof window !== "undefined") {
      const hash = window.location.hash || "";
      if (hash.startsWith("#invite=")) {
        const token = decodeURIComponent(hash.slice(8)).trim();
        if (token) {
          window.__AI_PORTAL_ACCESS_KEY__ = token;
          try {
            window.sessionStorage.setItem("ai_portal_access_key", token);
          } catch (_) {}
        }
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      } else {
        try {
          const saved = window.sessionStorage.getItem("ai_portal_access_key") || "";
          if (saved) window.__AI_PORTAL_ACCESS_KEY__ = saved;
        } catch (_) {}
      }
    }

    fetch(`${getApiBase()}/api/v1/edition`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.edition) setEditionInfo(data);
      })
      .catch(() => {});

    refreshTierAndModels();
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

  const visibleNavItems =
    tierInfo.tier === "admin" && tierInfo.admin_console_available
      ? NAV_ITEMS.concat({
          id: "admin",
          icon: "👑",
          label: "Admin Console (Private)",
          sublabel: "Stats • Passes • Logs",
        })
      : NAV_ITEMS;

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
            LiteLLM Plane:{" "}
            <strong className={modelCatalog.connected ? "text-emerald-400" : "text-cyan-400"}>
              {modelCatalog.connected
                ? `🟢 Live (${modelCatalog.models.length} Models)`
                : "Demo Fallback"}
            </strong>
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
            onClick={() => {
              setKeyError("");
              setShowKeyModal(true);
            }}
            className={`px-3 py-1 rounded-lg border font-bold flex items-center gap-1.5 transition-all ${
              tierInfo.tier === "admin"
                ? "border-amber-400 bg-amber-500/20 text-amber-300"
                : tierInfo.tier === "user"
                ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                : "border-slate-600 bg-slate-800/90 text-slate-200 hover:border-emerald-400"
            }`}
          >
            <span>
              {tierInfo.tier === "admin"
                ? "👑 Admin (Unrestricted)"
                : tierInfo.tier === "user"
                ? `⭐ VIP: ${tierInfo.label}`
                : `🔑 Guest (${tierInfo.rate_limit_per_min}/min)`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsAegisOpen((prev) => !prev)}
            className="px-3 py-1 rounded-lg border-2 border-emerald-300 bg-emerald-500/25 text-emerald-200 hover:bg-emerald-500/40 font-extrabold flex items-center gap-2 shadow-md shadow-emerald-500/25"
          >
            <img src="/images/aegis-normal.jpg?v=4" alt="Elena" className="w-7 h-7 rounded-full object-cover ring-1 ring-white" />
            <span>Ask AEGIS Guide</span>
          </button>

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
            {visibleNavItems.map((item) => {
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
                  <div className="space-y-1">
                    <p className="text-xs font-bold tracking-tight">{item.label}</p>
                    <p className="text-[11px] font-mono text-slate-400">({item.sublabel})</p>
                    {item.tryBadge && (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {item.tryBadge}
                      </span>
                    )}
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
                  {visibleNavItems.find((i) => i.id === activeTab)?.sublabel}
                </span>
                <p className="text-white font-bold text-xs tracking-wide drop-shadow">
                  {visibleNavItems.find((i) => i.id === activeTab)?.label}
                </p>
              </div>
            </div>
          </div>

          <div className={`p-3.5 rounded-xl border text-xs font-mono space-y-1 relative z-10 ${badgeTheme}`}>
            <p className="text-emerald-400 font-bold">● Cloud Run &amp; K8s Ready</p>
            <p className="text-[11px] text-slate-400">🔒 GDPR Zero-PII: No cookies, emails or raw IPs</p>
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
                modelCatalog={modelCatalog}
                primaryModel={primaryModel}
                setPrimaryModel={setPrimaryModel}
                selectedJudges={selectedJudges}
                toggleJudgeModel={toggleJudgeModel}
                onNavigate={setActiveTab}
                onAskAegis={askAegisCase}
              />
            )}
            {activeTab === "dashboard" && (
              <DashboardView darkMode={darkMode} modelCatalog={modelCatalog} primaryModel={primaryModel} />
            )}
            {activeTab === "security" && (
              <SecurityView
                darkMode={darkMode}
                editionInfo={editionInfo}
                primaryModel={primaryModel}
                selectedJudges={selectedJudges}
              />
            )}
            {activeTab === "compliance" && (
              <ComplianceView
                darkMode={darkMode}
                editionInfo={editionInfo}
                modelCatalog={modelCatalog}
                primaryModel={primaryModel}
                selectedJudges={selectedJudges}
                toggleJudgeModel={toggleJudgeModel}
              />
            )}
            {activeTab === "stress" && (
              <StressTestingView
                darkMode={darkMode}
                primaryModel={primaryModel}
                selectedJudges={selectedJudges}
              />
            )}
            {activeTab === "admin" && (
              <EnterpriseAdminLoader darkMode={darkMode} modelCatalog={modelCatalog} />
            )}
          </div>
        </main>
      </div>

      {showKeyModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
        >
          <div className={`max-w-md w-full p-6 rounded-2xl border border-emerald-500/50 shadow-2xl space-y-4 ${barTheme}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-mono text-emerald-400">
                🔑 Access Pass / Admin Unlock
              </h3>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="text-xs font-mono text-slate-400 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Public guests get strict anti-abuse caps (<strong>{tierInfo.rate_limit_per_min} req/min</strong>). Paste an <strong>Invited VIP Code</strong> (<code>VIP-...</code>), a <strong>Magic Link</strong>, or your <strong>Admin Master Key</strong> to unlock higher tiers. Stored in browser <code>sessionStorage</code> only (zero cookies, zero PII).
            </p>

            <div className="text-xs font-mono p-3 rounded-lg border border-slate-800 bg-slate-950/70 space-y-1">
              <p>Active Tier: <strong className="text-emerald-400 uppercase">{tierInfo.tier}</strong> ({tierInfo.label})</p>
              <p>Today&apos;s Live Quota: {tierInfo.daily_used} / {tierInfo.daily_limit === 999999 ? "∞" : tierInfo.daily_limit}</p>
            </div>

            {keyError && (
              <p className="text-xs font-mono text-red-400 bg-red-950/40 border border-red-500/40 p-2.5 rounded">
                {keyError}
              </p>
            )}

            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Paste VIP-XXXX code or Admin Master Key..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-700 bg-slate-950 text-xs font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <div className="flex items-center justify-between gap-2 pt-1">
              {tierInfo.tier !== "anonymous" ? (
                <button
                  type="button"
                  onClick={handleSignOutTier}
                  className="px-3 py-2 rounded-lg text-xs font-mono border border-red-500/40 text-red-300 hover:bg-red-500/15"
                >
                  Sign Out to Guest
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => handleApplyAccessKey(keyInput)}
                className="px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase bg-emerald-500 hover:bg-emerald-400 text-slate-950"
              >
                Unlock Tier
              </button>
            </div>
          </div>
        </div>
      )}

      <AegisChatWidget
        darkMode={darkMode}
        isOpen={isAegisOpen}
        setIsOpen={setIsAegisOpen}
        activeTab={activeTab}
        primaryModel={primaryModel}
        onNavigate={setActiveTab}
        externalPrompt={aegisExternalPrompt}
        clearExternalPrompt={() => setAegisExternalPrompt(null)}
      />
    </div>
  );
}

