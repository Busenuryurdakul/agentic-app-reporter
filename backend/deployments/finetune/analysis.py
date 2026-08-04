"""Dataset quality analysis for PEFT JSONL exports."""

from __future__ import annotations

import json
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from dataset_loader import load_peft_export

# Must match backend/scripts/smoke_peft_seed.mjs
SMOKE_DATASET_MARKER = "[[PEFT_SMOKE_TEST]]"
SHORT_ASSISTANT_THRESHOLD = 200
APPROX_CHARS_PER_TOKEN = 4

READINESS_BANDS: list[tuple[int, int, str]] = [
    (0, 9, "smoke only"),
    (10, 29, "experimental"),
    (30, 99, "initial fine-tune"),
    (100, 299, "usable"),
    (300, 10**9, "strong dataset"),
]


@dataclass(frozen=True)
class RoleLengthStats:
    avg_chars: float
    min_chars: int
    max_chars: int


@dataclass(frozen=True)
class DatasetAnalysis:
    dataset_dir: str
    total_records: int
    train_records: int
    val_records: int
    language_distribution: dict[str, int]
    role_lengths: dict[str, RoleLengthStats]
    assistant_length_min: int
    assistant_length_max: int
    short_or_empty_assistant_count: int
    duplicate_fingerprint_count: int
    train_val_fingerprint_overlap: int
    duplicate_user_prompt_groups: int
    duplicate_user_prompt_rows: int
    duplicate_assistant_groups: int
    duplicate_assistant_rows: int
    approximate_token_count: int
    smoke_test_record_count: int
    readiness_level: str
    finetune_ready: bool
    manifest: dict[str, Any] | None
    warnings: list[str]

    def to_json_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["role_lengths"] = {
            role: asdict(stats) for role, stats in self.role_lengths.items()
        }
        return payload


def readiness_level(total_records: int) -> str:
    for low, high, label in READINESS_BANDS:
        if low <= total_records <= high:
            return label
    return READINESS_BANDS[-1][2]


def finetune_ready(total_records: int, smoke_test_record_count: int) -> bool:
    return total_records >= 30 and smoke_test_record_count == 0


def _role_content(row: dict[str, Any], role: str) -> str:
    for message in row.get("messages", []):
        if message.get("role") == role:
            return str(message.get("content", ""))
    return ""


def _fingerprint(row: dict[str, Any]) -> str:
    metadata = row.get("metadata")
    if not isinstance(metadata, dict):
        return ""
    for key in ("source_fingerprint", "rebuilt_fingerprint"):
        value = str(metadata.get(key, "")).strip()
        if value:
            return value
    return ""


def _role_length_stats(lengths: list[int]) -> RoleLengthStats:
    if not lengths:
        return RoleLengthStats(avg_chars=0.0, min_chars=0, max_chars=0)
    return RoleLengthStats(
        avg_chars=sum(lengths) / len(lengths),
        min_chars=min(lengths),
        max_chars=max(lengths),
    )


def _duplicate_group_stats(values: list[str]) -> tuple[int, int]:
    """Return (groups_with_duplicates, total_rows_in_those_groups)."""
    counts = Counter(values)
    duplicate_groups = 0
    duplicate_rows = 0
    for value, count in counts.items():
        if not value or count < 2:
            continue
        duplicate_groups += 1
        duplicate_rows += count
    return duplicate_groups, duplicate_rows


def _is_smoke_row(row: dict[str, Any]) -> bool:
    text = " ".join(_role_content(row, role) for role in ("system", "user", "assistant"))
    return SMOKE_DATASET_MARKER in text


def _approx_tokens(rows: list[dict[str, Any]]) -> int:
    chars = 0
    for row in rows:
        for role in ("system", "user", "assistant"):
            chars += len(_role_content(row, role))
    if chars == 0:
        return 0
    return max(1, chars // APPROX_CHARS_PER_TOKEN)


def analyze_rows(
    train_rows: list[dict[str, Any]],
    val_rows: list[dict[str, Any]],
    manifest: dict[str, Any] | None,
    dataset_dir: Path,
) -> DatasetAnalysis:
    all_rows = train_rows + val_rows
    warnings: list[str] = []

    system_lengths = [len(_role_content(row, "system")) for row in all_rows]
    user_lengths = [len(_role_content(row, "user")) for row in all_rows]
    assistant_lengths = [len(_role_content(row, "assistant")) for row in all_rows]

    languages: dict[str, int] = {}
    for row in all_rows:
        metadata = row.get("metadata")
        lang = "unknown"
        if isinstance(metadata, dict) and metadata.get("language"):
            lang = str(metadata["language"])
        languages[lang] = languages.get(lang, 0) + 1

    short_or_empty = sum(
        1
        for length in assistant_lengths
        if length == 0 or length < SHORT_ASSISTANT_THRESHOLD
    )

    fingerprints = [_fingerprint(row) for row in all_rows]
    non_empty_fps = [fp for fp in fingerprints if fp]
    duplicate_fp_count = len(non_empty_fps) - len(set(non_empty_fps))

    train_fps = {_fingerprint(row) for row in train_rows if _fingerprint(row)}
    val_fps = {_fingerprint(row) for row in val_rows if _fingerprint(row)}
    overlap = len(train_fps & val_fps)

    user_prompts = [_role_content(row, "user") for row in all_rows]
    assistants = [_role_content(row, "assistant") for row in all_rows]
    dup_user_groups, dup_user_rows = _duplicate_group_stats(user_prompts)
    dup_asst_groups, dup_asst_rows = _duplicate_group_stats(assistants)

    smoke_count = sum(1 for row in all_rows if _is_smoke_row(row))
    total = len(all_rows)
    level = readiness_level(total)

    if overlap > 0:
        warnings.append(
            f"{overlap} fingerprint(s) appear in both train and val — split leakage detected"
        )
    if duplicate_fp_count > 0:
        warnings.append(
            f"{duplicate_fp_count} duplicate fingerprint(s) across exported rows"
        )
    if smoke_count > 0:
        warnings.append(
            f"{smoke_count} row(s) contain smoke marker {SMOKE_DATASET_MARKER!r}"
        )
    if total < 30:
        warnings.append(
            f"only {total} record(s) — below recommended minimum (30) for initial fine-tune"
        )
    if total == 1 and len(val_rows) == 0 and len(train_rows) == 1:
        pass  # expected smoke shape
    elif total > 0 and len(val_rows) == 0 and total >= 10:
        warnings.append("validation set is empty — consider exporting more workspaces")

    if manifest and isinstance(manifest.get("split"), dict):
        split = manifest["split"]
        ratio = split.get("ratio")
        salt = split.get("salt")
        if ratio is not None and salt:
            warnings.append(
                f"split uses ratio={ratio} salt={salt!r} (workspace-hash deterministic)"
            )

    return DatasetAnalysis(
        dataset_dir=str(dataset_dir.resolve()),
        total_records=total,
        train_records=len(train_rows),
        val_records=len(val_rows),
        language_distribution=languages,
        role_lengths={
            "system": _role_length_stats(system_lengths),
            "user": _role_length_stats(user_lengths),
            "assistant": _role_length_stats(assistant_lengths),
        },
        assistant_length_min=min(assistant_lengths) if assistant_lengths else 0,
        assistant_length_max=max(assistant_lengths) if assistant_lengths else 0,
        short_or_empty_assistant_count=short_or_empty,
        duplicate_fingerprint_count=duplicate_fp_count,
        train_val_fingerprint_overlap=overlap,
        duplicate_user_prompt_groups=dup_user_groups,
        duplicate_user_prompt_rows=dup_user_rows,
        duplicate_assistant_groups=dup_asst_groups,
        duplicate_assistant_rows=dup_asst_rows,
        approximate_token_count=_approx_tokens(all_rows),
        smoke_test_record_count=smoke_count,
        readiness_level=level,
        finetune_ready=finetune_ready(total, smoke_count),
        manifest=manifest,
        warnings=warnings,
    )


def analyze_dataset_dir(dataset_dir: Path) -> DatasetAnalysis:
    train_rows, val_rows, manifest = load_peft_export(dataset_dir)
    return analyze_rows(train_rows, val_rows, manifest, dataset_dir)


def write_analysis_report(analysis: DatasetAnalysis, output_path: Path) -> None:
    output_path.write_text(
        json.dumps(analysis.to_json_dict(), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def format_terminal_report(analysis: DatasetAnalysis) -> str:
    lines = [
        "=== PEFT Dataset Analysis ===",
        f"Dataset directory: {analysis.dataset_dir}",
        "",
        "Counts",
        f"  total records:   {analysis.total_records}",
        f"  train records:   {analysis.train_records}",
        f"  val records:     {analysis.val_records}",
        "",
        "Language distribution",
    ]
    for lang, count in sorted(analysis.language_distribution.items()):
        lines.append(f"  {lang}: {count}")

    lines.extend(
        [
            "",
            "Role lengths (avg / min / max chars)",
        ]
    )
    for role in ("system", "user", "assistant"):
        stats = analysis.role_lengths[role]
        lines.append(
            f"  {role:9s} {stats.avg_chars:8.1f} / {stats.min_chars:6d} / {stats.max_chars:6d}"
        )

    lines.extend(
        [
            "",
            "Assistant body",
            f"  min length:      {analysis.assistant_length_min}",
            f"  max length:      {analysis.assistant_length_max}",
            f"  short/empty (<{SHORT_ASSISTANT_THRESHOLD} chars): {analysis.short_or_empty_assistant_count}",
            "",
            "Duplicates & overlap",
            f"  duplicate fingerprints:          {analysis.duplicate_fingerprint_count}",
            f"  train/val fingerprint overlap:   {analysis.train_val_fingerprint_overlap}",
            f"  duplicate user prompt groups:    {analysis.duplicate_user_prompt_groups} ({analysis.duplicate_user_prompt_rows} rows)",
            f"  duplicate assistant groups:      {analysis.duplicate_assistant_groups} ({analysis.duplicate_assistant_rows} rows)",
            "",
            "Tokens & origin",
            f"  approximate tokens (chars/4):    {analysis.approximate_token_count}",
            f"  smoke/test marked rows:          {analysis.smoke_test_record_count}",
            "",
            "Readiness",
            f"  level:           {analysis.readiness_level}",
            f"  finetune_ready:  {analysis.finetune_ready}",
        ]
    )

    if analysis.warnings:
        lines.append("")
        lines.append("Warnings")
        for warning in analysis.warnings:
            lines.append(f"  - {warning}")

    lines.append("")
    return "\n".join(lines)
