#!/usr/bin/env bash
set -eu
cd /work/deployments/finetune

pip install -q psutil "trl>=0.15" "datasets>=3.0" "transformers>=4.46,<5.0" accelerate bitsandbytes peft
pip install -q unsloth --no-deps
pip install -q unsloth_zoo tyro sentencepiece protobuf huggingface_hub pydantic rich structlog typer nest-asyncio diffusers

python - <<'PY'
import torch
print("torch", torch.__version__, "cuda", torch.cuda.is_available())
if torch.cuda.is_available():
    x = torch.randn(2, 2, device="cuda")
    print("gpu", torch.cuda.get_device_name(0), "cuda_tensor_ok", float(x.sum()))
PY

python compare_lora_final_30.py \
  --config compare_prompts_final_30.json \
  --output-dir ../../training-output/lora-full-final-30-comparison \
  --report-path ../../peft-final-30-comparison-report.md
