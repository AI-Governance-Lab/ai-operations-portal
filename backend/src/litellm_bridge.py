"""
Cloud-Agnostic LiteLLM Gateway Bridge (`litellm_bridge.py`).

Connects AI Operations Portal to ANY OpenAI-compatible LiteLLM proxy configured
via environment variables (`LITELLM_PROXY_URL`, `LITELLM_API_KEY`), with
zero-key demo fallback for public Cloud Run and air-gapped deployments.
"""

import os
from typing import Any, Dict, List, Tuple
from urllib.parse import urlparse

import httpx

DEMO_FALLBACK_MODELS: List[Dict[str, str]] = [
    {"id": "gemini-3.8-flash", "provider": "Vertex AI (Demo)", "role": "fast-judge"},
    {"id": "ministral-14b-latest", "provider": "Mistral (Demo)", "role": "fast-judge"},
    {"id": "nvidia/nemotron-3.5-lightning-30b-a3b", "provider": "NVIDIA NIM (Demo)", "role": "fast-judge"},
    {"id": "glm-5.2-maas", "provider": "Vertex MaaS (Demo)", "role": "reasoning"},
    {"id": "codestral-2508", "provider": "Mistral Code (Demo)", "role": "code-audit"},
    {"id": "deepseek-ai/deepseek-v4-flash-0731", "provider": "DeepSeek (Demo)", "role": "fallback"},
]


def get_litellm_settings() -> Dict[str, Any]:
    """Reads dynamic LiteLLM connection parameters from environment variables."""
    mode = os.getenv("LITELLM_PROXY_MODE", "auto").strip().lower()
    base_url = os.getenv("LITELLM_PROXY_URL", "http://127.0.0.1:4001/v1").strip().rstrip("/")
    api_key = os.getenv("LITELLM_API_KEY", "").strip()
    default_model = os.getenv("LITELLM_DEFAULT_MODEL", "gemini-3.8-flash").strip()
    raw_judges = os.getenv(
        "LITELLM_DEFAULT_JUDGES",
        "gemini-3.8-flash,ministral-14b-latest,codestral-2508",
    )
    default_judges = [j.strip() for j in raw_judges.split(",") if j.strip()]
    parsed = urlparse(base_url)
    display_endpoint = f"{parsed.scheme}://{parsed.netloc}{parsed.path}" if parsed.netloc else base_url
    return {
        "mode": mode,
        "base_url": base_url,
        "api_key": api_key,
        "display_endpoint": display_endpoint,
        "default_model": default_model,
        "default_judges": default_judges,
    }


def _infer_provider(model_id: str) -> str:
    low = model_id.lower()
    if "gemini" in low:
        return "Google Vertex AI"
    if "glm" in low:
        return "Zhipu GLM (Vertex)"
    if "ministral" in low or "codestral" in low or "mistral" in low:
        return "Mistral AI"
    if "nvidia/" in low or "nemotron" in low:
        return "NVIDIA NIM"
    if "deepseek" in low:
        return "DeepSeek"
    if "/" in model_id:
        return model_id.split("/", 1)[0]
    return "LiteLLM Gateway"

async def discover_litellm_catalog() -> Dict[str, Any]:
    """Queries `/models` on the configured LiteLLM gateway or falls back cleanly."""
    cfg = get_litellm_settings()
    if cfg["mode"] == "local-mock-fallback" or not cfg["base_url"]:
        return {
            "connected": False,
            "mode": cfg["mode"],
            "endpoint": "builtin-demo-catalog",
            "default_model": cfg["default_model"],
            "default_judges": cfg["default_judges"],
            "models": DEMO_FALLBACK_MODELS,
        }

    headers: Dict[str, str] = {}
    if cfg["api_key"]:
        headers["Authorization"] = f"Bearer {cfg['api_key']}"

    try:
        async with httpx.AsyncClient(timeout=3.5) as client:
            resp = await client.get(f"{cfg['base_url']}/models", headers=headers)
            resp.raise_for_status()
            raw_items = resp.json().get("data", [])

        models: List[Dict[str, str]] = []
        for item in raw_items:
            mid = str(item.get("id", "")).strip()
            if not mid or "embed" in mid.lower():
                continue
            models.append(
                {
                    "id": mid,
                    "provider": _infer_provider(mid),
                    "role": "chat-and-judge",
                }
            )

        if not models:
            models = DEMO_FALLBACK_MODELS

        available_ids = {m["id"] for m in models}
        def_model = cfg["default_model"] if cfg["default_model"] in available_ids else models[0]["id"]
        def_judges = [j for j in cfg["default_judges"] if j in available_ids] or [m["id"] for m in models[:3]]

        return {
            "connected": True,
            "mode": "live-litellm",
            "endpoint": cfg["display_endpoint"],
            "default_model": def_model,
            "default_judges": def_judges,
            "models": models,
        }
    except Exception:
        return {
            "connected": False,
            "mode": "fallback-simulated",
            "endpoint": cfg["display_endpoint"],
            "default_model": cfg["default_model"],
            "default_judges": cfg["default_judges"],
            "models": DEMO_FALLBACK_MODELS,
        }


async def route_sanitized_completion(
    model: str,
    sanitized_prompt: str,
    force_mock: bool = False,
) -> Tuple[str, str, int, int]:
    """Routes sanitized/vaulted text via LiteLLM when live, else mock fallback."""
    cfg = get_litellm_settings()
    fallback_ptok = max(1, len(sanitized_prompt.split()))

    if not force_mock and cfg["mode"] != "local-mock-fallback" and cfg["base_url"]:
        headers = {"Content-Type": "application/json"}
        if cfg["api_key"]:
            headers["Authorization"] = f"Bearer {cfg['api_key']}"
        target_model = model if model != "enterprise-primary-llm" else cfg["default_model"]
        body = {
            "model": target_model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a concise enterprise AI assistant behind AI Operations Portal. "
                        "Reply in 2-3 clear sentences and preserve <VAULT:...> tokens verbatim."
                    ),
                },
                {"role": "user", "content": sanitized_prompt},
            ],
            "max_tokens": 600,
            "temperature": 0.2,
        }
        try:
            async with httpx.AsyncClient(timeout=14.0) as client:
                resp = await client.post(
                    f"{cfg['base_url']}/chat/completions",
                    headers=headers,
                    json=body,
                )
                resp.raise_for_status()
                data = resp.json()
                text = (
                    data.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                    .strip()
                )
                usage = data.get("usage", {})
                p_tok = int(usage.get("prompt_tokens") or fallback_ptok)
                c_tok = int(usage.get("completion_tokens") or max(1, len(text.split())))
                if text:
                    return (text, f"live-litellm ({target_model})", p_tok, c_tok)
        except Exception:
            pass

    mock_text = (
        f"[Governed Sovereign Response via {model}] Processed {len(sanitized_prompt)} "
        f"sanitized characters inside zero-trust perimeter."
    )
    return (mock_text, "simulated-airgap-fallback", fallback_ptok, max(1, len(mock_text.split())))
