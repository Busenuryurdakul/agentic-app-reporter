#!/usr/bin/env bash
# Serve adapter (8765) and base (8766) OpenAI-compatible endpoints in Docker GPU.
set -eu
cd /work/deployments/finetune

pip install -q fastapi uvicorn pydantic psutil "transformers>=4.46,<5.0" accelerate bitsandbytes peft
pip install -q unsloth --no-deps
pip install -q unsloth_zoo tyro sentencepiece protobuf huggingface_hub pydantic rich structlog typer nest-asyncio diffusers

ADAPTER_DIR="${ADAPTER_DIR:-../../training-output/lora-full-final-30/lora_adapter}"
BASE_PORT="${ADAPTER_PORT:-8765}"
FALLBACK_PORT="${BASE_PORT_FALLBACK:-8766}"

python serve_lora_openai.py \
  --adapter-dir "$ADAPTER_DIR" \
  --port "$BASE_PORT" \
  --max-seq-length 16384 &
PID_ADAPTER=$!

python serve_lora_openai.py \
  --port "$FALLBACK_PORT" \
  --max-seq-length 16384 &
PID_BASE=$!

echo "adapter_pid=$PID_ADAPTER port=$BASE_PORT model=product-spec-gemma-lora-v1"
echo "base_pid=$PID_BASE port=$FALLBACK_PORT model=product-spec-gemma-base-v1"

wait -n "$PID_ADAPTER" "$PID_BASE"
