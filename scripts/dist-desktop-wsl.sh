#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for dist:desktop but was not found in PATH." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE_DIR="${HOME}/.cache"

mkdir -p "${CACHE_DIR}/electron" "${CACHE_DIR}/electron-builder"

docker run --rm \
  -e ELECTRON_CACHE=/root/.cache/electron \
  -e ELECTRON_BUILDER_CACHE=/root/.cache/electron-builder \
  -v "${ROOT_DIR}:/project" \
  -v "${CACHE_DIR}/electron:/root/.cache/electron" \
  -v "${CACHE_DIR}/electron-builder:/root/.cache/electron-builder" \
  -w /project \
  electronuserland/builder:wine \
  /bin/bash -lc "npm ci && npm run build:desktop && npx electron-builder --win nsis --publish never"
