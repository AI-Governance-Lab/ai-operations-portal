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


if __name__ == "__main__":
    unittest.main()
