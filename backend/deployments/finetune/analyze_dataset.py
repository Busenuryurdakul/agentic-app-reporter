#!/usr/bin/env python3
"""Analyze PEFT export JSONL quality and write dataset-analysis.json."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from analysis import analyze_dataset_dir, format_terminal_report, write_analysis_report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Analyze train.jsonl / val.jsonl / manifest.json for fine-tuning readiness"
    )
    parser.add_argument(
        "--dataset-dir",
        type=Path,
        required=True,
        help="Directory containing train.jsonl (and optional val.jsonl, manifest.json)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Analysis JSON path (default: <dataset-dir>/dataset-analysis.json)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    dataset_dir = args.dataset_dir.resolve()
    output_path = args.output or (dataset_dir / "dataset-analysis.json")

    analysis = analyze_dataset_dir(dataset_dir)
    write_analysis_report(analysis, output_path)

    print(format_terminal_report(analysis))
    print(f"Analysis written → {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
