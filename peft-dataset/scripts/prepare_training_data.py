#!/usr/bin/env python3
"""Validate JSONL training data without modifying source files."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from _utils import (  # noqa: E402
    PROJECT_ROOT,
    estimate_tokens,
    load_training_config,
    read_jsonl,
    record_text_length,
    resolve_project_path,
    status_line,
    validate_messages_record,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Eğitim dataset doğrulama")
    parser.add_argument(
        "--config",
        default="configs/training_config.json",
        help="Eğitim config dosyası yolu",
    )
    parser.add_argument(
        "--max-seq-length",
        type=int,
        default=None,
        help="Config değerini ezmek için maksimum sequence uzunluğu",
    )
    return parser.parse_args()


def summarize_split(name: str, path: Path, max_seq_length: int) -> dict:
    rows = read_jsonl(path)
    errors: list[str] = []
    char_lengths: list[int] = []
    token_lengths: list[int] = []
    over_limit: list[int] = []

    for index, row in enumerate(rows, start=1):
        row_errors = validate_messages_record(row, index)
        errors.extend(row_errors)
        if row_errors:
            continue
        length = record_text_length(row)
        char_lengths.append(length)
        est_tokens = estimate_tokens(
            "\n".join(
                msg.get("content", "")
                for msg in row.get("messages", [])
                if isinstance(msg, dict)
            )
        )
        token_lengths.append(est_tokens)
        if est_tokens > max_seq_length:
            over_limit.append(index)

    return {
        "name": name,
        "path": path,
        "count": len(rows),
        "errors": errors,
        "char_lengths": char_lengths,
        "token_lengths": token_lengths,
        "over_limit": over_limit,
    }


def main() -> int:
    args = parse_args()
    config = load_training_config(resolve_project_path(args.config))
    max_seq_length = args.max_seq_length or int(config.get("max_seq_length", 1024))

    train_path = resolve_project_path(config["train_file"])
    val_path = resolve_project_path(config["validation_file"])

    print(f"Dataset doğrulama: {PROJECT_ROOT}\n")

    fails: list[str] = []
    warns: list[str] = []
    passes: list[str] = []

    summaries = [
        summarize_split("train", train_path, max_seq_length),
        summarize_split("validation", val_path, max_seq_length),
    ]

    for summary in summaries:
        rel = summary["path"].relative_to(PROJECT_ROOT)
        if summary["errors"]:
            fails.extend([f"{rel}: {err}" for err in summary["errors"]])
        else:
            passes.append(f"{summary['name']} dosyası geçerli ({summary['count']} kayıt)")

        if summary["count"] == 0:
            fails.append(f"{rel}: kayıt yok")

        if summary["char_lengths"]:
            avg_chars = round(sum(summary["char_lengths"]) / len(summary["char_lengths"]))
            avg_tokens = round(sum(summary["token_lengths"]) / len(summary["token_lengths"]))
            passes.append(
                f"{summary['name']} ortalama uzunluk: {avg_chars} karakter, ~{avg_tokens} token"
            )

        if summary["over_limit"]:
            warns.append(
                f"{summary['name']}: {len(summary['over_limit'])} kayıt max_seq_length={max_seq_length} tahmini token sınırını aşabilir (satırlar: {summary['over_limit'][:10]})"
            )

    total = sum(item["count"] for item in summaries)
    passes.append(f"Toplam kayıt: {total} (messages formatı korunuyor, dosya değiştirilmedi)")

    print("--- Kontroller ---")
    for message in passes:
        status_line("PASS", message)
    for message in warns:
        status_line("WARN", message)
    for message in fails:
        status_line("FAIL", message)

    print("")
    if fails:
        print(f"Sonuç: FAIL ({len(fails)} sorun)")
        return 1
    if warns:
        print(f"Sonuç: PASS with {len(warns)} uyarı")
    else:
        print("Sonuç: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
