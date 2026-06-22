#!/usr/bin/env bash
#
# Performance Tracker — local dev launcher (macOS / Linux / Git Bash / WSL)
#
# Brings up the Docker backing services (Postgres + Mailpit), builds the shared
# package, optionally migrates + seeds, then runs the API and web dev servers
# together in this terminal. Press Ctrl+C to stop both.
#
# Usage (from anywhere):
#   ./scripts/dev.sh              # docker up + build shared + run API & web
#   ./scripts/dev.sh --migrate    # also run Prisma migrate + seed first
#   ./scripts/dev.sh --minio      # also start the optional MinIO service
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MIGRATE=false
MINIO=false
for arg in "$@"; do
  case "$arg" in
    --migrate) MIGRATE=true ;;
    --minio)   MINIO=true ;;
  esac
done

echo "==> Starting Docker services (Postgres + Mailpit)..."
if [ "$MINIO" = true ]; then docker compose --profile minio up -d; else docker compose up -d; fi

echo "==> Waiting for Postgres to become healthy..."
PG_ID="$(docker compose ps -q postgres)"
for _ in $(seq 1 30); do
  if [ "$(docker inspect --format '{{.State.Health.Status}}' "$PG_ID" 2>/dev/null)" = "healthy" ]; then break; fi
  sleep 2
done

echo "==> Building @perf-tracker/shared..."
pnpm build:shared

if [ "$MIGRATE" = true ]; then
  echo "==> Applying migrations and seeding..."
  pnpm db:migrate
fi

echo "==> Launching API (:3000) and web (:5173). Ctrl+C stops both."
echo "    Sign in with  admin@perf-tracker.local  /  ChangeMe123!"
trap 'kill 0' EXIT INT TERM
pnpm dev:api &
pnpm dev:web &
wait
