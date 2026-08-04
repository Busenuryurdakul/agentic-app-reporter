#!/usr/bin/env python3
"""Merge a LoRA adapter into the base model."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from _utils import (  # noqa: E402
    PROJECT_ROOT,
    choose_torch_dtype,
    detect_device,
    free_disk_gb,
    resolve_project_path,
    torch_dtype_from_name,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="LoRA adapter birleştirme")
    parser.add_argument("--base-model", required=True)
    parser.add_argument("--adapter-dir", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument(
        "--cpu-offload",
        action="store_true",
        help="Birleştirmeyi CPU belleğinde yap (daha yavaş, daha güvenli)",
    )
    parser.add_argument(
        "--min-free-gb",
        type=float,
        default=8.0,
        help="Başlamadan önce gereken minimum boş disk alanı (GB)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    adapter_dir = resolve_project_path(args.adapter_dir)
    output_dir = resolve_project_path(args.output_dir)

    if not adapter_dir.exists():
        print(f"FAIL  Adapter dizini bulunamadı: {adapter_dir}", file=sys.stderr)
        return 1

    free_gb = free_disk_gb(output_dir.parent)
    if free_gb is not None and free_gb < args.min_free_gb:
        print(
            f"FAIL  Yetersiz disk alanı: {free_gb} GB boş, en az {args.min_free_gb} GB gerekli.",
            file=sys.stderr,
        )
        return 1

    print("NOT   Birleştirme işlemi yüksek RAM/VRAM tüketebilir.")
    print("NOT   Kaynak adapter dosyaları değiştirilmeyecek.")

    device, _ = detect_device()
    target_device = "cpu" if args.cpu_offload else device
    dtype_name = "float32" if target_device == "cpu" else choose_torch_dtype(device)

    from peft import PeftModel
    from transformers import AutoModelForCausalLM, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    base_model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        dtype=torch_dtype_from_name(dtype_name),
        trust_remote_code=True,
        low_cpu_mem_usage=True,
    )
    if target_device == "cpu":
        base_model = base_model.to("cpu")
    else:
        base_model = base_model.to(target_device)

    peft_model = PeftModel.from_pretrained(base_model, str(adapter_dir))
    merged_model = peft_model.merge_and_unload()

    output_dir.mkdir(parents=True, exist_ok=True)
    merged_model.save_pretrained(str(output_dir), safe_serialization=True)
    tokenizer.save_pretrained(str(output_dir))

    print("Birleştirme tamamlandı.")
    print(f"  Çıktı: {output_dir.relative_to(PROJECT_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
