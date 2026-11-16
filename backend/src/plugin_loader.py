"""
Dynamic Open-Core / Enterprise Plugin Loader (`plugin_loader.py`).

Connects the public Open-Core appliance (`ai-operations-portal`) to optional
private Enterprise extension packages (`ai-operations-portal-enterprise`) with
zero hard dependencies when running standalone.
"""

from dataclasses import dataclass, field
import importlib
from importlib.metadata import entry_points
import logging
import os
from pathlib import Path
import sys
from typing import Any, Dict, Iterable, List

from fastapi import APIRouter

from .aiops_metrics import AbstractAnomalyPredictor
from .audit_ledger import BaseAuditLedger, EphemeralSHA256Ledger
from .compliance_judges import BaseComplianceJudgeCouncil, MockAsyncJudgeCouncil
from .privacy_scrubber import BasePrivacyScrubber, OpenCorePassthroughScrubber
from .security_guard import BaseAccessPolicyGuard, EnvStaticAccessGuard

logger = logging.getLogger("ai_portal.plugins")
ENTRY_POINT_GROUP = "ai_portal.plugins"


@dataclass
class GovernanceRuntimeBundle:
    """Active governance engine instances and edition metadata."""

    edition: str
    plugin_source: str
    scrubber: BasePrivacyScrubber
    judge_council: BaseComplianceJudgeCouncil
    audit_ledger: BaseAuditLedger
    anomaly_predictor: AbstractAnomalyPredictor
    access_guard: BaseAccessPolicyGuard = field(default_factory=EnvStaticAccessGuard)
    routers: List[APIRouter] = field(default_factory=list)
    loaded_plugins: Dict[str, str] = field(default_factory=dict)


def _iter_plugin_entry_points(group: str) -> Iterable[Any]:
    """Entry-point lookup compatible with Python 3.9 and Python 3.10+."""
    eps = entry_points()
    if hasattr(eps, "select"):
        return eps.select(group=group)
    if isinstance(eps, dict):
        return eps.get(group, ())
    return ()


def _resolve_target(candidate: Any) -> Any:
    """Instantiates classes or invokes zero-arg factories when needed."""
    if isinstance(candidate, APIRouter):
        return candidate
    if isinstance(candidate, type):
        return candidate()
    if callable(candidate) and not isinstance(
        candidate,
        (
            BasePrivacyScrubber,
            BaseComplianceJudgeCouncil,
            BaseAuditLedger,
            AbstractAnomalyPredictor,
            BaseAccessPolicyGuard,
        ),
    ):
        return candidate()
    return candidate


def _apply_components(
    components: Dict[str, Any],
    bundle: GovernanceRuntimeBundle,
    source_label: str,
) -> int:
    """Validates and binds enterprise plugin instances onto the runtime bundle."""
    applied = 0
    contract_map = (
        ("scrubber", BasePrivacyScrubber),
        ("judge_council", BaseComplianceJudgeCouncil),
        ("audit_ledger", BaseAuditLedger),
        ("anomaly_predictor", AbstractAnomalyPredictor),
        ("access_guard", BaseAccessPolicyGuard),
    )
    for key, base_cls in contract_map:
        raw = components.get(key)
        if raw is None:
            continue
        inst = _resolve_target(raw)
        if isinstance(inst, base_cls):
            setattr(bundle, key, inst)
            bundle.loaded_plugins[key] = type(inst).__name__
            applied += 1

    router_raw = components.get("router")
    if router_raw is not None:
        router_obj = _resolve_target(router_raw)
        if isinstance(router_obj, APIRouter):
            bundle.routers.append(router_obj)
            bundle.loaded_plugins["router"] = router_obj.prefix or "enterprise_router"
            applied += 1

    if applied > 0:
        bundle.edition = "enterprise"
        bundle.plugin_source = source_label
    return applied


def load_governance_bundle() -> GovernanceRuntimeBundle:
    """Discovers Enterprise plugins or falls back cleanly to Open-Core shells."""
    scrubber = OpenCorePassthroughScrubber()
    judge_council = MockAsyncJudgeCouncil()
    audit_ledger = EphemeralSHA256Ledger()
    anomaly_predictor = AbstractAnomalyPredictor()
    access_guard = EnvStaticAccessGuard()

    bundle = GovernanceRuntimeBundle(
        edition="open-core",
        plugin_source="open-core-builtin",
        scrubber=scrubber,
        judge_council=judge_council,
        audit_ledger=audit_ledger,
        anomaly_predictor=anomaly_predictor,
        access_guard=access_guard,
        routers=[],
        loaded_plugins={
            "scrubber": type(scrubber).__name__,
            "judge_council": type(judge_council).__name__,
            "audit_ledger": type(audit_ledger).__name__,
            "anomaly_predictor": type(anomaly_predictor).__name__,
            "access_guard": type(access_guard).__name__,
        },
    )

    if os.getenv("AI_PORTAL_EDITION", "auto").strip().lower() == "open-core":
        bundle.plugin_source = "forced-open-core-env"
        return bundle

    plugins_dir = Path(os.getenv("AI_PORTAL_PLUGINS_DIR", "/app/plugins"))
    if plugins_dir.is_dir():
        resolved_dir = str(plugins_dir.resolve())
        if resolved_dir not in sys.path:
            sys.path.insert(0, resolved_dir)

    ep_components: Dict[str, Any] = {}
    for ep in _iter_plugin_entry_points(ENTRY_POINT_GROUP):
        try:
            target = ep.load()
            if ep.name == "bundle" and callable(target):
                res = target()
                if isinstance(res, dict):
                    ep_components.update(res)
            else:
                ep_components[ep.name] = target
        except Exception as exc:
            logger.warning("Skipping plugin entry_point '%s': %s", ep.name, exc)

    if ep_components:
        _apply_components(ep_components, bundle, f"entry_points:{ENTRY_POINT_GROUP}")
        return bundle

    mod_name = os.getenv("AI_PORTAL_PLUGIN_MODULE", "ai_portal_enterprise").strip()
    if mod_name:
        try:
            mod = importlib.import_module(mod_name)
            reg_fn = getattr(mod, "register_enterprise_plugins", None)
            if callable(reg_fn):
                res = reg_fn()
                if isinstance(res, dict):
                    _apply_components(res, bundle, f"module:{mod_name}")
        except ModuleNotFoundError:
            pass
        except Exception as exc:
            logger.warning("Failed loading enterprise module '%s': %s", mod_name, exc)

    return bundle
