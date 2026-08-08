#!/usr/bin/env python3
"""
Fine-tune Gemma 2 2B with Unsloth LoRA on PEFT export JSONL (train.jsonl / val.jsonl).

Dry-run (no GPU / no torch):
  python train_lora.py --dataset-dir ../../peft-export --dry-run

Train (CUDA GPU required — Linux recommended):
  python train_lora.py --dataset-dir ../../peft-export --output-dir ./output
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import time
from pathlib import Path

from dataset_loader import (
    MIN_RECOMMENDED_SAMPLES,
    load_peft_export,
    summarize_dataset,
    training_messages,
)

DEFAULT_MODEL = "unsloth/gemma-2-2b-it-bnb-4bit"
DEFAULT_MAX_SEQ_LENGTH = 8192


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Unsloth LoRA fine-tune for product_spec PEFT export")
    parser.add_argument(
        "--dataset-dir",
        type=Path,
        required=True,
        help="Directory containing train.jsonl (and optional val.jsonl, manifest.json)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("./output"),
        help="Directory for LoRA adapter checkpoints",
    )
    parser.add_argument(
        "--model-name",
        default=DEFAULT_MODEL,
        help=f"Hugging Face model id (default: {DEFAULT_MODEL})",
    )
    parser.add_argument("--max-seq-length", type=int, default=DEFAULT_MAX_SEQ_LENGTH)
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument(
        "--max-steps",
        type=int,
        default=0,
        help="If >0, stop after this many optimizer steps (overrides epoch count)",
    )
    parser.add_argument("--batch-size", type=int, default=2)
    parser.add_argument("--grad-accum", type=int, default=4)
    parser.add_argument("--learning-rate", type=float, default=2e-4)
    parser.add_argument("--lora-r", type=int, default=16)
    parser.add_argument("--lora-alpha", type=int, default=16)
    parser.add_argument("--seed", type=int, default=3407)
    parser.add_argument(
        "--min-samples",
        type=int,
        default=MIN_RECOMMENDED_SAMPLES,
        help="Warn when train+val rows are below this count (still trains if --force)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Train even when sample count is below --min-samples",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate dataset and print stats without loading Unsloth",
    )
    parser.add_argument(
        "--save-merged-16bit",
        action="store_true",
        help="Also export merged 16-bit weights (for vLLM / some Ollama flows)",
    )
    return parser.parse_args()


def print_dataset_report(stats, dataset_dir: Path) -> None:
    print(f"Dataset directory: {dataset_dir}")
    print(f"  train rows: {stats.train_rows}")
    print(f"  val rows:   {stats.val_rows}")
    print(f"  total:      {stats.total_rows}")
    if stats.manifest_exported is not None:
        print(f"  manifest exported: {stats.manifest_exported}")
    print(f"  avg assistant chars: {stats.avg_assistant_chars:.0f}")
    print(f"  languages: {json.dumps(stats.languages, ensure_ascii=False)}")


def ensure_sample_count(stats, min_samples: int, force: bool) -> None:
    if stats.total_rows >= min_samples:
        return
    message = (
        f"Dataset has {stats.total_rows} row(s); recommended minimum is {min_samples}. "
        "Approve more product_spec documents before production fine-tuning."
    )
    if force:
        print(f"WARN  {message}")
        return
    raise SystemExit(message)


class NaNLossStopCallback:
    """Stop training on non-finite loss values."""

    def __init__(self) -> None:
        self.nan_inf_detected = False

    def on_log(self, args, state, control, logs=None, **kwargs):
        if not logs:
            return
        loss = logs.get("loss")
        if loss is not None and not math.isfinite(float(loss)):
            self.nan_inf_detected = True
            print(f"ERROR non-finite training loss detected: {loss}")
            control.should_training_stop = True

    def on_evaluate(self, args, state, control, metrics=None, **kwargs):
        if not metrics:
            return
        eval_loss = metrics.get("eval_loss")
        if eval_loss is not None and not math.isfinite(float(eval_loss)):
            self.nan_inf_detected = True
            print(f"ERROR non-finite eval loss detected: {eval_loss}")
            control.should_training_stop = True


def count_trainable_params(model) -> dict[str, float | int]:
    trainable = 0
    total = 0
    for param in model.parameters():
        n = param.numel()
        total += n
        if param.requires_grad:
            trainable += n
    pct = round((trainable / total) * 100, 4) if total else 0.0
    return {"trainable": trainable, "total": total, "trainable_pct": pct}


def summarize_training_logs(log_history: list[dict]) -> dict:
    train_losses = [float(x["loss"]) for x in log_history if "loss" in x and math.isfinite(float(x["loss"]))]
    eval_losses = [float(x["eval_loss"]) for x in log_history if "eval_loss" in x and math.isfinite(float(x["eval_loss"]))]
    return {
        "initial_train_loss": train_losses[0] if train_losses else None,
        "final_train_loss": train_losses[-1] if train_losses else None,
        "final_eval_loss": eval_losses[-1] if eval_losses else None,
        "total_steps": max((x.get("step", 0) for x in log_history), default=0),
    }


def run_training(args: argparse.Namespace, train_rows, val_rows) -> None:
    try:
        import torch
        from unsloth import FastLanguageModel  # noqa: E402
        from datasets import Dataset
        from transformers import TrainerCallback
        from trl import SFTConfig, SFTTrainer
        from unsloth.chat_templates import get_chat_template
    except ImportError as exc:
        raise SystemExit(
            "Missing training dependencies. Install with:\n"
            "  pip install -r requirements.txt\n"
            f"Original error: {exc}"
        ) from exc

    if not torch.cuda.is_available():
        raise SystemExit(
            "CUDA GPU not detected. Fine-tuning requires a Linux/CUDA machine "
            "(RunPod, WSL2 + NVIDIA, or local GPU). Use --dry-run to validate JSONL only."
        )

    train_messages = training_messages(train_rows)
    eval_messages = training_messages(val_rows) if val_rows else None

    train_dataset = Dataset.from_dict({"messages": train_messages})
    eval_dataset = Dataset.from_dict({"messages": eval_messages}) if eval_messages else None

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=args.model_name,
        max_seq_length=args.max_seq_length,
        dtype=None,
        load_in_4bit=True,
    )

    tokenizer = get_chat_template(tokenizer, chat_template="gemma2")

    model = FastLanguageModel.get_peft_model(
        model,
        r=args.lora_r,
        target_modules=[
            "q_proj",
            "k_proj",
            "v_proj",
            "o_proj",
            "gate_proj",
            "up_proj",
            "down_proj",
        ],
        lora_alpha=args.lora_alpha,
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=args.seed,
    )


    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    training_args = SFTConfig(
        output_dir=str(output_dir),
        per_device_train_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        num_train_epochs=args.epochs,
        max_steps=args.max_steps if args.max_steps and args.max_steps > 0 else -1,
        learning_rate=args.learning_rate,
        logging_steps=1,
        save_strategy="steps" if args.max_steps and args.max_steps > 0 else "epoch",
        save_steps=max(1, min(args.max_steps, 10)) if args.max_steps and args.max_steps > 0 else 500,
        save_total_limit=1,
        eval_strategy="steps" if eval_dataset is not None and args.max_steps and args.max_steps > 0 else (
            "epoch" if eval_dataset is not None else "no"
        ),
        eval_steps=max(1, args.max_steps // 2) if eval_dataset is not None and args.max_steps and args.max_steps > 0 else 500,
        optim="adamw_8bit",
        seed=args.seed,
        report_to="none",
        max_seq_length=args.max_seq_length,
        assistant_only_loss=True,
        dataloader_num_workers=0,
        per_device_eval_batch_size=1,
        eval_accumulation_steps=4,
        bf16=torch.cuda.is_bf16_supported(),
        fp16=not torch.cuda.is_bf16_supported(),
    )

    nan_callback = NaNLossStopCallback()
    # Register as HF TrainerCallback if available
    try:
        class _NaNTrainerCallback(TrainerCallback):
            def __init__(self, parent: NaNLossStopCallback) -> None:
                self.parent = parent

            def on_log(self, args, state, control, logs=None, **kwargs):
                return nan_callback.on_log(args, state, control, logs=logs, **kwargs)

            def on_evaluate(self, args, state, control, metrics=None, **kwargs):
                return nan_callback.on_evaluate(args, state, control, metrics=metrics, **kwargs)

        callback_obj = _NaNTrainerCallback(nan_callback)
    except Exception:
        callback_obj = nan_callback
    if torch.cuda.is_available():
        torch.cuda.reset_peak_memory_stats()

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        args=training_args,
        callbacks=[callback_obj],
    )

    print("Starting LoRA training…")
    started = time.time()
    train_result = trainer.train()
    runtime_sec = round(time.time() - started, 2)

    if nan_callback.nan_inf_detected:
        raise SystemExit("Training stopped: non-finite loss detected")

    log_summary = summarize_training_logs(trainer.state.log_history)
    param_stats = count_trainable_params(model)
    peak_mem_gb = round(torch.cuda.max_memory_allocated() / (1024**3), 2) if torch.cuda.is_available() else None

    adapter_dir = output_dir / "lora_adapter"
    model.save_pretrained(str(adapter_dir))
    tokenizer.save_pretrained(str(adapter_dir))
    print(f"LoRA adapter saved → {adapter_dir}")

    checkpoint_dirs = sorted(output_dir.glob("checkpoint-*"))
    run_meta = {
        "base_model": args.model_name,
        "train_rows": len(train_rows),
        "val_rows": len(val_rows),
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "grad_accum": args.grad_accum,
        "lora_r": args.lora_r,
        "lora_alpha": args.lora_alpha,
        "max_seq_length": args.max_seq_length,
        "runtime_sec": runtime_sec,
        "train_loss": train_result.training_loss,
        "initial_train_loss": log_summary["initial_train_loss"],
        "final_train_loss": log_summary["final_train_loss"],
        "final_eval_loss": log_summary["final_eval_loss"],
        "total_steps": log_summary["total_steps"],
        "peak_gpu_memory_gb": peak_mem_gb,
        "checkpoint_count": len(checkpoint_dirs),
        "trainable_params": param_stats["trainable"],
        "total_params": param_stats["total"],
        "trainable_pct": param_stats["trainable_pct"],
        "nan_inf_detected": False,
        "status": "completed",
    }
    with (output_dir / "run_meta.json").open("w", encoding="utf-8") as handle:
        json.dump(run_meta, handle, indent=2)

    if args.save_merged_16bit:
        merged_dir = output_dir / "merged_16bit"
        model.save_pretrained_merged(str(merged_dir), tokenizer, save_method="merged_16bit")
        print(f"Merged 16-bit model saved → {merged_dir}")


def main() -> int:
    args = parse_args()
    train_rows, val_rows, manifest = load_peft_export(args.dataset_dir)
    stats = summarize_dataset(train_rows, val_rows, manifest)

    print("=== PEFT dataset validation ===")
    print_dataset_report(stats, args.dataset_dir.resolve())

    if stats.train_rows < 1 and stats.val_rows > 0:
        print("NOTE  train.jsonl is empty; using val.jsonl rows for training.")
        train_rows, val_rows = val_rows, []

    ensure_sample_count(stats, args.min_samples, args.force)

    if args.dry_run:
        print("\nDry-run complete — dataset is valid for Unsloth training.")
        return 0

    run_training(args, train_rows, val_rows)
    print("\nTraining complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
