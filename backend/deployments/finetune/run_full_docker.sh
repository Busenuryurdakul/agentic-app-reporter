#!/usr/bin/env bash
set -eu
cd /work/deployments/finetune

pip install -q psutil "trl>=0.15" "datasets>=3.0" "transformers>=4.46,<5.0" accelerate bitsandbytes peft
pip install -q unsloth --no-deps
pip install -q unsloth_zoo tyro sentencepiece protobuf huggingface_hub pydantic rich structlog typer nest-asyncio diffusers

python train_lora.py \
  --dataset-dir ../../peft-export-final-30 \
  --output-dir ../../training-output/lora-full-final-30 \
  --epochs 3 \
  --batch-size 1 \
  --grad-accum 8 \
  --force
