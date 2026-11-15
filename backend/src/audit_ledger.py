"""
Cryptographic Audit Ledger & SHA-256 Tamper-Evident Chaining (`audit_ledger.py`).

Architectural Scope:
    Provides verifiable non-repudiation for intercepted LLM transactions by
    chaining SHA-256 digests across sequential governance events.

Boundary Separation:
    - PUBLIC TELEMETRY HOOKS: Exposes ledger append latency to Prometheus and
      implements the open-core SHA-256 structural envelope contract.
    - PRIVATE ENTERPRISE SHELL: Hardware Security Module (HSM) signing, RFC-3161
      trusted timestamping authorities, and immutable WORM storage sinks are
      managed via private enterprise R&D configurations.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import time
from typing import Dict, Any, List

from .aiops_metrics import PIPELINE_LATENCY_SECONDS


@dataclass(frozen=True)
class AuditLedgerBlock:
    """Immutable representation of a single hash-chained audit record."""

    sequence_id: int
    timestamp_utc: str
    tenant_id: str
    previous_hash: str
    payload_digest: str
    block_hash: str
    ledger_mode: str = "open-core-ephemeral-chain"


class BaseAuditLedger(ABC):
    """Abstract interface for tamper-evident cryptographic audit trails."""

    @abstractmethod
    def append_record(
        self,
        tenant_id: str,
        prompt_text: str,
        completion_text: str,
        governance_metadata: Dict[str, Any],
    ) -> AuditLedgerBlock:
        """Computes a chained SHA-256 digest and appends an immutable audit block."""
        raise NotImplementedError


class EphemeralSHA256Ledger(BaseAuditLedger):
    """
    Open-Core SHA-256 Hash-Chaining Shell.

    Maintains an in-memory genesis-anchored SHA-256 chain for local inspection
    and Prometheus latency tracking without external database lock-in.
    """

    GENESIS_HASH = "0" * 64

    def __init__(self) -> None:
        self._chain: List[AuditLedgerBlock] = []

    def append_record(
        self,
        tenant_id: str,
        prompt_text: str,
        completion_text: str,
        governance_metadata: Dict[str, Any],
    ) -> AuditLedgerBlock:
        start_ts = time.perf_counter()

        seq_id = len(self._chain) + 1
        prev_hash = self._chain[-1].block_hash if self._chain else self.GENESIS_HASH
        now_iso = datetime.now(timezone.utc).isoformat()

        # Compute deterministic SHA-256 digest of the string interaction payload
        payload_material = f"{prompt_text}||{completion_text}||{governance_metadata}".encode("utf-8")
        payload_digest = hashlib.sha256(payload_material).hexdigest()

        # --------------------------------------------------------------------
        # PRIVATE ENTERPRISE R&D HOOK OUTLINE:
        # 1. Sign `prev_hash + payload_digest + now_iso` via PKCS#11 HSM key.
        # 2. Anchor Merkle root batch to air-gapped WORM compliance storage.
        # --------------------------------------------------------------------
        chain_material = f"{seq_id}:{now_iso}:{tenant_id}:{prev_hash}:{payload_digest}".encode("utf-8")
        block_hash = hashlib.sha256(chain_material).hexdigest()

        block = AuditLedgerBlock(
            sequence_id=seq_id,
            timestamp_utc=now_iso,
            tenant_id=tenant_id,
            previous_hash=prev_hash,
            payload_digest=payload_digest,
            block_hash=block_hash,
        )
        self._chain.append(block)

        elapsed_sec = time.perf_counter() - start_ts
        # PUBLIC TELEMETRY HOOK: Export ledger chaining latency to Prometheus
        PIPELINE_LATENCY_SECONDS.labels(stage="audit_ledger", model_group="all").observe(elapsed_sec)

        return block

    def get_recent_blocks(self, limit: int = 25) -> List[AuditLedgerBlock]:
        """Returns the most recent audit blocks for executive portal inspection."""
        return self._chain[-limit:]
