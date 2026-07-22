#!/usr/bin/env bash
# Fails if browser-side LLM packages appear in the frontend tree.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$ROOT/../frontend"

PATTERN='@mlc-ai|web-llm|@mlc-ai/web-llm|CreateMLCEngine|webgpu.*llm'
if rg -i "$PATTERN" "$FRONTEND/src" "$FRONTEND/package.json" 2>/dev/null; then
  echo "Browser LLM dependency detected — frontend must stay API-only." >&2
  exit 1
fi
echo "OK: no browser LLM imports in frontend"
