#!/usr/bin/env python3
"""LoRA smoke training + inference validation for peft-export-final-30."""

from __future__ import annotations

import argparse
import json
import math
import os
import platform
import shutil
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dataset_loader import load_peft_export, summarize_dataset, training_messages

DEFAULT_MODEL = "unsloth/gemma-2-2b-it-bnb-4bit"
DEFAULT_CHAT_TEMPLATE = "gemma2"
DEFAULT_MAX_SEQ_LENGTH = 8192
DEFAULT_OUTPUT = Path("../../training-output/lora-smoke-final-30")
DEFAULT_DATASET = Path("../../peft-export-final-30")
DEFAULT_REPORT = Path("../../peft-final-30-smoke-training-report.md")

TARGET_MODULES = [
    "q_proj",
    "k_proj",
    "v_proj",
    "o_proj",
    "gate_proj",
    "up_proj",
    "down_proj",
]

TEST_PROMPT = (
    "Bir belediye saha ekipleri görev ve arıza takip platformu için Product Spec oluştur. "
    "Platform web ve mobil kullanıcıları desteklemeli; görev atama, arıza kaydı, SLA takibi "
    "ve saha fotoğrafı yükleme içermeli."
)


def apply_gemma_chat_template(tokenizer):
    from unsloth.chat_templates import CHAT_TEMPLATES, get_chat_template

    for name in ("gemma2", "gemma-2", "gemma"):
        if name in CHAT_TEMPLATES:
            return get_chat_template(tokenizer, chat_template=name)
    return tokenizer


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Smoke LoRA training for final-30 PEFT export")
    parser.add_argument("--dataset-dir", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--report-path", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--model-name", default=DEFAULT_MODEL)
    parser.add_argument("--max-seq-length", type=int, default=DEFAULT_MAX_SEQ_LENGTH)
    parser.add_argument("--max-steps", type=int, default=8)
    parser.add_argument("--batch-size", type=int, default=1)
    parser.add_argument("--grad-accum", type=int, default=2)
    parser.add_argument("--learning-rate", type=float, default=2e-4)
    parser.add_argument("--lora-r", type=int, default=16)
    parser.add_argument("--lora-alpha", type=int, default=16)
    parser.add_argument("--seed", type=int, default=3407)
    parser.add_argument("--max-new-tokens", type=int, default=512)
    parser.add_argument("--skip-training", action="store_true")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def disk_free_gb(path: Path) -> float:
    usage = shutil.disk_usage(path)
    return round(usage.free / (1024**3), 2)


def collect_environment() -> dict[str, Any]:
    env: dict[str, Any] = {
        "platform": platform.platform(),
        "python": sys.version.replace("\n", " "),
        "cwd": str(Path.cwd()),
    }
    for pkg in ["torch", "transformers", "datasets", "peft", "trl", "accelerate", "bitsandbytes", "unsloth"]:
        try:
            mod = __import__(pkg)
            env[pkg] = getattr(mod, "__version__", "installed")
        except Exception as exc:
            env[pkg] = f"missing ({type(exc).__name__})"

    try:
        import torch

        env["cuda_available"] = torch.cuda.is_available()
        env["cuda_device_count"] = torch.cuda.device_count()
        if torch.cuda.is_available():
            env["gpu_name"] = torch.cuda.get_device_name(0)
            props = torch.cuda.get_device_properties(0)
            env["gpu_vram_gb"] = round(props.total_memory / (1024**3), 2)
            env["cuda_version"] = getattr(torch.version, "cuda", None)
    except Exception as exc:
        env["cuda_available"] = False
        env["cuda_error"] = str(exc)

    try:
        import psutil

        mem = psutil.virtual_memory()
        env["ram_total_gb"] = round(mem.total / (1024**3), 2)
        env["ram_available_gb"] = round(mem.available / (1024**3), 2)
    except Exception:
        env["ram_total_gb"] = None
        env["ram_available_gb"] = None

    env["disk_free_gb"] = disk_free_gb(Path.cwd())
    return env


def token_stats(tokenizer, train_rows, val_rows, max_seq_length: int) -> dict[str, Any]:
    all_rows = train_rows + val_rows
    lengths: list[int] = []
    truncated = 0
    for row in all_rows:
        messages = training_messages([row])[0]
        text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
        ids = tokenizer(text, add_special_tokens=False)["input_ids"]
        lengths.append(len(ids))
        if len(ids) > max_seq_length:
            truncated += 1
    if not lengths:
        return {"count": 0, "min": 0, "max": 0, "avg": 0.0, "truncated": 0, "max_seq_length": max_seq_length}
    return {
        "count": len(lengths),
        "min": min(lengths),
        "max": max(lengths),
        "avg": round(sum(lengths) / len(lengths), 1),
        "truncated": truncated,
        "max_seq_length": max_seq_length,
    }


def validate_batch(tokenizer, train_rows, max_seq_length: int) -> dict[str, Any]:
    import torch
    from datasets import Dataset

    messages = training_messages(train_rows[:1])
    text = tokenizer.apply_chat_template(messages[0], tokenize=False, add_generation_prompt=False)
    encoded = tokenizer(
        text,
        truncation=True,
        max_length=max_seq_length,
        padding="max_length",
        return_tensors="pt",
    )
    input_ids = encoded["input_ids"]
    attention_mask = encoded["attention_mask"]
    labels = input_ids.clone()
    labels[attention_mask == 0] = -100

    finite = bool(torch.isfinite(input_ids.float()).all() and torch.isfinite(labels.float()).all())
    ignored = int((labels == -100).sum().item())
    trainable_tokens = int((labels != -100).sum().item())

    return {
        "input_ids_shape": list(input_ids.shape),
        "attention_mask_shape": list(attention_mask.shape),
        "labels_shape": list(labels.shape),
        "ignored_label_count": ignored,
        "trainable_token_count": trainable_tokens,
        "finite": finite,
        "loss_scope": "full_sequence_sft",
        "note": "Current train_lora.py uses full formatted chat text; not assistant-only masking.",
    }


def count_trainable_params(model) -> dict[str, Any]:
    trainable = 0
    total = 0
    for param in model.parameters():
        n = param.numel()
        total += n
        if param.requires_grad:
            trainable += n
    pct = round((trainable / total) * 100, 4) if total else 0.0
    return {"trainable": trainable, "total": total, "trainable_pct": pct}


def verify_target_modules(model) -> list[str]:
    module_names = {name for name, _ in model.named_modules()}
    missing = []
    for target in TARGET_MODULES:
        if not any(f".{target}" in name or name.endswith(target) for name in module_names):
            missing.append(target)
    return missing


def run_inference(model, tokenizer, prompt: str, max_new_tokens: int, seed: int) -> str:
    import torch
    from unsloth.chat_templates import get_chat_template

    tokenizer = apply_gemma_chat_template(tokenizer)
    messages = [
        {
            "role": "system",
            "content": "Sen deneyimli bir ürün yöneticisi ve teknik yazar asistanısın.",
        },
        {"role": "user", "content": prompt},
    ]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(text, return_tensors="pt").to(model.device)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            temperature=1.0,
            top_p=1.0,
            use_cache=True,
        )
    generated = tokenizer.decode(output[0][inputs["input_ids"].shape[1] :], skip_special_tokens=True)
    return generated.strip()


def analyze_output(text: str) -> dict[str, Any]:
    headings = [
        "## 1. Proje Özeti",
        "## 2. Problem, Hedefler ve Başarı Ölçütleri",
        "## 3. Kullanıcılar ve Roller",
        "## 4. Fonksiyonel Gereksinimler",
        "## 5. Fonksiyonel Olmayan Gereksinimler",
        "## 6. Teknik Mimari",
        "## 7. Veri Modeli",
        "## 8. Güvenlik ve Gizlilik",
        "## 9. Yol Haritası ve Kabul Kriterleri",
    ]
    section_hits = sum(1 for h in headings if h in text)
    return {
        "chars": len(text),
        "section_hits": section_hits,
        "has_product_spec_prefix": text.startswith("# Product Spec:"),
        "placeholder_like": bool(
            __import__("re").search(r"TODO|TBD|\[\s*\]|placeholder|-önlem-", text, __import__("re").I)
        ),
        "truncated_like": text.rstrip().endswith("...") or section_hits < 3,
        "turkish_chars": bool(__import__("re").search(r"[ğüşıöçĞÜŞİÖÇ]", text)),
    }


def write_report(path: Path, report: dict[str, Any]) -> None:
    def md_section(title: str, body: str) -> str:
        return f"## {title}\n\n{body.strip()}\n\n"

    lines = [
        "# PEFT Final-30 LoRA Smoke Training Report",
        "",
        f"Generated: {report.get('generated_at', utc_now())}",
        "",
        md_section("Ortam", report.get("environment_md", "_n/a_")),
        md_section("Dataset Doğrulaması", report.get("dataset_md", "_n/a_")),
        md_section("Base Model", report.get("base_model_md", "_n/a_")),
        md_section("LoRA Konfigürasyonu", report.get("lora_md", "_n/a_")),
        md_section("Batch Doğrulaması", report.get("batch_md", "_n/a_")),
        md_section("Smoke Training Sonucu", report.get("training_md", "_n/a_")),
        md_section("Adapter Dosyaları", report.get("adapter_md", "_n/a_")),
        md_section("Base vs Adapter Inference", report.get("inference_md", "_n/a_")),
        md_section("Tam Eğitim Önerisi", report.get("full_train_md", "_n/a_")),
        md_section("Son Karar", f"**{report.get('decision', 'SMOKE_TRAINING_FAIL')}**"),
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    args = parse_args()
    report: dict[str, Any] = {"generated_at": utc_now(), "decision": "SMOKE_TRAINING_FAIL"}
    output_dir = args.output_dir.resolve()
    dataset_dir = args.dataset_dir.resolve()
    report_path = args.report_path.resolve()

    try:
        train_rows, val_rows, manifest = load_peft_export(dataset_dir)
        stats = summarize_dataset(train_rows, val_rows, manifest)
        env = collect_environment()

        report["environment_md"] = "\n".join(
            [
                f"- Platform: `{env.get('platform')}`",
                f"- Python: `{env.get('python')}`",
                *(f"- {k}: `{env[k]}`" for k in ["torch", "transformers", "datasets", "peft", "trl", "accelerate", "bitsandbytes", "unsloth"] if k in env),
                f"- CUDA available: `{env.get('cuda_available')}`",
                f"- GPU: `{env.get('gpu_name', 'n/a')}`",
                f"- VRAM (GB): `{env.get('gpu_vram_gb', 'n/a')}`",
                f"- RAM total/available (GB): `{env.get('ram_total_gb')}` / `{env.get('ram_available_gb')}`",
                f"- Disk free (GB): `{env.get('disk_free_gb')}`",
            ]
        )

        report["dataset_md"] = "\n".join(
            [
                f"- train_records: **{stats.train_rows}**",
                f"- val_records: **{stats.val_rows}**",
                f"- manifest exported: **{stats.manifest_exported}**",
                f"- avg assistant chars: **{stats.avg_assistant_chars:.0f}**",
                f"- languages: `{json.dumps(stats.languages, ensure_ascii=False)}`",
            ]
        )

        import torch

        if not torch.cuda.is_available():
            raise SystemExit("CUDA GPU not detected — smoke training requires GPU (Docker --gpus all or Linux/WSL CUDA).")

        from unsloth import FastLanguageModel  # noqa: E402 — must precede trl/transformers/peft
        from datasets import Dataset
        from trl import SFTConfig, SFTTrainer
        from unsloth.chat_templates import get_chat_template

        report["base_model_md"] = "\n".join(
            [
                f"- model_id: `{args.model_name}`",
                f"- max_seq_length: **{args.max_seq_length}**",
                f"- quantization: **4-bit (bitsandbytes via Unsloth)**",
                f"- chat_template: **{DEFAULT_CHAT_TEMPLATE}**",
            ]
        )

        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name=args.model_name,
            max_seq_length=args.max_seq_length,
            dtype=None,
            load_in_4bit=True,
        )
        tokenizer = apply_gemma_chat_template(tokenizer)

        tok_stats = token_stats(tokenizer, train_rows, val_rows, args.max_seq_length)
        report["dataset_md"] += "\n" + "\n".join(
            [
                f"- token min/max/avg: **{tok_stats['min']} / {tok_stats['max']} / {tok_stats['avg']}**",
                f"- context limit: **{tok_stats['max_seq_length']}**",
                f"- truncated record count: **{tok_stats['truncated']}**",
            ]
        )
        if tok_stats["truncated"] > 0:
            raise SystemExit(
                f"{tok_stats['truncated']} record(s) exceed max_seq_length={args.max_seq_length}; "
                "do not silently truncate — increase max_seq_length or shorten export prompts."
            )

        missing_targets = verify_target_modules(model)
        if missing_targets:
            raise SystemExit(f"Missing LoRA target modules in model: {missing_targets}")

        model = FastLanguageModel.get_peft_model(
            model,
            r=args.lora_r,
            target_modules=TARGET_MODULES,
            lora_alpha=args.lora_alpha,
            lora_dropout=0,
            bias="none",
            use_gradient_checkpointing="unsloth",
            random_state=args.seed,
        )
        param_stats = count_trainable_params(model)
        report["lora_md"] = "\n".join(
            [
                f"- r: **{args.lora_r}**",
                f"- lora_alpha: **{args.lora_alpha}**",
                f"- lora_dropout: **0**",
                f"- target_modules: `{', '.join(TARGET_MODULES)}`",
                f"- bias: **none**",
                f"- task_type: **CAUSAL_LM (SFT)**",
                f"- trainable params: **{param_stats['trainable']:,}**",
                f"- total params: **{param_stats['total']:,}**",
                f"- trainable %: **{param_stats['trainable_pct']}%**",
            ]
        )

        batch_info = validate_batch(tokenizer, train_rows, args.max_seq_length)
        report["batch_md"] = "```json\n" + json.dumps(batch_info, indent=2) + "\n```"

        if args.skip_training:
            report["decision"] = "SMOKE_TRAINING_FAIL"
            report["training_md"] = "_Training skipped by flag._"
            write_report(report_path, report)
            return 1

        train_messages = training_messages(train_rows)
        eval_messages = training_messages(val_rows) if val_rows else None
        train_dataset = Dataset.from_dict({"messages": train_messages})
        eval_dataset = Dataset.from_dict({"messages": eval_messages}) if eval_messages else None

        def formatting_prompts_func(examples):
            texts = [
                tokenizer.apply_chat_template(conversation, tokenize=False, add_generation_prompt=False)
                for conversation in examples["messages"]
            ]
            return {"text": texts}

        output_dir.mkdir(parents=True, exist_ok=True)
        training_args = SFTConfig(
            output_dir=str(output_dir),
            per_device_train_batch_size=args.batch_size,
            gradient_accumulation_steps=args.grad_accum,
            num_train_epochs=1,
            max_steps=args.max_steps,
            learning_rate=args.learning_rate,
            logging_steps=1,
            save_strategy="steps",
            save_steps=max(1, args.max_steps),
            save_total_limit=1,
            eval_strategy="steps" if eval_dataset is not None else "no",
            eval_steps=max(1, args.max_steps // 2),
            optim="adamw_8bit",
            seed=args.seed,
            report_to="none",
            dataset_text_field="text",
            max_seq_length=args.max_seq_length,
            dataloader_num_workers=0,
            bf16=torch.cuda.is_bf16_supported(),
            fp16=not torch.cuda.is_bf16_supported(),
        )

        trainer = SFTTrainer(
            model=model,
            tokenizer=tokenizer,
            train_dataset=train_dataset.map(formatting_prompts_func, batched=True, remove_columns=train_dataset.column_names),
            eval_dataset=(
                eval_dataset.map(formatting_prompts_func, batched=True, remove_columns=eval_dataset.column_names)
                if eval_dataset is not None
                else None
            ),
            args=training_args,
        )

        if torch.cuda.is_available():
            torch.cuda.reset_peak_memory_stats()

        started = time.time()
        train_result = trainer.train()
        runtime_sec = round(time.time() - started, 2)

        eval_loss = None
        if eval_dataset is not None:
            metrics = trainer.evaluate()
            eval_loss = metrics.get("eval_loss")

        peak_mem_gb = None
        if torch.cuda.is_available():
            peak_mem_gb = round(torch.cuda.max_memory_allocated() / (1024**3), 2)

        adapter_dir = output_dir / "lora_adapter"
        model.save_pretrained(str(adapter_dir))
        tokenizer.save_pretrained(str(adapter_dir))

        run_meta = {
            "base_model": args.model_name,
            "train_rows": len(train_rows),
            "val_rows": len(val_rows),
            "max_steps": args.max_steps,
            "runtime_sec": runtime_sec,
            "train_loss": train_result.training_loss,
            "eval_loss": eval_loss,
        }
        with (output_dir / "run_meta.json").open("w", encoding="utf-8") as handle:
            json.dump(run_meta, handle, indent=2)

        adapter_files = sorted(p.name for p in adapter_dir.iterdir()) if adapter_dir.exists() else []
        report["training_md"] = "\n".join(
            [
                f"- max_steps: **{args.max_steps}**",
                f"- final training loss: **{train_result.training_loss:.6f}**",
                f"- validation loss: **{eval_loss if eval_loss is not None else 'n/a'}**",
                f"- runtime (sec): **{runtime_sec}**",
                f"- peak GPU memory (GB): **{peak_mem_gb}**",
                f"- checkpoint/output: `{output_dir}`",
            ]
        )
        report["adapter_md"] = "\n".join(
            [
                f"- adapter dir: `{adapter_dir}`",
                f"- files: `{', '.join(adapter_files)}`",
                f"- has adapter_config.json: **{'adapter_config.json' in adapter_files}**",
                f"- has adapter weights: **{any('adapter_model' in f for f in adapter_files)}**",
                f"- base weights copied to output: **False (adapter-only save)**",
            ]
        )

        # Inference: reload base, then adapter
        FastLanguageModel.for_inference(model)
        base_out = run_inference(model, tokenizer, TEST_PROMPT, args.max_new_tokens, args.seed)

        # Load adapter fresh for comparison
        base_model, base_tok = FastLanguageModel.from_pretrained(
            model_name=args.model_name,
            max_seq_length=args.max_seq_length,
            dtype=None,
            load_in_4bit=True,
        )
        from peft import PeftModel

        lora_model = PeftModel.from_pretrained(base_model, str(adapter_dir))
        FastLanguageModel.for_inference(lora_model)
        adapter_out = run_inference(lora_model, base_tok, TEST_PROMPT, args.max_new_tokens, args.seed)

        base_metrics = analyze_output(base_out)
        adapter_metrics = analyze_output(adapter_out)

        report["inference_md"] = "\n".join(
            [
                f"**Test prompt:** {TEST_PROMPT}",
                "",
                "**Base model metrics:**",
                "```json",
                json.dumps(base_metrics, indent=2, ensure_ascii=False),
                "```",
                "",
                "**Adapter metrics:**",
                "```json",
                json.dumps(adapter_metrics, indent=2, ensure_ascii=False),
                "```",
                "",
                "**Base excerpt (first 600 chars):**",
                "```",
                base_out[:600],
                "```",
                "",
                "**Adapter excerpt (first 600 chars):**",
                "```",
                adapter_out[:600],
                "```",
            ]
        )

        finite_loss = train_result.training_loss is not None and math.isfinite(train_result.training_loss)
        if eval_loss is not None and not math.isfinite(eval_loss):
            finite_loss = False

        passed = (
            stats.train_rows >= 1
            and tok_stats["truncated"] == 0
            and not missing_targets
            and finite_loss
            and adapter_dir.exists()
            and ("adapter_config.json" in adapter_files)
            and any("adapter_model" in f for f in adapter_files)
            and base_out
            and adapter_out
        )
        report["decision"] = "SMOKE_TRAINING_PASS" if passed else "SMOKE_TRAINING_FAIL"

        report["full_train_md"] = "\n".join(
            [
                "Smoke PASS — önerilen tam eğitim (bu görevde başlatılmadı):",
                "",
                "```bash",
                "cd backend/deployments/finetune",
                "python train_lora.py \\",
                f"  --dataset-dir {dataset_dir} \\",
                f"  --output-dir ../../training-output/lora-full-final-30 \\",
                f"  --model-name {args.model_name} \\",
                "  --epochs 3 \\",
                "  --batch-size 1 \\",
                "  --grad-accum 8 \\",
                "  --learning-rate 2e-4 \\",
                f"  --max-seq-length {args.max_seq_length} \\",
                "  --force",
                "```",
                "",
                "- warmup: default TRL (use warmup_ratio ~0.03 in full run config)",
                "- scheduler: cosine (TRL default)",
                "- save/eval: epoch strategy",
                "- early stopping: manual via val loss plateau (~3 epochs yeterli, 30 örnek)",
                "- tahmini runtime (RTX 5070 Ti, 30 kayıt, 3 epoch): ~15–25 dk",
                "- tahmini disk: adapter ~100–200 MB + checkpoints ~200 MB",
            ]
        )

        write_report(report_path, report)
        print(json.dumps({"decision": report["decision"], "report": str(report_path), "output_dir": str(output_dir)}, indent=2))
        return 0 if passed else 1

    except SystemExit as exc:
        report["training_md"] = f"Aborted: {exc}"
        report["decision"] = "SMOKE_TRAINING_FAIL"
        write_report(report_path, report)
        print(str(exc))
        return 1
    except Exception:
        tb = traceback.format_exc()
        report["training_md"] = f"Error during smoke training:\n\n```\n{tb[-4000:]}\n```"
        report["decision"] = "SMOKE_TRAINING_FAIL"
        write_report(report_path, report)
        print(tb)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
