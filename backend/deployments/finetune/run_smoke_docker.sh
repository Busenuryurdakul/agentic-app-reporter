#!/usr/bin/env bash
set -eu
cd /work/deployments/finetune

pip install -q psutil "trl>=0.15" "datasets>=3.0" "transformers>=4.46,<5.0" "accelerate>=1.0" "bitsandbytes>=0.44" "peft>=0.13"
pip install -q unsloth --no-deps
pip install -q unsloth_zoo tyro sentencepiece protobuf huggingface_hub hf_transfer pydantic rich structlog typer nest-asyncio diffusers

python - <<'PY'
import torch
print("torch", torch.__version__, "cuda", torch.cuda.is_available())
if torch.cuda.is_available():
    x = torch.randn(2, 2, device="cuda")
    print("gpu", torch.cuda.get_device_name(0), "cuda_tensor_ok", float(x.sum()))
PY

python smoke_lora_final_30.py \
  --dataset-dir ../../peft-export-final-30 \
  --output-dir ../../training-output/lora-smoke-final-30 \
  --report-path ../../peft-final-30-smoke-training-report.md \
  --max-steps 8 \
  --batch-size 1 \
  --grad-accum 2
