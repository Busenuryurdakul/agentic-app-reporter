#!/usr/bin/env python3
"""LoRA instruction fine-tuning with TRL SFTTrainer and PEFT."""

from __future__ import annotations

import argparse
import hashlib
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from _utils import (  # noqa: E402
    PROJECT_ROOT,
    choose_torch_dtype,
    create_messages_dataset,
    detect_device,
    get_library_versions,
    load_json,
    load_training_config,
    read_jsonl,
    resolve_project_path,
    save_json,
    set_global_seed,
    torch_dtype_from_name,
    validate_messages_record,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="LoRA instruction fine-tuning")
    parser.add_argument("--config", default="configs/training_config.json")
    parser.add_argument("--model-name", default=None)
    parser.add_argument("--output-dir", default=None)
    parser.add_argument("--epochs", type=int, default=None)
    parser.add_argument("--max-steps", type=int, default=None)
    parser.add_argument("--learning-rate", type=float, default=None)
    parser.add_argument(
        "--resume-from-checkpoint",
        default=None,
        help="Var olan checkpoint dizininden eğitime devam et",
    )
    parser.add_argument(
        "--lora-target-modules",
        default=None,
        help="Virgülle ayrılmış LoRA target module listesi",
    )
    return parser.parse_args()


def merge_config(base: dict[str, Any], args: argparse.Namespace) -> dict[str, Any]:
    config = dict(base)
    if args.model_name:
        config["model_name"] = args.model_name
    if args.output_dir:
        config["output_dir"] = args.output_dir
    if args.epochs is not None:
        config["num_train_epochs"] = args.epochs
    if args.max_steps is not None:
        config["max_steps"] = args.max_steps
    if args.learning_rate is not None:
        config["learning_rate"] = args.learning_rate
    if args.lora_target_modules:
        config["lora_target_modules"] = [
            item.strip() for item in args.lora_target_modules.split(",") if item.strip()
        ]
    return config


def build_datasets(train_file: Path, validation_file: Path):
    train_rows = read_jsonl(train_file)
    val_rows = read_jsonl(validation_file)

    for index, row in enumerate(train_rows, start=1):
        errors = validate_messages_record(row, index)
        if errors:
            raise ValueError(f"Train dataset hatası: {errors[0]}")

    for index, row in enumerate(val_rows, start=1):
        errors = validate_messages_record(row, index)
        if errors:
            raise ValueError(f"Validation dataset hatası: {errors[0]}")

    train_dataset = create_messages_dataset(train_rows)
    eval_dataset = create_messages_dataset(val_rows) if val_rows else None
    return train_dataset, eval_dataset, len(train_rows), len(val_rows)


def count_parameters(model) -> tuple[int, int]:
    total = sum(p.numel() for p in model.parameters())
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    return total, trainable


def write_training_report(path: Path, payload: dict[str, Any]) -> None:
    save_json(path, payload)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_dataset_sha256(manifest_path: Path) -> str | None:
    if not manifest_path.exists():
        return None
    manifest = load_json(manifest_path)
    if isinstance(manifest, dict):
        value = manifest.get("dataset_sha256")
        return str(value) if value else None
    return None


def extract_training_histories(log_history: list[dict[str, Any]]) -> dict[str, Any]:
    epoch_history: list[dict[str, Any]] = []
    train_loss_history: list[dict[str, Any]] = []
    eval_loss_history: list[dict[str, Any]] = []
    last_train: dict[str, Any] | None = None

    for entry in log_history:
        if "loss" in entry and "eval_loss" not in entry:
            last_train = {
                "step": entry.get("step"),
                "epoch": entry.get("epoch"),
                "train_loss": entry.get("loss"),
                "learning_rate": entry.get("learning_rate"),
            }
        if "eval_loss" in entry:
            eval_item = {
                "step": entry.get("step"),
                "epoch": entry.get("epoch"),
                "eval_loss": entry.get("eval_loss"),
                "learning_rate": entry.get("learning_rate"),
            }
            eval_loss_history.append(eval_item)
            epoch_item = dict(eval_item)
            if last_train is not None:
                epoch_item["train_loss"] = last_train.get("train_loss")
                train_loss_history.append(
                    {
                        "step": last_train.get("step"),
                        "epoch": last_train.get("epoch"),
                        "train_loss": last_train.get("train_loss"),
                        "learning_rate": last_train.get("learning_rate"),
                    }
                )
            if "eval_runtime" in entry:
                epoch_item["eval_runtime"] = entry.get("eval_runtime")
            epoch_history.append(epoch_item)

    return {
        "epoch_history": epoch_history,
        "train_loss_history": train_loss_history,
        "eval_loss_history": eval_loss_history,
    }


def enrich_training_report(
    report: dict[str, Any],
    *,
    config_path: Path,
    config: dict[str, Any],
    trainer,
    output_dir: Path,
    manifest_path: Path,
) -> dict[str, Any]:
    state = trainer.state
    histories = extract_training_histories(list(state.log_history))
    configured_epochs = int(config.get("num_train_epochs", 1))
    completed_epochs = int(state.epoch) if state.epoch is not None else configured_epochs
    optimizer_steps = int(state.global_step)

    best_checkpoint = state.best_model_checkpoint
    best_checkpoint_rel = None
    if best_checkpoint:
        best_path = Path(best_checkpoint)
        best_checkpoint_rel = (
            str(best_path.relative_to(PROJECT_ROOT))
            if best_path.is_absolute() and PROJECT_ROOT in best_path.parents
            else str(best_checkpoint)
        )

    adapter_weights = output_dir / "adapter_model.safetensors"
    root_adapter_sha256 = sha256_file(adapter_weights) if adapter_weights.exists() else None
    best_checkpoint_sha256 = None
    if best_checkpoint:
        best_weights = Path(best_checkpoint) / "adapter_model.safetensors"
        if best_weights.exists():
            best_checkpoint_sha256 = sha256_file(best_weights)

    report.update(
        {
            "dataset_sha256": load_dataset_sha256(manifest_path),
            "dataset_manifest_path": report.get("dataset_manifest"),
            "configured_epochs": configured_epochs,
            "completed_epochs": completed_epochs,
            "optimizer_steps": optimizer_steps,
            "best_checkpoint": best_checkpoint_rel,
            "best_eval_loss": state.best_metric,
            "best_checkpoint_sha256": best_checkpoint_sha256,
            "root_adapter_sha256": root_adapter_sha256,
            "adapter_sha256": root_adapter_sha256,
            "root_adapter_source": (
                "load_best_model_at_end"
                if config.get("load_best_model_at_end")
                else "final_epoch"
            ),
            "training_config_path": str(config_path.relative_to(PROJECT_ROOT)),
            **histories,
        }
    )
    return report


def main() -> int:
    args = parse_args()
    started_at = datetime.now(timezone.utc).isoformat()
    config_path = resolve_project_path(args.config)
    config = merge_config(load_training_config(config_path), args)

    output_dir = resolve_project_path(config["output_dir"])
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path = output_dir / "training_report.json"

    smoke_mode = bool(config.get("max_steps"))
    device, _ = detect_device()
    dtype_name = choose_torch_dtype(device)
    seed = int(config.get("seed", 42))
    set_global_seed(seed)

    manifest_path = resolve_project_path("data/output/manifest.json")
    dataset_manifest = (
        str(manifest_path.relative_to(PROJECT_ROOT)) if manifest_path.exists() else None
    )

    base_report: dict[str, Any] = {
        "started_at": started_at,
        "completed_at": None,
        "status": "running",
        "model_name": config["model_name"],
        "dataset_manifest": dataset_manifest,
        "train_count": None,
        "validation_count": None,
        "epochs": config.get("num_train_epochs"),
        "max_steps": config.get("max_steps"),
        "learning_rate": config.get("learning_rate"),
        "device": device,
        "torch_dtype": dtype_name,
        "total_parameters": None,
        "trainable_parameters": None,
        "trainable_parameter_percentage": None,
        "final_train_loss": None,
        "final_validation_loss": None,
        "output_dir": str(output_dir.relative_to(PROJECT_ROOT)),
        "seed": seed,
        "smoke_mode": smoke_mode,
        "library_versions": get_library_versions(),
    }

    try:
        import torch
        from peft import LoraConfig, TaskType, get_peft_model
        from transformers import AutoModelForCausalLM, AutoTokenizer
        from trl import SFTConfig, SFTTrainer

        train_file = resolve_project_path(config["train_file"])
        validation_file = resolve_project_path(config["validation_file"])
        train_dataset, eval_dataset, train_count, val_count = build_datasets(
            train_file, validation_file
        )
        base_report["train_count"] = train_count
        base_report["validation_count"] = val_count

        tokenizer = AutoTokenizer.from_pretrained(config["model_name"], trust_remote_code=True)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        tokenizer.padding_side = "right"

        use_4bit = bool(config.get("use_4bit")) and device == "cuda"
        if config.get("use_4bit") and device != "cuda":
            print("WARN  use_4bit yalnızca CUDA'da desteklenir — devre dışı bırakıldı.")

        model_kwargs: dict[str, Any] = {"trust_remote_code": True}
        if use_4bit:
            try:
                from transformers import BitsAndBytesConfig

                model_kwargs["quantization_config"] = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_compute_dtype=torch_dtype_from_name(dtype_name),
                    bnb_4bit_use_double_quant=True,
                    bnb_4bit_quant_type="nf4",
                )
                model_kwargs["device_map"] = "auto"
            except ImportError as exc:
                raise RuntimeError(
                    "use_4bit=true ancak bitsandbytes kurulu değil. "
                    "CUDA ortamında requirements-cuda.txt kurun."
                ) from exc
        else:
            model_kwargs["dtype"] = torch_dtype_from_name(dtype_name)

        model = AutoModelForCausalLM.from_pretrained(config["model_name"], **model_kwargs)
        if not use_4bit:
            model = model.to(device)

        if config.get("gradient_checkpointing"):
            model.config.use_cache = False
            model.gradient_checkpointing_enable()

        lora_config = LoraConfig(
            r=int(config["lora_r"]),
            lora_alpha=int(config["lora_alpha"]),
            lora_dropout=float(config["lora_dropout"]),
            target_modules=list(config["lora_target_modules"]),
            task_type=TaskType.CAUSAL_LM,
            bias="none",
        )
        model = get_peft_model(model, lora_config)

        total_params, trainable_params = count_parameters(model)
        pct = round((trainable_params / total_params) * 100, 4) if total_params else 0.0
        base_report["total_parameters"] = total_params
        base_report["trainable_parameters"] = trainable_params
        base_report["trainable_parameter_percentage"] = pct

        print(f"Toplam parametre     : {total_params:,}")
        print(f"Eğitilebilir parametre: {trainable_params:,} ({pct}%)")
        print(f"Device               : {device}")
        print(f"Torch dtype          : {dtype_name}")
        if smoke_mode:
            print(f"Smoke mode           : max_steps={config['max_steps']}")

        def formatting_func(example: dict[str, Any]) -> str:
            return tokenizer.apply_chat_template(
                example["messages"],
                tokenize=False,
                add_generation_prompt=False,
            )

        bf16 = dtype_name == "bfloat16"
        fp16 = dtype_name == "float16"

        sft_config = SFTConfig(
            output_dir=str(output_dir),
            num_train_epochs=float(config.get("num_train_epochs", 1)),
            max_steps=int(config["max_steps"]) if config.get("max_steps") else -1,
            per_device_train_batch_size=int(config.get("per_device_train_batch_size", 1)),
            per_device_eval_batch_size=int(config.get("per_device_eval_batch_size", 1)),
            gradient_accumulation_steps=int(config.get("gradient_accumulation_steps", 1)),
            learning_rate=float(config.get("learning_rate", 2e-4)),
            warmup_ratio=float(config.get("warmup_ratio", 0.03)),
            weight_decay=float(config.get("weight_decay", 0.01)),
            logging_steps=int(config.get("logging_steps", 1)),
            save_strategy=str(config.get("save_strategy", "epoch")),
            eval_strategy=str(config.get("eval_strategy", "epoch"))
            if eval_dataset is not None
            else "no",
            save_total_limit=int(config["save_total_limit"])
            if config.get("save_total_limit") is not None
            else None,
            load_best_model_at_end=bool(config.get("load_best_model_at_end", False))
            if eval_dataset is not None
            else False,
            metric_for_best_model=str(config.get("metric_for_best_model", "eval_loss"))
            if config.get("load_best_model_at_end")
            else None,
            greater_is_better=bool(config.get("greater_is_better", False))
            if config.get("load_best_model_at_end")
            else None,
            lr_scheduler_type=str(config.get("lr_scheduler_type", "linear")),
            seed=seed,
            bf16=bf16,
            fp16=fp16,
            gradient_checkpointing=bool(config.get("gradient_checkpointing")),
            report_to=config.get("report_to", "none"),
            max_length=int(config.get("max_seq_length", 1024)),
        )

        trainer = SFTTrainer(
            model=model,
            args=sft_config,
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
            processing_class=tokenizer,
            formatting_func=formatting_func,
        )

        train_result = trainer.train(
            resume_from_checkpoint=args.resume_from_checkpoint
            if args.resume_from_checkpoint
            else None
        )
        metrics = dict(train_result.metrics)

        eval_metrics: dict[str, Any] = {}
        if eval_dataset is not None:
            eval_metrics = dict(trainer.evaluate())

        trainer.save_model(str(output_dir))
        tokenizer.save_pretrained(str(output_dir))

        base_report["final_train_loss"] = metrics.get("train_loss")
        base_report["final_validation_loss"] = eval_metrics.get("eval_loss")
        base_report["status"] = "completed"
        base_report["completed_at"] = datetime.now(timezone.utc).isoformat()
        base_report = enrich_training_report(
            base_report,
            config_path=config_path,
            config=config,
            trainer=trainer,
            output_dir=output_dir,
            manifest_path=manifest_path,
        )
        write_training_report(report_path, base_report)

        print("\nEğitim tamamlandı.")
        print(f"  Train loss : {base_report['final_train_loss']}")
        print(f"  Val loss   : {base_report['final_validation_loss']}")
        print(f"  Best ckpt  : {base_report.get('best_checkpoint')}")
        print(f"  Best eval  : {base_report.get('best_eval_loss')}")
        print(f"  Steps      : {base_report.get('optimizer_steps')}")
        print(f"  Adapter    : {output_dir}")
        print(f"  Rapor      : {report_path}")
        return 0

    except Exception as exc:
        base_report["status"] = "failed"
        base_report["completed_at"] = datetime.now(timezone.utc).isoformat()
        base_report["error"] = str(exc)
        base_report["traceback"] = traceback.format_exc()
        write_training_report(report_path, base_report)
        print(f"FAIL  Eğitim başarısız: {exc}", file=sys.stderr)
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
