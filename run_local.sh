#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# AI Operations Portal - Turnkey Local Stack Launcher (run_local.sh)
# 1. Verifies local .env presence (auto-initializes from .env.example if absent)
# 2. Builds container images and starts the 4-service stack detached (-d)
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

echo "[1/3] Checking local environment configuration (.env)..."
if [ -f "${SCRIPT_DIR}/.env" ]; then
  echo "      Found existing .env configuration."
else
  echo "      No .env found. Initializing .env from .env.example..."
  cp "${SCRIPT_DIR}/.env.example" "${SCRIPT_DIR}/.env"
fi

echo "[2/3] Detecting container compose runtime..."
if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
elif command -v podman-compose >/dev/null 2>&1; then
  COMPOSE_CMD="podman-compose"
else
  COMPOSE_CMD="docker compose"
fi

echo "[3/3] Building and launching AI Operations Portal stack (detached)..."
${COMPOSE_CMD} -f "${SCRIPT_DIR}/deploy/docker-compose.yml" up -d --build

echo "--------------------------------------------------------------------"
echo "AI Operations Portal Stack Status: RUNNING (AIR-GAPPED LOCAL MODE)"
echo "  - Frontend Command UI : http://localhost:3000"
echo "  - Backend API & Proxy : http://localhost:8000"
echo "  - Prometheus Metrics  : http://localhost:8000/metrics"
echo "  - Prometheus TSDB UI  : http://localhost:9090"
echo "  - Grafana Dashboards  : http://localhost:3001"
echo "--------------------------------------------------------------------"
