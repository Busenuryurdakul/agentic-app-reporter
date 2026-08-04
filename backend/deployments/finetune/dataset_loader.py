"""Load and validate PEFT JSONL produced by export-peft-dataset CLI."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

REQUIRED_ROLES = ("system", "user", "assistant")
MIN_RECOMMENDED_SAMPLES = 50
MIN_BODY_CHARS = 200


@dataclass(frozen=True)
class DatasetStats:
    train_rows: int
    val_rows: int
    manifest_exported: int | None
    avg_assistant_chars: float
    languages: dict[str, int]

    @property
    def total_rows(self) -> int:
        return self.train_rows + self.val_rows


def load_jsonl_rows(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    with path.open(encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as exc:
                raise ValueError(f"{path}:{line_no}: invalid JSON — {exc}") from exc
    return rows


def validate_row(row: dict[str, Any], source: str, index: int) -> None:
    messages = row.get("messages")
    if not isinstance(messages, list) or len(messages) != 3:
        raise ValueError(f"{source} row {index}: expected exactly 3 messages")

    for expected_role, message in zip(REQUIRED_ROLES, messages, strict=True):
        if not isinstance(message, dict):
            raise ValueError(f"{source} row {index}: message must be an object")
        role = message.get("role")
        content = message.get("content")
        if role != expected_role:
            raise ValueError(
                f"{source} row {index}: expected role {expected_role}, got {role!r}"
            )
        if not isinstance(content, str) or not content.strip():
            raise ValueError(f"{source} row {index}: {expected_role} content is empty")


def load_peft_export(dataset_dir: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any] | None]:
    dataset_dir = dataset_dir.resolve()
    train_path = dataset_dir / "train.jsonl"
    val_path = dataset_dir / "val.jsonl"
    manifest_path = dataset_dir / "manifest.json"

    if not train_path.exists():
        raise FileNotFoundError(f"train.jsonl not found in {dataset_dir}")

    train_rows = load_jsonl_rows(train_path)
    val_rows = load_jsonl_rows(val_path)

    manifest: dict[str, Any] | None = None
    if manifest_path.exists():
        with manifest_path.open(encoding="utf-8") as handle:
            manifest = json.load(handle)

    for idx, row in enumerate(train_rows, start=1):
        validate_row(row, "train.jsonl", idx)
    for idx, row in enumerate(val_rows, start=1):
        validate_row(row, "val.jsonl", idx)

    if not train_rows and not val_rows:
        raise ValueError("dataset is empty — export at least one approved product_spec row")

    return train_rows, val_rows, manifest


def summarize_dataset(
    train_rows: list[dict[str, Any]],
    val_rows: list[dict[str, Any]],
    manifest: dict[str, Any] | None,
) -> DatasetStats:
    all_rows = train_rows + val_rows
    assistant_lengths: list[int] = []
    languages: dict[str, int] = {}

    for row in all_rows:
        assistant = row["messages"][2]["content"]
        assistant_lengths.append(len(assistant))
        lang = "unknown"
        metadata = row.get("metadata")
        if isinstance(metadata, dict) and metadata.get("language"):
            lang = str(metadata["language"])
        languages[lang] = languages.get(lang, 0) + 1

    exported = None
    if manifest and isinstance(manifest.get("counts"), dict):
        exported = manifest["counts"].get("exported")

    avg_len = sum(assistant_lengths) / len(assistant_lengths) if assistant_lengths else 0.0
    return DatasetStats(
        train_rows=len(train_rows),
        val_rows=len(val_rows),
        manifest_exported=exported,
        avg_assistant_chars=avg_len,
        languages=languages,
    )


def training_messages(rows: list[dict[str, Any]]) -> list[list[dict[str, str]]]:
    """Return chat messages for TRL / Unsloth (metadata stripped)."""
    out: list[list[dict[str, str]]] = []
    for row in rows:
        messages = []
        for message in row["messages"]:
            messages.append(
                {"role": str(message["role"]), "content": str(message["content"])}
            )
        out.append(messages)
    return out
