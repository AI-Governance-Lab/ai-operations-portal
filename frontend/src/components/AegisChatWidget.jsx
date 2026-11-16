import React, { useState, useEffect } from "react";

const AEGIS_QUICK_PROMPTS = [
  {
    id: "what",
    label: "🧭 What is this portal?",
    question: "Explain what AI Operations Portal does and where it sits in a company.",
  },
  {
    id: "s1",
    label: "🛡️ Step 1 Case: Nurse + HIPAA PII",
    question: "Explain the Step 1 Privacy Scrubber demo case (Hospital Nurse MRN & Visa card).",
  },
  {
    id: "s2",
    label: "📊 Step 2 Case: $500 Budget Spike",
    question: "Explain the Step 2 FinOps Router demo case ($500 daily ceiling & automatic failover).",
  },
  {
    id: "s3",
    label: "⚖️ Step 3 Case: Prompt Injection Jury",
    question: "Explain the Step 3 Multi-Judge Council demo case (hidden database dump attack).",
  },
  {
    id: "s4",
    label: "🔒 Step 4 Case: Regulator Audit Proof",
    question: "Explain the Step 4 Cryptographic Audit Ledger demo case (proving no log tampering).",
  },
  {
    id: "uniq",
    label: "🏆 Why unique vs competitors?",
    question: "Why is AI Operations Portal unique on the market compared to standard gateways or guardrails?",
  },
  {
    id: "oc",
    label: "☁️ Public Cloud Run vs Private Repo",
    question: "How do the Public Open-Core repo (Cloud Run) and Private Enterprise repo work without exposing private code?",
  },
];

function getAegisApiBase() {
  if (typeof window === "undefined") return "";
  if (window.__AI_PORTAL_API_BASE__) return window.__AI_PORTAL_API_BASE__;
  if (window.location.port === "3000") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return "";
}

function renderFormattedReply(text) {
  const parts = String(text || "").split(/(\*\*[^*]+\*\*)/g);
  return parts.map((chunk, idx) => {
    if (chunk.startsWith("**") && chunk.endsWith("**")) {
      return (
        <strong key={idx} className="text-emerald-300 font-semibold">
          {chunk.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{chunk}</span>;
  });
}

export default function AegisChatWidget({
  darkMode = true,
  isOpen = false,
  setIsOpen = () => {},
  activeTab = "workflow",
  primaryModel = "gemini-3.8-flash",
  onNavigate = () => {},
  externalPrompt = null,
  clearExternalPrompt = () => {},
}) {
  const [audienceMode, setAudienceMode] = useState("normal");
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      mode: "normal",
      source: "AEGIS Dual Concierge",
      suggested_tab: "workflow",
      text: "Welcome! Meet your **AEGIS Dual Advisors**: **Elena** explains every workflow in **🗣️ Normal Words** (business-friendly analogies), and **Marcus** switches to **🧠 SME / Architect** depth (cryptography, quorum & K8s specs). Pick a mode above or click any **Step 1–4 Demo Case**!",
    },
  ]);

  const sendQuestion = (questionText, modeOverride) => {
    const cleanQ = (questionText || "").trim();
    if (!cleanQ || isSending) return;
    const activeTone = modeOverride || audienceMode;

    setMessages((prev) => prev.concat({ role: "user", text: cleanQ, mode: activeTone }));
    setInputText("");
    setIsSending(true);

    const apiBase = getAegisApiBase();
    fetch(`${apiBase}/api/v1/assistant/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: cleanQ,
        audience_mode: activeTone,
        active_tab: activeTab,
        model: primaryModel,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("HTTP error"))))
      .then((data) => {
        setMessages((prev) =>
          prev.concat({
            role: "assistant",
            mode: data.audience_mode || activeTone,
            source: data.source || "aegis-guide",
            suggested_tab: data.suggested_tab || null,
            text: data.reply || "Ready to help explain any module.",
          })
        );
        setIsSending(false);
      })
      .catch(() => {
        setMessages((prev) =>
          prev.concat({
            role: "assistant",
            mode: activeTone,
            source: "offline-fallback",
            text: "**AEGIS Offline Note:** AI Operations Portal sits between your apps and LLMs to scrub PII, cap FinOps spend, run Multi-Judge consensus, and chain SHA-256 audit receipts.",
          })
        );
        setIsSending(false);
      });
  };

  useEffect(() => {
    if (externalPrompt && externalPrompt.question) {
      const nextTone = externalPrompt.mode || audienceMode;
      if (externalPrompt.mode) setAudienceMode(externalPrompt.mode);
      setIsOpen(true);
      sendQuestion(externalPrompt.question, nextTone);
      clearExternalPrompt();
    }
  }, [externalPrompt]);

  const panelTheme = darkMode
    ? "bg-slate-900/95 border-emerald-500/40 text-slate-100"
    : "bg-white border-emerald-500/50 text-slate-900";
  const bubbleAssist = darkMode
    ? "bg-slate-950/90 border-slate-800 text-slate-200"
    : "bg-slate-100 border-slate-200 text-slate-800";

  const activeAvatarSrc =
    audienceMode === "sme" ? "/images/aegis-sme.jpg?v=4" : "/images/aegis-normal.jpg?v=4";
  const activeAdvisorName =
    audienceMode === "sme" ? "Marcus • AEGIS SME" : "Elena • AEGIS Guide";
  const activeAdvisorRole =
    audienceMode === "sme"
      ? "Principal AI Security & K8s Architect"
      : "Executive AI Business Concierge";

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3.5 pl-3 pr-5 py-2.5 rounded-full border-2 border-emerald-300 bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 text-white shadow-[0_0_30px_rgba(16,185,129,0.55)] hover:scale-105 transition-all"
      >
        <div className="relative flex items-center flex-shrink-0">
          <img
            src="/images/aegis-normal.jpg?v=4"
            alt="Elena Business Guide"
            className="w-14 h-14 rounded-full object-cover ring-2 ring-emerald-300 shadow-lg z-10"
          />
          <img
            src="/images/aegis-sme.jpg?v=4"
            alt="Marcus SME Architect"
            className="w-12 h-12 rounded-full object-cover ring-2 ring-cyan-300 shadow-lg -ml-3.5"
          />
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-ping" />
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
        </div>
        <div className="text-left">
          <p className="text-sm font-extrabold tracking-wide text-emerald-300">Ask AEGIS Advisors</p>
          <p className="text-[11px] font-mono text-slate-200">Elena (Plain) &bull; Marcus (SME)</p>
        </div>
      </button>
    );
  }

  return (
    <aside
      aria-label="AEGIS Portal Guide"
      className={`fixed bottom-5 right-5 z-50 w-[94vw] max-w-md h-[620px] max-h-[86vh] rounded-2xl border-2 shadow-2xl flex flex-col overflow-hidden ${panelTheme}`}
    >
      <div className="p-3.5 border-b border-slate-800 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-cyan-950/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <img
              src={activeAvatarSrc}
              alt={activeAdvisorName}
              className={`w-14 h-14 rounded-full object-cover ring-2 shadow-[0_0_18px_rgba(52,211,153,0.7)] ${
                audienceMode === "sme" ? "ring-cyan-300" : "ring-emerald-300"
              }`}
            />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold tracking-tight text-emerald-300">
                {activeAdvisorName}
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-300">{activeAdvisorRole}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-2 py-1 rounded text-xs font-mono text-slate-400 hover:text-white border border-slate-700"
        >
          ✕
        </button>
      </div>

      <div className="px-3.5 py-2 border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs font-mono">
        <span className="text-[11px] text-slate-400">Explain in:</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setAudienceMode("normal")}
            className={`px-2.5 py-1 rounded-lg border transition-all ${
              audienceMode === "normal"
                ? "bg-emerald-500/25 text-emerald-300 border-emerald-400 font-bold"
                : "border-slate-700 text-slate-400"
            }`}
          >
            🗣️ Normal Words
          </button>
          <button
            type="button"
            onClick={() => setAudienceMode("sme")}
            className={`px-2.5 py-1 rounded-lg border transition-all ${
              audienceMode === "sme"
                ? "bg-indigo-500/25 text-indigo-300 border-indigo-400 font-bold"
                : "border-slate-700 text-slate-400"
            }`}
          >
            🧠 SME / Architect
          </button>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-slate-800/70 flex gap-1.5 overflow-x-auto">
        {AEGIS_QUICK_PROMPTS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => sendQuestion(item.question)}
            className="flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-mono border border-slate-700 bg-slate-950/70 text-slate-300 hover:border-emerald-400 hover:text-emerald-300 transition-colors"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs leading-relaxed">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start items-start gap-2"}`}
          >
            {m.role === "assistant" && (
              <img
                src={m.mode === "sme" ? "/images/aegis-sme.jpg?v=4" : "/images/aegis-normal.jpg?v=4"}
                alt={m.mode === "sme" ? "Marcus SME" : "Elena Guide"}
                className={`w-10 h-10 rounded-full object-cover mt-0.5 flex-shrink-0 ring-2 shadow-md ${
                  m.mode === "sme" ? "ring-cyan-300" : "ring-emerald-300"
                }`}
              />
            )}
            <div
              className={`max-w-[84%] p-3 rounded-xl border space-y-2 ${
                m.role === "user"
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-100"
                  : bubbleAssist
              }`}
            >
              <p>{renderFormattedReply(m.text)}</p>
              {m.role === "assistant" && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-[10px] font-mono text-slate-400">
                  <span>
                    {m.mode === "sme" ? "🧠 Marcus (SME)" : "🗣️ Elena (Plain)"} &bull; {m.source}
                  </span>
                  {m.suggested_tab && (
                    <button
                      type="button"
                      onClick={() => onNavigate(m.suggested_tab)}
                      className="text-emerald-400 hover:underline font-bold"
                    >
                      Open Module &rarr;
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex items-center gap-2.5 text-xs font-mono text-emerald-400 animate-pulse">
            <img src={activeAvatarSrc} alt={activeAdvisorName} className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-300" />
            <span>{audienceMode === "sme" ? "Marcus (SME)" : "Elena"} is preparing your explanation...</span>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendQuestion(inputText);
        }}
        className="p-3 border-t border-slate-800 flex gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            audienceMode === "sme"
              ? "Ask SME question (HMAC vault, quorum, K8s)..."
              : "Ask in plain words about any case or step..."
          }
          className="flex-1 px-3 py-2 rounded-lg border border-slate-700 bg-slate-950/90 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={isSending}
          className="px-3.5 py-2 rounded-lg font-mono font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </aside>
  );
}
