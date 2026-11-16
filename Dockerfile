# ============================================================================
# AI Operations Portal — Cloud Run & Universal Kubernetes Single-Container Image
# Bundles FastAPI Governance Gateway + React 18 Executive UI (Open-Core)
# Compatible with: Google Cloud Run (${PORT}), K3s, GKE, EKS, AKS & OpenShift
# ============================================================================
FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt \
    && mkdir -p /app/plugins /tmp/portal \
    && chgrp -R 0 /app /tmp/portal \
    && chmod -R g=u /app /tmp/portal

COPY backend/ /app/
COPY frontend/src/ /app/frontend/src/
COPY frontend/public/ /app/frontend/public/

ENV PYTHONUNBUFFERED=1 \
    AI_PORTAL_PLUGINS_DIR=/app/plugins \
    LITELLM_PROXY_MODE=local-mock-fallback \
    ENABLE_SWAGGER_DOCS=false \
    PUBLIC_RATE_LIMIT_PER_MIN=10 \
    PUBLIC_DAILY_LIVE_LLM_CAP=200 \
    PUBLIC_MAX_PROMPT_CHARS=1200 \
    PORT=8000

# Non-root UID 1001 (OpenShift arbitrary-UID & Cloud Run hardened compatible)
USER 1001:0

EXPOSE 8000

CMD ["sh", "-c", "uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
