#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# AI Operations Portal — Hardened Google Cloud Run Deployment Script
# Enforces strict GCP compute caps (--max-instances=2, --cpu-throttling) +
# 3-Tier LLM Anti-Abuse Quotas (Strategy B: Capped Live Flash + $0 Auto-Mock)
# ============================================================================

SERVICE_NAME="${SERVICE_NAME:-ai-operations-portal}"
REGION="${REGION:-europe-west1}"

echo "Deploying ${SERVICE_NAME} to Google Cloud Run (${REGION}) with strict anti-abuse caps..."

gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --region "${REGION}" \
  --allow-unauthenticated \
  --max-instances=2 \
  --min-instances=0 \
  --cpu=1 \
  --memory=512Mi \
  --concurrency=40 \
  --timeout=25s \
  --cpu-throttling \
  --set-env-vars="ENABLE_SWAGGER_DOCS=false,PUBLIC_RATE_LIMIT_PER_MIN=10,PUBLIC_DAILY_LIVE_LLM_CAP=200,PUBLIC_MAX_PROMPT_CHARS=1200,PUBLIC_ALLOWED_MODELS=gemini-3.8-flash"
