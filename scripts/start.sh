#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Prefer a local Node 20 binary if the system Node is too new for leftover tooling,
# but the modernized app targets Node >= 20 including current LTS.
NODE20="$HOME/.local/node-v20.19.4-darwin-arm64/bin"
if [[ -x "$NODE20/node" ]]; then
  NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
  if [[ "$NODE_MAJOR" -lt 20 ]]; then
    export PATH="$NODE20:$PATH"
  fi
fi

echo "Using $(node -v) — http://localhost:${PORT:-8080}"
exec node server.js
