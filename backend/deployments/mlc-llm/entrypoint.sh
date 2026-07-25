#!/usr/bin/env bash
set -euo pipefail

MODEL="${MLC_MODEL:-HF://mlc-ai/gemma-2b-it-q4f16_1-MLC}"
HOST="${MLC_HOST:-0.0.0.0}"
PORT="${MLC_PORT:-8080}"
MODE="${MLC_MODE:-local}"
DEVICE="${MLC_DEVICE:-auto}"

echo "Starting MLC-LLM serve"
echo "  model=${MODEL}"
echo "  host=${HOST} port=${PORT} mode=${MODE} device=${DEVICE}"

exec mlc_llm serve "${MODEL}" \
  --host "${HOST}" \
  --port "${PORT}" \
  --mode "${MODE}" \
  --device "${DEVICE}"
