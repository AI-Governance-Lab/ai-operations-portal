# 🛡️ Live Execution Proof of Work
## Category: System Liveness & Open-Core Plugin Contract
### Title: Appliance Health Check & Edition Discovery

**Description:**
Verifies that the FastAPI governance middleware is healthy, exposes runtime CPU/RSS saturation via `psutil`, and reports active plugin bindings (`open-core` standalone mode vs. hot-swapped `enterprise` mode).

---

### 🌐 API Endpoint Metadata
* **HTTP Method:** `GET`
* **Request URLs:** `http://localhost:8000/health` · `http://localhost:8000/api/v1/edition`
* **Response Status Code:** `200` / `200`

---

### 💻 Live `cURL` Commands
```bash
curl -s http://localhost:8000/health | jq .
curl -s http://localhost:8000/api/v1/edition | jq .
```

---

### 📤 Live Response Payloads (JSON Output)
```json
// GET /health
{
  "status": "healthy",
  "edition": "open-core",
  "appliance_mode": "self-hosted-open-core",
  "plugin_source": "forced-open-core-env",
  "loaded_plugins": {
    "scrubber": "OpenCorePassthroughScrubber",
    "judge_council": "MockAsyncJudgeCouncil",
    "audit_ledger": "EphemeralSHA256Ledger",
    "anomaly_predictor": "AbstractAnomalyPredictor",
    "access_guard": "EnvStaticAccessGuard"
  },
  "runtime_saturation": {
    "process_cpu_percent": 0.0,
    "process_memory_rss_bytes": 52572160.0
  }
}
```

```json
// GET /api/v1/edition
{
  "edition": "open-core",
  "plugin_source": "forced-open-core-env",
  "loaded_plugins": {
    "scrubber": "OpenCorePassthroughScrubber",
    "judge_council": "MockAsyncJudgeCouncil",
    "audit_ledger": "EphemeralSHA256Ledger",
    "anomaly_predictor": "AbstractAnomalyPredictor",
    "access_guard": "EnvStaticAccessGuard"
  }
}
```
