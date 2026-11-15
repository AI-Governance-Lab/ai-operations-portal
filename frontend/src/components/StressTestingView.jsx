import React, { useState, useEffect } from "react";

const EXECUTION_STAGES = [
  {
    id: 1,
    title: "Stage 1: Runtime Context Sanitized",
    detail: "Zero-trust payload scrubbing & Hamiltonian/Log tensor boundary validation",
    targetTime: 0.45,
  },
  {
    id: 2,
    title: "Stage 2: Qiskit/Cirq Circuit Compilation",
    detail: "Transpiling parameterized ansatz & oracle gates to local simulator topology",
    targetTime: 1.12,
  },
  {
    id: 3,
    title: "Stage 3: Executing 1024 Quantum Shots",
    detail: "High-concurrency statevector sampling across sovereign HPC worker threads",
    targetTime: 1.88,
  },
  {
    id: 4,
    title: "Stage 4: Independent LLM-as-a-Judge Audit Sign-off",
    detail: "Multi-judge consensus attestation anchored to SHA-256 Block #143",
    targetTime: 2.34,
  },
];

export default function StressTestingView({ darkMode = true }) {
  const [activeWorkload, setActiveWorkload] = useState(null);
  const [currentStage, setCurrentStage] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return undefined;

    const ticker = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = Math.round((prev + 0.05) * 100) / 100;
        if (next >= 0.45 && next < 1.12) setCurrentStage(2);
        else if (next >= 1.12 && next < 1.88) setCurrentStage(3);
        else if (next >= 1.88 && next < 2.34) setCurrentStage(4);
        else if (next >= 2.34) {
          setCurrentStage(5);
          setIsRunning(false);
        }
        return next;
      });
    }, 50);

    return () => clearInterval(ticker);
  }, [isRunning]);

  const triggerCampaign = (workloadName) => {
    setActiveWorkload(workloadName);
    setCurrentStage(1);
    setElapsedSeconds(0.05);
    setIsRunning(true);
  };

  const cardSurface = darkMode
    ? "bg-slate-900/90 border-slate-800 text-slate-100"
    : "bg-white border-slate-200 text-slate-900 shadow-sm";
  const subSurface = darkMode
    ? "bg-slate-950/90 border-slate-800 text-slate-100"
    : "bg-slate-50 border-slate-200 text-slate-900";
  const mutedText = darkMode ? "text-slate-400" : "text-slate-500";

  return (
    <div className="space-y-6">
      <header className={`p-5 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${cardSurface}`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚛️</span>
            <h2 className="text-xl font-bold tracking-tight">
              System Stress Testing &mdash; Sovereign HPC &amp; Quantum Simulation Lab
            </h2>
          </div>
          <p className={`text-sm mt-1 ${mutedText}`}>
            Sovereign Engineering Proof: High-concurrency downstream compute workloads governed in real time.
          </p>
        </div>
        <span className="px-3 py-1 text-xs font-mono font-bold uppercase rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
          ⏱ Live Ticker: {elapsedSeconds.toFixed(2)}s
        </span>
      </header>

      {/* Two Large Grid-Action Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card A: Simulate Quantum VQE Chemical Screening Campaign */}
        <article className={`p-6 rounded-xl border flex flex-col justify-between space-y-5 ${cardSurface}`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                HPC Campaign A &bull; VQE Ansatz
              </span>
              <span className="text-xs font-mono text-emerald-400">⏱ 0.45s Stage SLA</span>
            </div>
            <h3 className="text-lg font-bold tracking-tight">
              Simulate Quantum VQE Chemical Screening Campaign
            </h3>
            <p className={`text-sm ${mutedText}`}>
              Synthesizes a 6-qubit BeH2/LiH ground-state variational quantum eigensolver code payload through the sovereign AI governance plane.
            </p>
          </div>
          <button
            type="button"
            onClick={() => triggerCampaign("Quantum VQE Chemical Screening Campaign")}
            className="w-full py-3 px-4 rounded-lg font-mono font-bold text-xs uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all"
          >
            ⚛️ Launch 6-Qubit Molecule Target Code
          </button>
        </article>

        {/* Card B: Simulate Grover Anomaly Signature Network Hunt */}
        <article className={`p-6 rounded-xl border flex flex-col justify-between space-y-5 ${cardSurface}`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                HPC Campaign B &bull; Grover Oracle
              </span>
              <span className="text-xs font-mono text-amber-400">1024 Shots</span>
            </div>
            <h3 className="text-lg font-bold tracking-tight">
              Simulate Grover Anomaly Signature Network Hunt
            </h3>
            <p className={`text-sm ${mutedText}`}>
              Executes quadratic-speedup unstructured SIEM telemetry log amplification with automated multi-judge compliance verification.
            </p>
          </div>
          <button
            type="button"
            onClick={() => triggerCampaign("Grover Anomaly Signature Network Hunt")}
            className="w-full py-3 px-4 rounded-lg font-mono font-bold text-xs uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition-all"
          >
            🔍 Execute Unstructured Log Scan
          </button>
        </article>
      </section>

      {/* Non-Blocking 4-Stage Timeline Progress Tracker */}
      <section className={`p-6 rounded-xl border space-y-5 ${cardSurface}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/70 pb-4">
          <div>
            <h3 className="text-base font-bold tracking-tight">
              4-Stage Non-Blocking Execution Timeline
            </h3>
            <p className={`text-xs font-mono mt-0.5 ${mutedText}`}>
              {activeWorkload
                ? `Active Workload: ${activeWorkload}`
                : "Select an HPC workload above to initiate governed 4-stage pipeline execution."}
            </p>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            ⏱ {elapsedSeconds > 0 ? `${elapsedSeconds.toFixed(2)}s` : "0.45s"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {EXECUTION_STAGES.map((stage) => {
            const isCompleted = currentStage > stage.id;
            const isCurrent = currentStage === stage.id;
            return (
              <div
                key={stage.id}
                className={`p-4 rounded-lg border transition-all ${
                  isCompleted
                    ? "bg-emerald-950/30 border-emerald-500/50"
                    : isCurrent
                    ? "bg-amber-950/30 border-amber-500/60 animate-pulse"
                    : subSurface
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  <span
                    className={
                      isCompleted
                        ? "text-emerald-400 font-bold"
                        : isCurrent
                        ? "text-amber-400 font-bold"
                        : mutedText
                    }
                  >
                    {isCompleted ? "✓ COMPLETE" : isCurrent ? "● RUNNING" : "○ QUEUED"}
                  </span>
                  <span className="text-emerald-400">⏱ {stage.targetTime.toFixed(2)}s</span>
                </div>
                <p className="text-sm font-bold leading-snug">{stage.title}</p>
                <p className={`text-xs mt-1.5 ${mutedText}`}>{stage.detail}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
