"""Unit tests for the public Open-Core appliance & dynamic plugin contract."""

import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient


class TestOpenCoreAppliance(unittest.TestCase):
    """Validates standalone Open-Core behavior without private plugins."""

    def test_forced_open_core_bundle(self) -> None:
        from src.plugin_loader import load_governance_bundle

        with patch.dict(os.environ, {"AI_PORTAL_EDITION": "open-core"}):
            bundle = load_governance_bundle()
            self.assertEqual(bundle.edition, "open-core")
            self.assertEqual(bundle.loaded_plugins["scrubber"], "OpenCorePassthroughScrubber")
            self.assertEqual(bundle.loaded_plugins["judge_council"], "MockAsyncJudgeCouncil")
            self.assertEqual(bundle.loaded_plugins["audit_ledger"], "EphemeralSHA256Ledger")
            self.assertEqual(len(bundle.routers), 0)

    def test_public_gateway_endpoints(self) -> None:
        from src.main import app

        client = TestClient(app)
        health = client.get("/health")
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.json()["status"], "healthy")

        edition = client.get("/api/v1/edition")
        self.assertEqual(edition.status_code, 200)
        self.assertIn(edition.json()["edition"], ("open-core", "enterprise"))

        metrics = client.get("/metrics")
        self.assertEqual(metrics.status_code, 200)
        self.assertIn("ai_portal_process_cpu_percent", metrics.text)

        spa = client.get("/")
        self.assertEqual(spa.status_code, 200)
        self.assertNotIn("import.meta", spa.text)

        avatar_normal = client.get("/images/aegis-normal.jpg")
        self.assertEqual(avatar_normal.status_code, 200)
        avatar_sme = client.get("/images/aegis-sme.jpg")
        self.assertEqual(avatar_sme.status_code, 200)

    def test_aegis_assistant_normal_and_sme_cloudrun_safe(self) -> None:
        from src.main import app

        client = TestClient(app)
        with patch.dict(os.environ, {"LITELLM_PROXY_MODE": "local-mock-fallback"}):
            plain = client.post(
                "/api/v1/assistant/chat",
                json={
                    "message": "Explain Step 1 nurse HIPAA case",
                    "audience_mode": "normal",
                    "active_tab": "security",
                },
            )
            self.assertEqual(plain.status_code, 200)
            self.assertEqual(plain.json()["agent_name"], "AEGIS")
            self.assertEqual(plain.json()["audience_mode"], "normal")
            self.assertEqual(plain.json()["suggested_tab"], "security")

            sme = client.post(
                "/api/v1/assistant/chat",
                json={
                    "message": "How do public Cloud Run and private enterprise repo stay separated?",
                    "audience_mode": "sme",
                    "active_tab": "workflow",
                },
            )
            self.assertEqual(sme.status_code, 200)
            self.assertEqual(sme.json()["audience_mode"], "sme")
            self.assertIn("BasePrivacyScrubber", sme.json()["reply"])

    def test_master_key_never_uses_predictable_public_default(self) -> None:
        from src.main import app
        from src.security_guard import EnvStaticAccessGuard

        guard = EnvStaticAccessGuard()
        with patch.dict(os.environ, {"PORTAL_MASTER_KEY": ""}, clear=False):
            key_a = guard._master_key()
            self.assertGreaterEqual(len(key_a), 32)
            self.assertNotEqual(key_a, "sk-sovereign-gateway-local-master")

        with patch.dict(os.environ, {"PORTAL_MASTER_KEY": "change-me-in-production-k8s-secret"}, clear=False):
            self.assertNotEqual(guard._master_key(), "change-me-in-production-k8s-secret")

        client = TestClient(app)
        open_core_guard = EnvStaticAccessGuard()
        with patch("src.main.access_guard", open_core_guard), patch.dict(
            os.environ, {"PORTAL_MASTER_KEY": ""}, clear=False
        ):
            resp = client.get(
                "/api/v1/auth/tier",
                headers={"X-Portal-Access-Key": "sk-sovereign-gateway-local-master"},
            )
            self.assertEqual(resp.status_code, 403)


if __name__ == "__main__":
    unittest.main()
