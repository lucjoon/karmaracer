#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE20="$HOME/.local/node-v20.19.4-darwin-arm64/bin"
if [[ -x "$NODE20/node" ]]; then
  export PATH="$NODE20:$PATH"
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
if [[ "$NODE_MAJOR" -ge 23 ]]; then
  echo "Karma Racer needs Node 18–22 (found $(node -v))."
  echo "Node 25+ crashes Express static (fresh/send)."
  if [[ ! -x "$NODE20/node" ]]; then
    echo "Install Node 20, or place it at: $NODE20"
    exit 1
  fi
fi

cd "$ROOT"
echo "Using $(node -v) — http://localhost:8080"
exec node server.js
