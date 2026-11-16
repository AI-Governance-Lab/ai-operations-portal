# 🛡️ Live Execution Proof of Work
## Category: AEGIS Interactive Governance Concierge
### Title: Dual-Mode Explanation (Plain Executive Words vs. Principal Architect / CISO SME)

**Description:**
Demonstrates the built-in **AEGIS** portal guide translating the exact same HIPAA/PCI Token Vault scenario for non-technical executives (`audience_mode: "normal"`) and Principal Architects / CISOs (`audience_mode: "sme"`).

---

### 🌐 API Endpoint Metadata
* **HTTP Method:** `POST`
* **Request URL:** `http://localhost:8000/api/v1/assistant/chat`
* **Response Status Code:** `200` / `200`

---

### 💻 Live `cURL` Commands
```bash
# Executive / Non-Technical Mode
curl -s -X POST http://localhost:8000/api/v1/assistant/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain Step 1 nurse HIPAA case", "audience_mode": "normal", "active_tab": "security"}' | jq .

# Principal Architect / CISO SME Mode
curl -s -X POST http://localhost:8000/api/v1/assistant/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain Step 1 nurse HIPAA case", "audience_mode": "sme", "active_tab": "security"}' | jq .
```

---

### 📤 Live Response Payloads (JSON Output)
```json
// audience_mode: "normal"
{
  "agent_name": "AEGIS",
  "audience_mode": "normal",
  "source": "curated-cloudrun-guide",
  "topic": "step1",
  "suggested_tab": "security",
  "reply": "**Step 1 Demo Case (Privacy Shield \u2014 Hospital Nurse Example):** Imagine a nurse pastes *'Patient Elena Rostova, ID MRN-994821, paid with Visa 4532-8910-2234-7788'* into an AI helper to write a discharge note. Without this portal, that real medical ID and credit card go straight to the AI provider. **Stage 1** swaps them in milliseconds with safe nicknames (`<VAULT:HIPAA_MRN:...>`), lets the AI write the note using those nicknames, and only swaps the real details back inside your hospital network."
}
```

```json
// audience_mode: "sme"
{
  "agent_name": "AEGIS",
  "audience_mode": "sme",
  "source": "curated-cloudrun-guide",
  "topic": "step1",
  "suggested_tab": "security",
  "reply": "**Stage 1 SME Case (`BasePrivacyScrubber` \u2014 HIPAA/PCI Vaulting):** Inbound payloads undergo regex/ontology span tokenization prior to upstream dispatch. In Enterprise mode, sensitive spans (`HIPAA_MRN`, `PCI_CARD`, `IBAN`, `CAD_DWG`, `API_SECRET`) are replaced with deterministic per-tenant `HMAC-SHA256(master_key, tenant:cat:span)` vault markers. Upstream LiteLLM endpoints process zero raw PII/PHI, while authorized internal callers can invoke authenticated `rehydrate_payload()` reversal."
}
```
