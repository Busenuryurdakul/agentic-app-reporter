"""Shared utilities for peft-dataset training scripts."""

from __future__ import annotations

import json
import platform
import random
import shutil
import sys
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent
REQUIRED_ROLES = ("system", "user", "assistant")


def status_line(level: str, message: str) -> None:
    print(f"{level.ljust(4)}  {message}")


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise FileNotFoundError(f"Dosya bulunamadı: {path}")

    rows: list[dict[str, Any]] = []
    content = path.read_text(encoding="utf-8")
    for line_no, line in enumerate(content.splitlines(), start=1):
        stripped = line.strip()
        if not stripped:
            continue
        try:
            rows.append(json.loads(stripped))
        except json.JSONDecodeError as exc:
            raise ValueError(f"{path.name} satır {line_no}: geçersiz JSON — {exc}") from exc
    return rows


def resolve_project_path(value: str | Path) -> Path:
    path = Path(value)
    if path.is_absolute():
        return path
    return (PROJECT_ROOT / path).resolve()


def load_training_config(config_path: Path) -> dict[str, Any]:
    if not config_path.exists():
        raise FileNotFoundError(f"Config dosyası bulunamadı: {config_path}")
    config = load_json(config_path)
    if not isinstance(config, dict):
        raise ValueError("Config dosyası bir JSON nesnesi olmalıdır.")
    required = ("model_name", "output_dir", "train_file", "validation_file")
    missing = [key for key in required if key not in config]
    if missing:
        raise ValueError(f"Config eksik alanlar: {', '.join(missing)}")
    return config


def get_message_content(messages: list[dict[str, Any]], role: str) -> str:
    for message in messages:
        if message.get("role") == role:
            return str(message.get("content", "")).strip()
    return ""


def validate_messages_record(record: dict[str, Any], line_no: int) -> list[str]:
    errors: list[str] = []
    if not isinstance(record, dict):
        return [f"Satır {line_no}: kayıt bir nesne değil"]

    messages = record.get("messages")
    if not isinstance(messages, list):
        return [f"Satır {line_no}: messages dizisi eksik"]

    roles = [msg.get("role") for msg in messages if isinstance(msg, dict)]
    for role in REQUIRED_ROLES:
        if role not in roles:
            errors.append(f"Satır {line_no}: '{role}' rolü eksik")

    assistant = get_message_content(messages, "assistant")
    user = get_message_content(messages, "user")
    if not assistant:
        errors.append(f"Satır {line_no}: assistant cevabı boş")
    if not user:
        errors.append(f"Satır {line_no}: user içeriği boş")

    return errors


def estimate_tokens(text: str) -> int:
    return max(1, (len(text) + 3) // 4)


def record_text_length(record: dict[str, Any]) -> int:
    messages = record.get("messages", [])
    return sum(len(get_message_content(messages, role)) for role in REQUIRED_ROLES)


def detect_device() -> tuple[str, dict[str, Any]]:
    info: dict[str, Any] = {
        "platform": platform.platform(),
        "python_version": platform.python_version(),
    }

    try:
        import torch

        info["torch_version"] = torch.__version__
        info["cuda_available"] = torch.cuda.is_available()
        info["mps_available"] = hasattr(torch.backends, "mps") and torch.backends.mps.is_available()

        if info["cuda_available"]:
            info["device"] = "cuda"
            info["cuda_version"] = torch.version.cuda
            info["gpu_name"] = torch.cuda.get_device_name(0)
            props = torch.cuda.get_device_properties(0)
            info["gpu_memory_gb"] = round(props.total_memory / (1024**3), 2)
        elif info["mps_available"]:
            info["device"] = "mps"
        else:
            info["device"] = "cpu"
    except ImportError:
        info["torch_version"] = None
        info["cuda_available"] = False
        info["mps_available"] = False
        info["device"] = "cpu"

    return info["device"], info


def get_library_versions() -> dict[str, str | None]:
    versions: dict[str, str | None] = {"python": platform.python_version()}
    for module_name in ("torch", "transformers", "trl", "peft", "datasets", "accelerate"):
        try:
            module = __import__(module_name)
            versions[module_name] = getattr(module, "__version__", "unknown")
        except ImportError:
            versions[module_name] = None
    return versions


def set_global_seed(seed: int) -> None:
    random.seed(seed)
    try:
        import numpy as np

        np.random.seed(seed)
    except ImportError:
        pass
    try:
        import torch

        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)
    except ImportError:
        pass


def free_disk_gb(path: Path) -> float | None:
    try:
        usage = shutil.disk_usage(path)
        return round(usage.free / (1024**3), 2)
    except OSError:
        return None


def choose_torch_dtype(device: str) -> str:
    try:
        import torch

        if device == "cuda" and torch.cuda.is_bf16_supported():
            return "bfloat16"
        if device in {"cuda", "mps"}:
            return "float16"
    except ImportError:
        pass
    return "float32"


def torch_dtype_from_name(name: str):
    import torch

    mapping = {
        "float32": torch.float32,
        "float16": torch.float16,
        "bfloat16": torch.bfloat16,
    }
    if name not in mapping:
        raise ValueError(f"Desteklenmeyen torch dtype: {name}")
    return mapping[name]


def create_messages_dataset(rows: list[dict[str, Any]]):
    """Build a Hugging Face Dataset while keeping the messages column intact."""
    import datasets.arrow_dataset as arrow_dataset_mod
    import datasets.fingerprint as fingerprint_mod
    from datasets import Dataset

    payload = [{"messages": row["messages"]} for row in rows]
    stub = lambda _dataset: "peft-dataset-local-v1"
    original_fingerprint = fingerprint_mod.generate_fingerprint
    original_arrow = arrow_dataset_mod.generate_fingerprint
    fingerprint_mod.generate_fingerprint = stub
    arrow_dataset_mod.generate_fingerprint = stub
    try:
        return Dataset.from_list(payload)
    finally:
        fingerprint_mod.generate_fingerprint = original_fingerprint
        arrow_dataset_mod.generate_fingerprint = original_arrow
