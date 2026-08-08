"""Unit tests for PEFT dataset analysis (stdlib only)."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from analysis import (
    SMOKE_DATASET_MARKER,
    analyze_rows,
    readiness_level,
)
from dataset_loader import load_peft_export


def sample_row(
    *,
    fp: str = "fp-a",
    user: str = "user prompt A",
    assistant: str = "assistant body " * 30,
    language: str = "tr",
) -> dict:
    return {
        "messages": [
            {"role": "system", "content": "system prompt"},
            {"role": "user", "content": user},
            {"role": "assistant", "content": assistant},
        ],
        "metadata": {
            "source_fingerprint": fp,
            "rebuilt_fingerprint": fp,
            "language": language,
            "export_version": "1",
        },
    }


class AnalyzeDatasetTests(unittest.TestCase):
    def test_readiness_smoke_only(self) -> None:
        self.assertEqual(readiness_level(1), "smoke only")
        self.assertEqual(readiness_level(9), "smoke only")

    def test_readiness_bands(self) -> None:
        self.assertEqual(readiness_level(10), "experimental")
        self.assertEqual(readiness_level(30), "initial fine-tune")
        self.assertEqual(readiness_level(100), "usable")
        self.assertEqual(readiness_level(300), "strong dataset")

    def test_duplicate_fingerprint_detection(self) -> None:
        rows = [
            sample_row(fp="same", user="user one"),
            sample_row(fp="same", user="user two"),
            sample_row(fp="other", user="user three"),
        ]
        analysis = analyze_rows(rows, [], None, Path("."))
        self.assertEqual(analysis.duplicate_fingerprint_count, 1)
        self.assertEqual(analysis.duplicate_user_prompt_groups, 0)

    def test_duplicate_user_and_assistant_prompts(self) -> None:
        rows = [
            sample_row(fp="fp1", user="same user", assistant="answer one " * 30),
            sample_row(fp="fp2", user="same user", assistant="answer two " * 30),
            sample_row(fp="fp3", user="unique", assistant="shared answer " * 30),
            sample_row(fp="fp4", user="unique2", assistant="shared answer " * 30),
        ]
        analysis = analyze_rows(rows, [], None, Path("."))
        self.assertEqual(analysis.duplicate_user_prompt_groups, 1)
        self.assertEqual(analysis.duplicate_user_prompt_rows, 2)
        self.assertEqual(analysis.duplicate_assistant_groups, 1)
        self.assertEqual(analysis.duplicate_assistant_rows, 2)

    def test_train_val_fingerprint_overlap(self) -> None:
        train = [sample_row(fp="shared"), sample_row(fp="train-only")]
        val = [sample_row(fp="shared"), sample_row(fp="val-only")]
        analysis = analyze_rows(train, val, None, Path("."))
        self.assertEqual(analysis.train_val_fingerprint_overlap, 1)
        self.assertTrue(any("leakage" in w for w in analysis.warnings))

    def test_smoke_marker_detection(self) -> None:
        row = sample_row(assistant=f"{SMOKE_DATASET_MARKER}\n" + ("body " * 40))
        analysis = analyze_rows([row], [], None, Path("."))
        self.assertEqual(analysis.smoke_test_record_count, 1)
        self.assertFalse(analysis.finetune_ready)

    def test_load_peft_export_from_temp_dir(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "train.jsonl").write_text(
                json.dumps(sample_row()) + "\n",
                encoding="utf-8",
            )
            (root / "manifest.json").write_text(
                json.dumps({"counts": {"exported": 1}, "split": {"ratio": 0.9, "salt": "peft-export-v1"}}),
                encoding="utf-8",
            )
            train_rows, val_rows, manifest = load_peft_export(root)
            self.assertEqual(len(train_rows), 1)
            self.assertEqual(len(val_rows), 0)
            self.assertIsNotNone(manifest)


if __name__ == "__main__":
    unittest.main()
