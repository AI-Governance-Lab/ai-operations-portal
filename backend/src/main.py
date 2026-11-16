"""
AI Operations Portal - FastAPI Core Engine Entry Point (`main.py`).

Architectural Scope:
    Universal Command Center and Application-Layer Governance Middleware.
    Intercepts inbound prompt strings and outbound completion strings routed
    through the embedded LiteLLM proxy plane across 4 operational pillars:
      1. FinOps & Latency-Based Routing
      2. Data Sovereignty (Privacy Scrubber Interface)
      3. AIOps Telemetry (Native Prometheus Exposition)
      4. Cryptographic Audit Trails & Multi-Judge Governance

Deployment Target:
    100% Self-Hosted inside private network perimeters, Docker/Podman containers,
    or air-gapped Kubernetes clusters (K3s / Red Hat OpenShift).
"""

from dataclasses import asdict
import os
from pathlib import Path
import re
import time
from typing import Dict, List, Optional, Any

from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .aiops_metrics import (
    PAYLOAD_REQUESTS_TOTAL,
    TOKENS_PROCESSED_TOTAL,
    PIPELINE_LATENCY_SECONDS,
    export_prometheus_snapshot,
    sample_runtime_saturation,
)
from .litellm_bridge import discover_litellm_catalog, route_sanitized_completion
from .plugin_loader import load_governance_bundle
from .portal_assistant import answer_portal_question

for _env_candidate in (
    Path(__file__).resolve().parents[1] / ".env",
    Path(__file__).resolve().parents[2] / ".env",
):
    if _env_candidate.is_file():
        load_dotenv(dotenv_path=_env_candidate, override=False)


def _resolve_frontend_dir() -> Path:
    for parent in (Path(__file__).resolve().parents[1], Path(__file__).resolve().parents[2]):
        candidate = parent / "frontend"
        if candidate.is_dir():
            return candidate
    return Path(__file__).resolve().parents[2] / "frontend"


runtime_bundle = load_governance_bundle()
_enable_docs = os.getenv("ENABLE_SWAGGER_DOCS", "true").strip().lower() in ("1", "true", "yes")
_cors_origins_raw = os.getenv("CORS_ALLOWED_ORIGINS", "*").strip()
_cors_origins = [o.strip() for o in _cors_origins_raw.split(",") if o.strip()] or ["*"]

app = FastAPI(
    title="AI Operations Portal",
    description="Self-Hosted Enterprise AI Governance, FinOps, AIOps & Cryptographic Audit Middleware",
    version=f"1.0.0-{runtime_bundle.edition}",
    docs_url="/docs" if _enable_docs else None,
    redoc_url=None,
    openapi_url="/openapi.json" if _enable_docs else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False if _cors_origins == ["*"] else True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def body_size_shield_middleware(request: Request, call_next: Any) -> Response:
    """Blocks oversized HTTP payload bombs (>128 KB) before JSON parsing."""
    max_bytes = int(os.getenv("MAX_HTTP_BODY_BYTES", "131072"))
    content_length = request.headers.get("content-length")
    if content_length and content_length.isdigit() and int(content_length) > max_bytes:
        return JSONResponse(status_code=413, content={"detail": "HTTP body exceeds maximum allowed size."})
    return await call_next(request)


# Initialize Governance Engines (Open-Core fallback or Private Enterprise plugins)
scrubber_engine = runtime_bundle.scrubber
judge_council = runtime_bundle.judge_council
audit_ledger = runtime_bundle.audit_ledger
anomaly_predictor = runtime_bundle.anomaly_predictor
access_guard = runtime_bundle.access_guard

for enterprise_router in runtime_bundle.routers:
    app.include_router(enterprise_router)

_images_dir = _resolve_frontend_dir() / "public" / "images"
if _images_dir.is_dir():
    app.mount("/images", StaticFiles(directory=str(_images_dir)), name="portal_images")


class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role: system, user, or assistant")
    content: str = Field(..., description="Application-level string payload")


class ChatCompletionRequest(BaseModel):
    model: str = Field(default="enterprise-primary-llm", description="Target LiteLLM model group")
    messages: List[ChatMessage]
    tenant_id: str = Field(default="enterprise-default", description="FinOps & governance tenant identifier")
    temperature: Optional[float] = 0.2
    selected_judges: Optional[List[str]] = Field(
        default=None,
        description="Optional list of LiteLLM judge model IDs chosen for council quorum",
    )


@app.get("/health", tags=["AIOps"])
async def health_check() -> Dict[str, Any]:
    """Liveness & readiness probe for Docker, K3s, and OpenShift orchestrators."""
    saturation = sample_runtime_saturation()
    return {
        "status": "healthy",
        "edition": runtime_bundle.edition,
        "appliance_mode": f"self-hosted-{runtime_bundle.edition}",
        "plugin_source": runtime_bundle.plugin_source,
        "loaded_plugins": runtime_bundle.loaded_plugins,
        "runtime_saturation": saturation,
    }


@app.get("/api/v1/edition", tags=["AIOps"])
async def get_appliance_edition() -> Dict[str, Any]:
    """Returns active Open-Core vs Enterprise plugin capabilities for the UI."""
    return {
        "edition": runtime_bundle.edition,
        "plugin_source": runtime_bundle.plugin_source,
        "loaded_plugins": runtime_bundle.loaded_plugins,
    }


@app.get("/api/v1/auth/tier", tags=["Access Control"])
async def inspect_caller_tier(http_request: Request) -> Dict[str, Any]:
    """Validates caller Access Pass / Admin Key and returns active tier & quota."""
    decision = access_guard.inspect_tier(http_request)
    return asdict(decision)


@app.get("/api/v1/models", tags=["Governance Proxy"])
async def list_available_models(http_request: Request) -> Dict[str, Any]:
    """Discovers available chat & judge models filtered by caller access tier."""
    catalog = await discover_litellm_catalog()
    try:
        decision = access_guard.inspect_tier(http_request)
    except Exception:
        decision = None
    if decision is not None:
        filtered = access_guard.filter_models(catalog.get("models", []), decision)
        allowed_ids = {m["id"] for m in filtered}
        catalog["models"] = filtered
        if catalog.get("default_model") not in allowed_ids and filtered:
            catalog["default_model"] = filtered[0]["id"]
        def_j = [j for j in catalog.get("default_judges", []) if j in allowed_ids]
        catalog["default_judges"] = (def_j or [m["id"] for m in filtered])[: decision.max_judges]
        catalog["caller_tier"] = decision.tier
    return catalog


@app.get("/metrics", tags=["AIOps"])
async def prometheus_metrics() -> Response:
    """
    Public Telemetry Hook:
    Exposes application-layer LLM pipeline metrics and process saturation
    signals natively to Prometheus scrapers.
    """
    payload_bytes, content_type = export_prometheus_snapshot()
    return Response(content=payload_bytes, media_type=content_type)


@app.post("/v1/chat/completions", tags=["Governance Proxy"])
async def intercept_chat_completions(
    request: ChatCompletionRequest,
    http_request: Request,
) -> Dict[str, Any]:
    """Primary Application-Layer String Payload Interceptor (3-Tier Protected)."""
    pipeline_start = time.perf_counter()
    if len(request.messages) > 16:
        return JSONResponse(status_code=422, content={"detail": "Too many messages in single request."})
    raw_prompt = "\n".join(m.content for m in request.messages)
    decision = access_guard.authorize_request(http_request, raw_prompt, "/v1/chat/completions")

    effective_model = request.model
    if (
        decision.allowed_models
        and effective_model not in decision.allowed_models
        and effective_model != "enterprise-primary-llm"
    ):
        effective_model = decision.allowed_models[0]

    req_judges = request.selected_judges or []
    if decision.allowed_models:
        req_judges = [j for j in req_judges if j in decision.allowed_models] or decision.allowed_models[: decision.max_judges]
    req_judges = req_judges[: decision.max_judges]

    # Step 1: Data Sovereignty Scrubber Pass
    scrub_result = scrubber_engine.sanitize_payload(raw_prompt, tenant_id=request.tenant_id)

    # Step 2: Pluggable LiteLLM Proxy Routing Plane (sends ONLY sanitized text)
    completion_text, proxy_mode, prompt_tokens, completion_tokens = await route_sanitized_completion(
        model=effective_model,
        sanitized_prompt=scrub_result.sanitized_text,
        force_mock=decision.force_mock,
    )

    # Step 3: Asynchronous Multi-Judge Consensus Evaluation
    judges_csv = ",".join(req_judges)
    verdict = await judge_council.evaluate_interaction(
        prompt_text=scrub_result.sanitized_text,
        completion_text=completion_text,
        metadata={
            "model": effective_model,
            "tenant_id": request.tenant_id,
            "selected_judges": judges_csv,
            "force_mock": "true" if decision.force_mock else "false",
        },
    )

    # Step 4: Cryptographic SHA-256 Audit Ledger Chaining
    ledger_block = audit_ledger.append_record(
        tenant_id=request.tenant_id,
        prompt_text=scrub_result.sanitized_text,
        completion_text=completion_text,
        governance_metadata={
            "model": effective_model,
            "tier": decision.tier,
            "redaction_count": scrub_result.redaction_count,
            "consensus_approved": verdict.approved,
        },
    )

    verdict_str = "APPROVED" if verdict.approved else "QUARANTINED"
    access_guard.record_question_event(
        decision=decision,
        channel="gateway_pipeline",
        raw_question=scrub_result.sanitized_text,
        model_used=effective_model,
        verdict_label=verdict_str,
        extra={"tenant_id": request.tenant_id, "tokens": prompt_tokens + completion_tokens},
    )
    if not verdict.approved:
        access_guard.record_problem_event(
            session_hash=decision.session_hash,
            category="JUDGE_QUARANTINE",
            detail=f"Blocked flags: {', '.join(verdict.policy_flags) or 'quorum_rejected'}",
            endpoint="/v1/chat/completions",
        )

    total_elapsed = time.perf_counter() - pipeline_start
    anomaly_report = anomaly_predictor.evaluate_latency_drift(
        model_group=effective_model,
        latency_ms=round(total_elapsed * 1000.0, 3),
    )

    # Step 5: Public Prometheus Telemetry Hooks
    PAYLOAD_REQUESTS_TOTAL.labels(
        model_group=effective_model,
        tenant=request.tenant_id,
        status="success" if verdict.approved else "quarantined",
    ).inc()
    TOKENS_PROCESSED_TOTAL.labels(model_group=effective_model, direction="prompt").inc(prompt_tokens)
    TOKENS_PROCESSED_TOTAL.labels(model_group=effective_model, direction="completion").inc(completion_tokens)
    PIPELINE_LATENCY_SECONDS.labels(stage="end_to_end_gateway", model_group=effective_model).observe(total_elapsed)

    return {
        "object": "chat.completion",
        "model": effective_model,
        "edition": runtime_bundle.edition,
        "caller_tier": decision.tier,
        "proxy_mode": proxy_mode,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": completion_text},
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
        },
        "governance_envelope": {
            "edition": runtime_bundle.edition,
            "privacy_scrubber": asdict(scrub_result),
            "compliance_verdict": asdict(verdict),
            "audit_ledger_block": asdict(ledger_block),
            "anomaly_telemetry": anomaly_report,
        },
    }


class AssistantChatRequest(BaseModel):
    message: str = Field(..., description="User question about the portal or a specific demo case")
    audience_mode: str = Field(default="normal", description="Explanation style: 'normal' or 'sme'")
    active_tab: str = Field(default="workflow", description="Currently viewed UI tab")
    model: Optional[str] = Field(default=None, description="Optional LiteLLM model override")


@app.post("/api/v1/assistant/chat", tags=["AEGIS Guide"])
async def aegis_portal_guide(
    request: AssistantChatRequest,
    http_request: Request,
) -> Dict[str, Any]:
    """Explains portal workflows & demo cases in Normal or SME words (3-Tier Protected)."""
    decision = access_guard.authorize_request(http_request, request.message, "/api/v1/assistant/chat")
    scrubbed_q = scrubber_engine.sanitize_payload(request.message, tenant_id="aegis-chat").sanitized_text
    effective_model = request.model
    if decision.allowed_models and effective_model and effective_model not in decision.allowed_models:
        effective_model = decision.allowed_models[0]

    result = await answer_portal_question(
        message=request.message,
        audience_mode=request.audience_mode,
        active_tab=request.active_tab,
        edition=runtime_bundle.edition,
        model=effective_model,
        force_mock=decision.force_mock,
    )
    access_guard.record_question_event(
        decision=decision,
        channel=f"aegis_{result.get('audience_mode', 'normal')}",
        raw_question=scrubbed_q,
        model_used=str(result.get("source", "curated")),
        verdict_label="ANSWERED",
        extra={"active_tab": request.active_tab},
    )
    return result


@app.get("/api/v1/ledger", tags=["Audit Trail"])
async def list_audit_ledger() -> Dict[str, Any]:
    """Returns recent SHA-256 hash-chained audit blocks for the portal UI."""
    blocks = [asdict(b) for b in audit_ledger.get_recent_blocks(limit=25)]
    return {"count": len(blocks), "chain": blocks}


@app.get("/", response_class=HTMLResponse, tags=["Executive SPA"])
async def serve_executive_portal_spa() -> HTMLResponse:
    """
    Serves the React 18 + Tailwind CSS Single-Page Application directly from
    `frontend/src/` on port 8000 so the portal is immediately accessible via
    the browser (`http://localhost:8000/`).
    """
    frontend_src = _resolve_frontend_dir() / "src"
    jsx_files = [
        frontend_src / "components" / "AegisChatWidget.jsx",
        frontend_src / "components" / "InteractiveFlowDiagram.jsx",
        frontend_src / "components" / "WorkflowView.jsx",
        frontend_src / "components" / "DashboardView.jsx",
        frontend_src / "components" / "SecurityView.jsx",
        frontend_src / "components" / "ComplianceView.jsx",
        frontend_src / "components" / "StressTestingView.jsx",
        frontend_src / "App.jsx",
    ]

    compiled_chunks: List[str] = ["const { useState, useEffect } = React;"]
    for jsx_path in jsx_files:
        if jsx_path.exists():
            raw_code = jsx_path.read_text(encoding="utf-8")
            cleaned = re.sub(r"^\s*import\s+.*?;\s*$", "", raw_code, flags=re.MULTILINE)
            cleaned = cleaned.replace("export default function ", "function ")
            compiled_chunks.append(f"// --- {jsx_path.name} ---\n{cleaned}")

    compiled_chunks.append('ReactDOM.createRoot(document.getElementById("root")).render(<App />);')
    combined_jsx = "\n\n".join(compiled_chunks)

    html_doc = f"""<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Operations Portal — Sovereign Command Center</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body class="bg-slate-950 text-slate-100 antialiased">
  <div id="root"></div>
  <script type="text/babel">
{combined_jsx}
  </script>
</body>
</html>"""
    return HTMLResponse(content=html_doc, status_code=200)


