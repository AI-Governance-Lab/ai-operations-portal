# 🛡️ Live Execution Proof of Work
## Category: LiteLLM Routing & Zero-PII Access Control
### Title: Dynamic Model Catalog & 3-Tier GDPR-Safe Access Verification

**Description:**
Discovers available chat/judge models from the configured LiteLLM gateway (or built-in demo catalog) and verifies the caller's GDPR-safe salted session hash (`anon-xxxxxxxxxx`) and tier quotas.

---

### 🌐 API Endpoint Metadata
* **HTTP Method:** `GET`
* **Request URLs:** `http://localhost:8000/api/v1/models` · `http://localhost:8000/api/v1/auth/tier`
* **Response Status Code:** `200` / `200`

---

### 💻 Live `cURL` Commands
```bash
curl -s http://localhost:8000/api/v1/models | jq .
curl -s http://localhost:8000/api/v1/auth/tier | jq .
```

---

### 📤 Live Response Payloads (JSON Output)
```json
// GET /api/v1/models
{
  "connected": false,
  "mode": "local-mock-fallback",
  "endpoint": "builtin-demo-catalog",
  "default_model": "gemini-3.8-flash",
  "default_judges": [
    "gemini-3.8-flash",
    "ministral-14b-latest"
  ],
  "models": [
    {
      "id": "gemini-3.8-flash",
      "provider": "Vertex AI (Demo)",
      "role": "fast-judge"
    },
    {
      "id": "ministral-14b-latest",
      "provider": "Mistral (Demo)",
      "role": "fast-judge"
    }
  ],
  "caller_tier": "anonymous"
}
```

```json
// GET /api/v1/auth/tier
{
  "tier": "anonymous",
  "label": "Public Guest",
  "session_hash": "anon-9a2dae0990",
  "pass_id": "public",
  "force_mock": false,
  "max_prompt_chars": 1200,
  "max_judges": 2,
  "model_scope": "public",
  "allowed_models": [
    "gemini-3.8-flash",
    "ministral-14b-latest"
  ],
  "rate_limit_per_min": 10,
  "daily_limit": 200,
  "daily_used": 0,
  "admin_console_available": false
}
```
