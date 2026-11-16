"""
3-Tier Access Policy, Anti-Abuse & GDPR-Safe Session Shield (`security_guard.py`).

Public Open-Core Implementation:
  - Protects public Cloud Run / K8s deployments against LLM wallet-draining,
    oversized payload bombs, brute-force key guessing, and bot scraping.
  - Zero-PII / GDPR-Safe by design: NEVER stores or logs raw visitor IPs; uses
    daily-rotating salted SHA-256 session hashes (`anon-xxxxxxxxxx`).
  - Supports 3 tiers out-of-the-box:
      1. `anonymous` : Strict per-IP rate limit, shared daily live-LLM cap with
                       automatic $0 mock fallback, short prompt limit, model allowlist.
      2. `user`      : Named `.env` invite keys OR stateless HMAC-signed `#invite=`
                       Magic Links with custom RPM, daily quota & model scope.
      3. `admin`     : Unrestricted access via `PORTAL_MASTER_KEY`.
"""

from abc import ABC, abstractmethod
import base64
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
import hashlib
import hmac
import json
import logging
import os
import secrets
import threading
import time
from typing import Any, Deque, Dict, List, Optional

from fastapi import HTTPException, Request

logger = logging.getLogger("ai_portal.security")

_DAILY_SALT_STATE: Dict[str, str] = {"day": "", "salt": ""}
_SALT_LOCK = threading.Lock()


def hash_client_session(raw_ip: str) -> str:
    """Computes an irreversible, daily-rotating salted hash (zero raw IP storage)."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    with _SALT_LOCK:
        if _DAILY_SALT_STATE["day"] != today:
            _DAILY_SALT_STATE["day"] = today
            _DAILY_SALT_STATE["salt"] = secrets.token_hex(16)
        salt = _DAILY_SALT_STATE["salt"]
    digest = hashlib.sha256(f"{salt}:{raw_ip}".encode("utf-8")).hexdigest()[:10]
    return f"anon-{digest}"


def extract_session_hash(request: Request) -> str:
    """Extracts forwarded client IP (Cloud Run / K8s ingress) and hashes immediately."""
    xff = request.headers.get("x-forwarded-for", "")
    raw_ip = xff.split(",")[0].strip() if xff else (request.client.host if request.client else "0.0.0.0")
    return hash_client_session(raw_ip)


def extract_access_key(request: Request) -> str:
    """Reads caller access token from `X-Portal-Access-Key` or Bearer header."""
    header_key = (request.headers.get("x-portal-access-key") or "").strip()
    if header_key:
        return header_key
    auth = (request.headers.get("authorization") or "").strip()
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return ""


def sign_invite_payload(payload: Dict[str, Any], master_secret: str) -> str:
    """Mints a stateless HMAC-SHA256 Magic Invite token (`INV1.<b64>.<sig>`)."""
    raw_json = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    b64_body = base64.urlsafe_b64encode(raw_json).decode("ascii").rstrip("=")
    sig = hmac.new(master_secret.encode("utf-8"), b64_body.encode("ascii"), hashlib.sha256).hexdigest()[:32]
    return f"INV1.{b64_body}.{sig}"


def verify_signed_invite_token(token: str, master_secret: str) -> Optional[Dict[str, Any]]:
    """Verifies a stateless `INV1.<b64>.<sig>` Magic Invite token and checks expiry."""
    if not token.startswith("INV1."):
        return None
    parts = token.split(".")
    if len(parts) != 3:
        return None
    _, b64_body, provided_sig = parts
    expected_sig = hmac.new(
        master_secret.encode("utf-8"),
        b64_body.encode("ascii"),
        hashlib.sha256,
    ).hexdigest()[:32]
    if not hmac.compare_digest(provided_sig, expected_sig):
        return None
    try:
        padded = b64_body + "=" * (-len(b64_body) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8"))
        exp = int(payload.get("exp", 0))
        if exp and int(time.time()) > exp:
            return None
        return payload
    except Exception:
        return None


@dataclass
class AccessDecision:
    """Resolved caller tier, effective model/judge rights, and mock-fallback flag."""

    tier: str
    label: str
    session_hash: str
    pass_id: str = ""
    force_mock: bool = False
    max_prompt_chars: int = 1200
    max_judges: int = 2
    model_scope: str = "public"
    allowed_models: List[str] = field(default_factory=list)
    rate_limit_per_min: int = 10
    daily_limit: int = 200
    daily_used: int = 0
    admin_console_available: bool = False


class BaseAccessPolicyGuard(ABC):
    """Abstract contract for 3-tier access control, quotas, and audit telemetry."""

    @abstractmethod
    def inspect_tier(self, request: Request) -> AccessDecision:
        """Non-mutating tier & quota status lookup for `GET /api/v1/auth/tier`."""
        raise NotImplementedError

    @abstractmethod
    def authorize_request(self, request: Request, prompt_text: str, endpoint: str) -> AccessDecision:
        """Enforces rate limits, prompt size bounds, and daily live-LLM quotas."""
        raise NotImplementedError

    @abstractmethod
    def filter_models(self, all_models: List[Dict[str, str]], decision: AccessDecision) -> List[Dict[str, str]]:
        """Filters visible/selectable LiteLLM models according to caller tier."""
        raise NotImplementedError

    def record_question_event(
        self,
        decision: AccessDecision,
        channel: str,
        raw_question: str,
        model_used: str,
        verdict_label: str,
        extra: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Optional hook implemented by private Enterprise Admin Console plugin."""
        return None

    def record_problem_event(
        self,
        session_hash: str,
        category: str,
        detail: str,
        endpoint: str = "",
    ) -> None:
        """Optional hook implemented by private Enterprise Admin Console plugin."""
        return None

class EnvStaticAccessGuard(BaseAccessPolicyGuard):
    """Open-Core 3-Tier Access Guard configured via `.env` variables."""

    _PLACEHOLDER_MASTER_KEYS = frozenset(
        {
            "",
            "change-me-in-production-k8s-secret",
            "replace-with-strong-random-master-key",
        }
    )

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._rate_buckets: Dict[str, Deque[float]] = {}
        self._failed_auth_buckets: Dict[str, Deque[float]] = {}
        self._daily_day = ""
        self._daily_counts: Dict[str, int] = {}
        self._ephemeral_master_key = secrets.token_hex(32)
        self._warned_ephemeral = False

    def _master_key(self) -> str:
        configured = os.getenv("PORTAL_MASTER_KEY", "").strip()
        if configured and configured not in self._PLACEHOLDER_MASTER_KEYS:
            return configured
        if not self._warned_ephemeral:
            logger.warning(
                "PORTAL_MASTER_KEY is unset or placeholder; using an ephemeral per-process random master key."
            )
            self._warned_ephemeral = True
        return self._ephemeral_master_key

    def _parse_env_user_keys(self) -> Dict[str, str]:
        raw = os.getenv("PORTAL_USER_ACCESS_KEYS", "").strip()
        mapping: Dict[str, str] = {}
        for entry in raw.split(","):
            entry = entry.strip()
            if not entry:
                continue
            if ":" in entry:
                k, lbl = entry.split(":", 1)
                mapping[k.strip()] = lbl.strip() or "Invited User"
            else:
                mapping[entry] = "Invited User"
        return mapping

    def _public_models(self) -> List[str]:
        raw = os.getenv("PUBLIC_ALLOWED_MODELS", "gemini-3.8-flash,ministral-14b-latest")
        return [m.strip() for m in raw.split(",") if m.strip()]

    def _user_models(self) -> List[str]:
        raw = os.getenv(
            "USER_ALLOWED_MODELS",
            "gemini-3.8-flash,ministral-14b-latest,codestral-2508,deepseek-ai/deepseek-v4-flash-0731",
        )
        return [m.strip() for m in raw.split(",") if m.strip()]

    def _roll_day_locked(self) -> None:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if self._daily_day != today:
            self._daily_day = today
            self._daily_counts.clear()

    def _check_bruteforce_locked(self, session_hash: str, failed: bool) -> None:
        now = time.monotonic()
        bucket = self._failed_auth_buckets.setdefault(session_hash, deque())
        while bucket and (now - bucket[0]) > 300.0:
            bucket.popleft()
        if len(bucket) >= 8:
            raise HTTPException(
                status_code=429,
                detail="Too many invalid access key attempts. Try again in 5 minutes.",
            )
        if failed:
            bucket.append(now)

    def _resolve_identity(self, request: Request, record_failures: bool) -> AccessDecision:
        session_hash = extract_session_hash(request)
        key = extract_access_key(request)
        master = self._master_key()

        pub_rpm = int(os.getenv("PUBLIC_RATE_LIMIT_PER_MIN", "10"))
        pub_daily = int(os.getenv("PUBLIC_DAILY_LIVE_LLM_CAP", "200"))
        pub_chars = int(os.getenv("PUBLIC_MAX_PROMPT_CHARS", "1200"))
        user_rpm = int(os.getenv("USER_RATE_LIMIT_PER_MIN", "60"))
        user_daily = int(os.getenv("USER_DAILY_LIVE_LLM_CAP", "1000"))
        user_chars = int(os.getenv("USER_MAX_PROMPT_CHARS", "6000"))

        with self._lock:
            self._roll_day_locked()
            if key:
                self._check_bruteforce_locked(session_hash, failed=False)
                if master and hmac.compare_digest(key, master):
                    return AccessDecision(
                        tier="admin",
                        label="Portal Admin",
                        session_hash=session_hash,
                        pass_id="admin-master",
                        force_mock=False,
                        max_prompt_chars=32000,
                        max_judges=4,
                        model_scope="all",
                        allowed_models=[],
                        rate_limit_per_min=9999,
                        daily_limit=999999,
                        daily_used=self._daily_counts.get("admin", 0),
                        admin_console_available=False,
                    )

                signed = verify_signed_invite_token(key, master)
                if signed:
                    pid = str(signed.get("pid", "invite-pass"))
                    used = self._daily_counts.get(f"pass:{pid}", 0)
                    d_lim = int(signed.get("day", user_daily))
                    m_scope = str(signed.get("mdl", "user"))
                    return AccessDecision(
                        tier="user",
                        label=str(signed.get("lbl", "VIP Invite")),
                        session_hash=session_hash,
                        pass_id=pid,
                        force_mock=(used >= d_lim),
                        max_prompt_chars=user_chars,
                        max_judges=3,
                        model_scope=m_scope,
                        allowed_models=[] if m_scope == "all" else self._user_models(),
                        rate_limit_per_min=int(signed.get("rpm", user_rpm)),
                        daily_limit=d_lim,
                        daily_used=used,
                    )

                for cand_key, lbl in self._parse_env_user_keys().items():
                    if hmac.compare_digest(key, cand_key):
                        kh = hashlib.sha256(cand_key.encode("utf-8")).hexdigest()[:8]
                        used = self._daily_counts.get(f"pass:ukey-{kh}", 0)
                        return AccessDecision(
                            tier="user",
                            label=lbl,
                            session_hash=session_hash,
                            pass_id=f"ukey-{kh}",
                            force_mock=(used >= user_daily),
                            max_prompt_chars=user_chars,
                            max_judges=3,
                            model_scope="user",
                            allowed_models=self._user_models(),
                            rate_limit_per_min=user_rpm,
                            daily_limit=user_daily,
                            daily_used=used,
                        )

                if record_failures:
                    self._check_bruteforce_locked(session_hash, failed=True)
                    raise HTTPException(status_code=403, detail="Invalid or expired Access Pass.")

            pub_used = self._daily_counts.get("public_pool", 0)
            return AccessDecision(
                tier="anonymous",
                label="Public Guest",
                session_hash=session_hash,
                pass_id="public",
                force_mock=(pub_used >= pub_daily),
                max_prompt_chars=pub_chars,
                max_judges=2,
                model_scope="public",
                allowed_models=self._public_models(),
                rate_limit_per_min=pub_rpm,
                daily_limit=pub_daily,
                daily_used=pub_used,
            )

    def inspect_tier(self, request: Request) -> AccessDecision:
        return self._resolve_identity(request, record_failures=True)

    def authorize_request(self, request: Request, prompt_text: str, endpoint: str) -> AccessDecision:
        decision = self._resolve_identity(request, record_failures=True)
        if len(prompt_text) > decision.max_prompt_chars:
            raise HTTPException(
                status_code=413,
                detail=f"Prompt exceeds {decision.tier} tier limit ({decision.max_prompt_chars} chars).",
            )

        if decision.tier != "admin":
            bucket_key = f"{decision.tier}:{decision.pass_id or decision.session_hash}"
            now = time.monotonic()
            with self._lock:
                q = self._rate_buckets.setdefault(bucket_key, deque())
                while q and (now - q[0]) > 60.0:
                    q.popleft()
                if len(q) >= decision.rate_limit_per_min:
                    raise HTTPException(
                        status_code=429,
                        detail=f"Rate limit reached ({decision.rate_limit_per_min} req/min for {decision.label}).",
                    )
                q.append(now)

        with self._lock:
            self._roll_day_locked()
            counter_key = (
                "public_pool"
                if decision.tier == "anonymous"
                else ("admin" if decision.tier == "admin" else f"pass:{decision.pass_id}")
            )
            cur = self._daily_counts.get(counter_key, 0)
            if decision.tier != "admin" and cur >= decision.daily_limit:
                decision.force_mock = True
            else:
                self._daily_counts[counter_key] = cur + 1
                decision.daily_used = cur + 1

        return decision

    def filter_models(
        self,
        all_models: List[Dict[str, str]],
        decision: AccessDecision,
    ) -> List[Dict[str, str]]:
        if decision.tier == "admin" or decision.model_scope == "all" or not decision.allowed_models:
            return all_models
        allowed = set(decision.allowed_models)
        filtered = [m for m in all_models if m.get("id") in allowed]
        return filtered or all_models[:2]
