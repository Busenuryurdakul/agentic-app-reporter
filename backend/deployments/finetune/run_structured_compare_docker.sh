#!/usr/bin/env bash
set -eu
cd /work/deployments/finetune

# Linux structured-spec-tool (build on host/CI if missing)
if [ ! -x bin/structured-spec-tool ]; then
  echo "ERROR: bin/structured-spec-tool missing. Build with golang image first." >&2
  exit 1
fi

pip install -q psutil "transformers>=4.46,<5.0" accelerate bitsandbytes peft
pip install -q unsloth --no-deps
pip install -q unsloth_zoo tyro sentencepiece protobuf huggingface_hub pydantic rich structlog typer nest-asyncio diffusers

python - <<'PY'
import torch
print("torch", torch.__version__, "cuda", torch.cuda.is_available())
if torch.cuda.is_available():
    print("gpu", torch.cuda.get_device_name(0))
PY

python compare_structured_lora_final_30.py \
  --config compare_prompts_structured_final_30.json \
  --output-dir ../../training-output/lora-full-final-30-structured-comparison \
  --report-path ../../peft-final-30-structured-comparison-report.md \
  --go-tool bin/structured-spec-tool
