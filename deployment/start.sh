#!/bin/sh
set -eu
# A mounted volume is required for both SQLite and uploaded original PDFs.
gc_session_secret="${SESSION_SECRET:-}"
if [ -z "${PRIVATE_APP_PASSWORD:-}" ] || [ "${#gc_session_secret}" -lt 32 ]; then
  echo 'Configura PRIVATE_APP_PASSWORD y SESSION_SECRET (mínimo 32 caracteres).' >&2
  exit 1
fi
if [ "${GC_REQUIRE_PERSISTENT_VOLUME:-1}" = 1 ] && ! mountpoint -q /app/.local; then
  echo 'Falta el volumen persistente en /app/.local; arranque cancelado para evitar guardar datos en disco temporal.' >&2
  exit 1
fi
mkdir -p /app/.local/originals
if [ "$(id -u)" = 0 ]; then
  chown node:node /app/.local /app/.local/originals
  if [ -z "${DATABASE_URL:-}" ] && [ ! -f "${SQLITE_PATH:-/app/.local/gc-predictor.sqlite}" ] && [ -f deployment/seed/manifest.json ]; then
    gosu node node scripts/restore.mjs deployment/seed
  fi
  exec gosu node node node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port "${PORT:-3000}"
fi
exec node node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port "${PORT:-3000}"
