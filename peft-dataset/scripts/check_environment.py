#!/usr/bin/env python3
"""Environment and dataset readiness checks for LoRA training."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from _utils import (  # noqa: E402
    PROJECT_ROOT,
    detect_device,
    free_disk_gb,
    get_library_versions,
    load_training_config,
    resolve_project_path,
    status_line,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="PEFT eğitim ortamı kontrolü")
    parser.add_argument(
        "--config",
        default="configs/training_config.json",
        help="Eğitim config dosyası yolu",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config_path = resolve_project_path(args.config)

    fails: list[str] = []
    warns: list[str] = []
    passes: list[str] = []

    print(f"Ortam kontrolü: {PROJECT_ROOT}\n")

    py_version = sys.version_info
    if py_version < (3, 11):
        fails.append(
            f"Python 3.11+ gerekli (mevcut: {platform_py_version()})"
        )
    else:
        passes.append(f"Python sürümü uygun: {platform_py_version()}")
    if py_version >= (3, 14):
        warns.append(
            "Python 3.14 deneysel — datasets/dill uyumluluğu için Python 3.11 veya 3.12 önerilir"
        )

    versions = get_library_versions()
    required = ("torch", "transformers", "trl", "peft", "datasets", "accelerate")
    for name in required:
        if versions.get(name):
            passes.append(f"{name} {versions[name]}")
        else:
            fails.append(f"{name} kurulu değil")

    device, device_info = detect_device()
    passes.append(f"Seçilen device: {device}")

    if device_info.get("torch_version"):
        passes.append(f"PyTorch {device_info['torch_version']}")

    if device_info.get("cuda_available"):
        passes.append(f"CUDA kullanılabilir (sürüm: {device_info.get('cuda_version')})")
        passes.append(f"GPU: {device_info.get('gpu_name')} ({device_info.get('gpu_memory_gb')} GB)")
    else:
        warns.append("CUDA kullanılamıyor — eğitim CPU/MPS üzerinde yavaş olabilir")

    if device_info.get("mps_available"):
        passes.append("Apple MPS kullanılabilir")
    elif device == "cpu":
        passes.append("MPS kullanılamıyor (Windows/Linux CPU modu)")

    try:
        config = load_training_config(config_path)
        passes.append(f"Config geçerli: {config_path.relative_to(PROJECT_ROOT)}")
    except (FileNotFoundError, ValueError) as exc:
        fails.append(str(exc))
        config = {}

    train_path = resolve_project_path(config.get("train_file", "data/output/train.jsonl"))
    val_path = resolve_project_path(config.get("validation_file", "data/output/val.jsonl"))

    for label, path in (("Train", train_path), ("Validation", val_path)):
        if path.exists():
            passes.append(f"{label} dosyası mevcut: {path.relative_to(PROJECT_ROOT)}")
        else:
            fails.append(f"{label} dosyası bulunamadı: {path}")

    free_gb = free_disk_gb(PROJECT_ROOT)
    if free_gb is None:
        warns.append("Disk alanı okunamadı")
    elif free_gb < 5:
        fails.append(f"Disk alanı kritik düşük: {free_gb} GB boş")
    elif free_gb < 15:
        warns.append(f"Disk alanı sınırlı: {free_gb} GB boş (model cache için 15+ GB önerilir)")
    else:
        passes.append(f"Disk alanı yeterli görünüyor: {free_gb} GB boş")

    if config.get("use_4bit") and not device_info.get("cuda_available"):
        warns.append("Config use_4bit=true ancak CUDA yok — eğitim scripti 4-bit'i devre dışı bırakacak")

    print("--- Kontroller ---")
    for message in passes:
        status_line("PASS", message)
    for message in warns:
        status_line("WARN", message)
    for message in fails:
        status_line("FAIL", message)

    print("")
    if fails:
        print(f"Sonuç: FAIL ({len(fails)} kritik sorun)")
        return 1

    if warns:
        print(f"Sonuç: PASS with {len(warns)} uyarı")
    else:
        print("Sonuç: PASS")
    return 0


def platform_py_version() -> str:
    import platform

    return platform.python_version()


if __name__ == "__main__":
    raise SystemExit(main())
