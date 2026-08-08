#!/usr/bin/env python3
"""Deterministic base vs full LoRA comparison on fixed prompts."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from smoke_lora_final_30 import (
    DEFAULT_CHAT_TEMPLATE,
    DEFAULT_MAX_SEQ_LENGTH,
    DEFAULT_MODEL,
    analyze_output,
    apply_gemma_chat_template,
    collect_environment,
)

DEFAULT_CONFIG = Path("compare_prompts_final_30.json")
DEFAULT_OUTPUT = Path("../../training-output/lora-full-final-30-comparison")
DEFAULT_REPORT = Path("../../peft-final-30-comparison-report.md")

PRODUCT_SPEC_SECTIONS = [
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


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compare base model vs full LoRA adapter on fixed prompts")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--report-path", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--max-seq-length", type=int, default=DEFAULT_MAX_SEQ_LENGTH)
    return parser.parse_args()


def load_config(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Prompt config not found: {path}")
    with path.open("r", encoding="utf-8") as handle:
        config = json.load(handle)
    return config


def validate_config(config: dict[str, Any], config_path: Path, finetune_dir: Path) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []

    base_model = config.get("base_model")
    if not base_model:
        errors.append("missing base_model")

    adapter_dir_raw = config.get("adapter_dir")
    if not adapter_dir_raw:
        errors.append("missing adapter_dir")
    adapter_dir = (finetune_dir / adapter_dir_raw).resolve()
    if not adapter_dir.exists():
        errors.append(f"adapter_dir not found: {adapter_dir}")
    elif not (adapter_dir / "adapter_config.json").exists():
        errors.append(f"adapter_config.json missing in {adapter_dir}")
    elif not any(adapter_dir.glob("adapter_model.*")):
        errors.append(f"adapter weights missing in {adapter_dir}")

    generation = config.get("generation") or {}
    for key in ("seed", "max_new_tokens", "do_sample"):
        if key not in generation:
            errors.append(f"generation.{key} missing")

    prompts = config.get("prompts")
    if not isinstance(prompts, list) or len(prompts) != 5:
        errors.append("prompts must contain exactly 5 entries")
    else:
        ids = [p.get("id") for p in prompts]
        if len(set(ids)) != len(ids):
            errors.append("duplicate prompt ids")
        for prompt in prompts:
            if not prompt.get("id"):
                errors.append("prompt missing id")
            if not prompt.get("text"):
                errors.append(f"prompt {prompt.get('id', '?')} missing text")

    chat_template = config.get("chat_template", DEFAULT_CHAT_TEMPLATE)
    if chat_template != DEFAULT_CHAT_TEMPLATE:
        warnings.append(f"chat_template={chat_template!r} differs from training default {DEFAULT_CHAT_TEMPLATE!r}")

    system_prompt = config.get("system_prompt", "")
    if not system_prompt.strip():
        errors.append("system_prompt is empty")

    return {
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "base_model": base_model,
        "adapter_dir": str(adapter_dir),
        "chat_template": chat_template,
        "system_prompt": system_prompt,
        "generation": generation,
        "prompts": prompts or [],
        "config_path": str(config_path.resolve()),
    }


def extended_metrics(text: str) -> dict[str, Any]:
    base = analyze_output(text)
    lines = [ln for ln in text.splitlines() if ln.strip()]
    words = re.findall(r"\S+", text)
    json_like = bool(re.match(r"^\s*[\[{]", text))
    return {
        **base,
        "line_count": len(lines),
        "word_count": len(words),
        "json_like": json_like,
        "sha256_prefix": hashlib.sha256(text.encode("utf-8")).hexdigest()[:16],
    }


def compare_metrics(base: dict[str, Any], adapter: dict[str, Any]) -> dict[str, Any]:
    return {
        "section_hits_delta": adapter["section_hits"] - base["section_hits"],
        "chars_delta": adapter["chars"] - base["chars"],
        "word_count_delta": adapter["word_count"] - base["word_count"],
        "identical_output": base["sha256_prefix"] == adapter["sha256_prefix"],
        "adapter_better_sections": adapter["section_hits"] > base["section_hits"],
        "adapter_better_prefix": adapter["has_product_spec_prefix"] and not base["has_product_spec_prefix"],
        "adapter_fewer_placeholders": base["placeholder_like"] and not adapter["placeholder_like"],
        "adapter_less_truncated": base["truncated_like"] and not adapter["truncated_like"],
    }


def run_inference(
    model,
    tokenizer,
    system_prompt: str,
    user_prompt: str,
    max_new_tokens: int,
    seed: int,
    do_sample: bool,
    temperature: float,
    top_p: float,
) -> str:
    import torch

    tokenizer = apply_gemma_chat_template(tokenizer)
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
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
            do_sample=do_sample,
            temperature=temperature,
            top_p=top_p,
            use_cache=True,
        )
    generated = tokenizer.decode(output[0][inputs["input_ids"].shape[1] :], skip_special_tokens=True)
    return generated.strip()


def verify_adapter_applied(model, tokenizer, cfg: dict[str, Any]) -> dict[str, Any]:
    from peft import PeftModel

    gen = cfg["generation"]
    probe_prompt = cfg["prompts"][0]["text"]
    system_prompt = cfg["system_prompt"]

    if not isinstance(model, PeftModel):
        return {"adapter_active": False, "is_peft_model": False, "error": "model is not PeftModel"}

    with model.disable_adapter():
        disabled_out = run_inference(
            model,
            tokenizer,
            system_prompt,
            probe_prompt,
            gen["max_new_tokens"],
            gen["seed"],
            gen["do_sample"],
            gen.get("temperature", 1.0),
            gen.get("top_p", 1.0),
        )
    enabled_out = run_inference(
        model,
        tokenizer,
        system_prompt,
        probe_prompt,
        gen["max_new_tokens"],
        gen["seed"],
        gen["do_sample"],
        gen.get("temperature", 1.0),
        gen.get("top_p", 1.0),
    )

    peft_config = getattr(model, "peft_config", {})
    active_adapters = list(peft_config.keys()) if peft_config else []

    return {
        "is_peft_model": True,
        "adapter_active": True,
        "active_adapters": active_adapters,
        "probe_prompt_id": cfg["prompts"][0]["id"],
        "disabled_equals_enabled": disabled_out == enabled_out,
        "disabled_sha256_prefix": hashlib.sha256(disabled_out.encode("utf-8")).hexdigest()[:16],
        "enabled_sha256_prefix": hashlib.sha256(enabled_out.encode("utf-8")).hexdigest()[:16],
    }


def verify_tokenizer_parity(base_tokenizer, adapter_dir: Path) -> dict[str, Any]:
    adapter_tok_cfg = adapter_dir / "tokenizer_config.json"
    base_vocab = getattr(base_tokenizer, "vocab_size", None)
    same_template = True
    if adapter_tok_cfg.exists():
        with adapter_tok_cfg.open("r", encoding="utf-8") as handle:
            adapter_cfg = json.load(handle)
        base_name = getattr(base_tokenizer, "name_or_path", None)
        adapter_name = adapter_cfg.get("name_or_path")
    else:
        adapter_cfg = {}
        adapter_name = None
        base_name = getattr(base_tokenizer, "name_or_path", None)
        same_template = False

    return {
        "base_tokenizer_path": base_name,
        "adapter_tokenizer_config_path": str(adapter_tok_cfg) if adapter_tok_cfg.exists() else None,
        "adapter_tokenizer_name_or_path": adapter_name,
        "base_vocab_size": base_vocab,
        "adapter_chat_template_file_exists": (adapter_dir / "chat_template.jinja").exists(),
        "tokenizer_files_present": sorted(p.name for p in adapter_dir.glob("tokenizer*")),
        "chat_template_reapplied_via_unsloth": same_template,
    }


def score_prompt_comparison(base_metrics: dict[str, Any], adapter_metrics: dict[str, Any], cmp: dict[str, Any]) -> dict[str, Any]:
    score = 0
    reasons: list[str] = []

    if cmp["identical_output"]:
        reasons.append("identical_output")
    else:
        score += 1

    if adapter_metrics["section_hits"] > base_metrics["section_hits"]:
        score += 2
        reasons.append("more_sections")
    elif adapter_metrics["section_hits"] < base_metrics["section_hits"]:
        score -= 2
        reasons.append("fewer_sections")

    if adapter_metrics["has_product_spec_prefix"] and not base_metrics["has_product_spec_prefix"]:
        score += 2
        reasons.append("product_spec_prefix_gained")
    elif base_metrics["has_product_spec_prefix"] and not adapter_metrics["has_product_spec_prefix"]:
        score -= 2
        reasons.append("product_spec_prefix_lost")

    if base_metrics["placeholder_like"] and not adapter_metrics["placeholder_like"]:
        score += 1
        reasons.append("placeholders_reduced")

    if base_metrics["truncated_like"] and not adapter_metrics["truncated_like"]:
        score += 1
        reasons.append("truncation_reduced")

    if adapter_metrics["turkish_chars"] and not base_metrics["turkish_chars"]:
        score += 1

    verdict = "adapter_better" if score >= 2 else ("tie" if score >= 0 else "base_better")
    return {"score": score, "verdict": verdict, "reasons": reasons}


def human_review_notes(results: list[dict[str, Any]], adapter_check: dict[str, Any]) -> list[str]:
    notes: list[str] = []
    if adapter_check.get("disabled_equals_enabled"):
        notes.append(
            "Adapter probe: disable/enable çıktıları aynı — LoRA etkisi zayıf veya prompt bazında fark görünmüyor."
        )
    else:
        notes.append("Adapter probe: disable vs enable çıktıları farklı — ağırlıklar inference sırasında uygulanıyor.")

    better = sum(1 for r in results if r["comparison"]["adapter_better_sections"])
    prefix_gains = sum(1 for r in results if r["comparison"]["adapter_better_prefix"])
    identical = sum(1 for r in results if r["comparison"]["identical_output"])

    notes.append(f"{better}/5 prompt'ta adapter daha fazla standart bölüm başlığı üretti.")
    notes.append(f"{prefix_gains}/5 prompt'ta adapter `# Product Spec:` önekini base'e göre daha iyi yakaladı.")
    if identical:
        notes.append(f"{identical}/5 prompt'ta base ve adapter çıktıları birebir aynı.")

    avg_base_sections = sum(r["base_metrics"]["section_hits"] for r in results) / len(results)
    avg_adapter_sections = sum(r["adapter_metrics"]["section_hits"] for r in results) / len(results)
    notes.append(
        f"Ortalama section hit: base={avg_base_sections:.2f}, adapter={avg_adapter_sections:.2f} "
        f"(hedef şablon: {len(PRODUCT_SPEC_SECTIONS)} bölüm)."
    )
    return notes


def decide_outcome(
    validation: dict[str, Any],
    env: dict[str, Any],
    adapter_check: dict[str, Any],
    results: list[dict[str, Any]],
) -> str:
    if not validation["valid"]:
        return "COMPARISON_FAIL"
    if not env.get("cuda_available"):
        return "COMPARISON_FAIL"
    if not adapter_check.get("is_peft_model"):
        return "COMPARISON_FAIL"
    if not results or any(not r["base_output"] or not r["adapter_output"] for r in results):
        return "COMPARISON_FAIL"

    adapter_wins = sum(1 for r in results if r["prompt_verdict"]["verdict"] == "adapter_better")
    ties = sum(1 for r in results if r["prompt_verdict"]["verdict"] == "tie")
    avg_section_delta = sum(r["comparison"]["section_hits_delta"] for r in results) / len(results)

    if adapter_wins >= 3 or (adapter_wins >= 2 and avg_section_delta > 0):
        return "COMPARISON_PASS"
    if adapter_wins >= 2 and ties >= 2 and avg_section_delta >= 0:
        return "COMPARISON_PASS"
    return "COMPARISON_FAIL"


def write_report(path: Path, payload: dict[str, Any]) -> None:
    lines = [
        "# PEFT Final-30 Base vs Full LoRA Comparison Report",
        "",
        f"Generated: {payload['generated_at']}",
        "",
        "## Ortam",
        "",
    ]
    env = payload["environment"]
    for key in [
        "platform",
        "python",
        "torch",
        "transformers",
        "peft",
        "unsloth",
        "cuda_available",
        "gpu_name",
        "gpu_vram_gb",
        "cuda_version",
    ]:
        if key in env:
            lines.append(f"- {key}: `{env[key]}`")

    setup = payload["setup"]
    lines.extend(
        [
            "",
            "## Model Setup",
            "",
            f"- base_model: `{setup['base_model']}`",
            f"- adapter_dir: `{setup['adapter_dir']}`",
            f"- device: `{setup['device']}`",
            f"- dtype: `{setup['dtype']}`",
            f"- quantization: `{setup['quantization']}`",
            f"- adapter_active: `{setup['adapter_active']}`",
            f"- generation: `{json.dumps(setup['generation'], ensure_ascii=False)}`",
            "",
            "## Prompt Config Validation",
            "",
            f"- config: `{payload['validation']['config_path']}`",
            f"- valid: **{payload['validation']['valid']}**",
        ]
    )
    if payload["validation"]["warnings"]:
        lines.append("- warnings:")
        for warning in payload["validation"]["warnings"]:
            lines.append(f"  - {warning}")

    lines.extend(["", "## Adapter Verification", "", "```json", json.dumps(payload["adapter_check"], indent=2, ensure_ascii=False), "```"])
    lines.extend(["", "## Tokenizer Parity", "", "```json", json.dumps(payload["tokenizer_check"], indent=2, ensure_ascii=False), "```"])
    lines.extend(["", "## Aggregate Metrics", "", "```json", json.dumps(payload["aggregate"], indent=2, ensure_ascii=False), "```"])
    lines.extend(["", "## Human Review", ""])
    for note in payload["human_review"]:
        lines.append(f"- {note}")

    for item in payload["results"]:
        lines.extend(
            [
                "",
                f"### Prompt `{item['id']}`",
                "",
                f"**User prompt:** {item['text']}",
                "",
                "**Metrics**",
                "",
                "```json",
                json.dumps(
                    {
                        "base": item["base_metrics"],
                        "adapter": item["adapter_metrics"],
                        "comparison": item["comparison"],
                        "prompt_verdict": item["prompt_verdict"],
                    },
                    indent=2,
                    ensure_ascii=False,
                ),
                "```",
                "",
                "**Base excerpt (first 800 chars):**",
                "",
                "```",
                item["base_output"][:800],
                "```",
                "",
                "**Adapter excerpt (first 800 chars):**",
                "",
                "```",
                item["adapter_output"][:800],
                "```",
            ]
        )

    lines.extend(["", "## Decision", "", f"**{payload['decision']}**", ""])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    args = parse_args()
    finetune_dir = Path(__file__).resolve().parent
    config_path = args.config if args.config.is_absolute() else finetune_dir / args.config
    output_dir = args.output_dir.resolve()
    report_path = args.report_path.resolve()
    outputs_dir = output_dir / "outputs"

    payload: dict[str, Any] = {"generated_at": utc_now(), "decision": "COMPARISON_FAIL"}

    try:
        config = load_config(config_path)
        validation = validate_config(config, config_path, finetune_dir)
        if not validation["valid"]:
            payload["validation"] = validation
            write_report(report_path, payload)
            print(json.dumps({"decision": "COMPARISON_FAIL", "errors": validation["errors"]}, indent=2))
            return 1

        import torch
        from peft import PeftModel
        from unsloth import FastLanguageModel

        env = collect_environment()
        gen = validation["generation"]
        adapter_dir = Path(validation["adapter_dir"])

        base_model, base_tokenizer = FastLanguageModel.from_pretrained(
            model_name=validation["base_model"],
            max_seq_length=args.max_seq_length,
            dtype=None,
            load_in_4bit=True,
        )
        base_tokenizer = apply_gemma_chat_template(base_tokenizer)

        lora_model = PeftModel.from_pretrained(base_model, str(adapter_dir))
        lora_tokenizer = apply_gemma_chat_template(base_tokenizer)

        FastLanguageModel.for_inference(lora_model)

        device = str(next(lora_model.parameters()).device)
        dtype = str(next(lora_model.parameters()).dtype)
        adapter_check = verify_adapter_applied(lora_model, lora_tokenizer, validation)
        tokenizer_check = verify_tokenizer_parity(base_tokenizer, adapter_dir)

        setup = {
            "base_model": validation["base_model"],
            "adapter_dir": validation["adapter_dir"],
            "device": device,
            "dtype": dtype,
            "quantization": "4-bit (bitsandbytes via Unsloth)",
            "adapter_active": adapter_check.get("adapter_active", False),
            "generation": gen,
            "chat_template": validation["chat_template"],
        }

        # Base-only model for side-by-side inference
        base_only, base_only_tok = FastLanguageModel.from_pretrained(
            model_name=validation["base_model"],
            max_seq_length=args.max_seq_length,
            dtype=None,
            load_in_4bit=True,
        )
        base_only_tok = apply_gemma_chat_template(base_only_tok)
        FastLanguageModel.for_inference(base_only)

        outputs_dir.mkdir(parents=True, exist_ok=True)
        results: list[dict[str, Any]] = []
        started = time.time()

        for prompt in validation["prompts"]:
            prompt_id = prompt["id"]
            text = prompt["text"]
            base_out = run_inference(
                base_only,
                base_only_tok,
                validation["system_prompt"],
                text,
                gen["max_new_tokens"],
                gen["seed"],
                gen["do_sample"],
                gen.get("temperature", 1.0),
                gen.get("top_p", 1.0),
            )
            adapter_out = run_inference(
                lora_model,
                lora_tokenizer,
                validation["system_prompt"],
                text,
                gen["max_new_tokens"],
                gen["seed"],
                gen["do_sample"],
                gen.get("temperature", 1.0),
                gen.get("top_p", 1.0),
            )

            (outputs_dir / f"{prompt_id}_base.txt").write_text(base_out, encoding="utf-8")
            (outputs_dir / f"{prompt_id}_adapter.txt").write_text(adapter_out, encoding="utf-8")

            base_metrics = extended_metrics(base_out)
            adapter_metrics = extended_metrics(adapter_out)
            comparison = compare_metrics(base_metrics, adapter_metrics)
            prompt_verdict = score_prompt_comparison(base_metrics, adapter_metrics, comparison)
            results.append(
                {
                    "id": prompt_id,
                    "text": text,
                    "base_output": base_out,
                    "adapter_output": adapter_out,
                    "base_metrics": base_metrics,
                    "adapter_metrics": adapter_metrics,
                    "comparison": comparison,
                    "prompt_verdict": prompt_verdict,
                }
            )

        runtime_sec = round(time.time() - started, 2)
        peak_mem_gb = round(torch.cuda.max_memory_allocated() / (1024**3), 2) if torch.cuda.is_available() else None

        aggregate = {
            "prompt_count": len(results),
            "adapter_wins": sum(1 for r in results if r["prompt_verdict"]["verdict"] == "adapter_better"),
            "base_wins": sum(1 for r in results if r["prompt_verdict"]["verdict"] == "base_better"),
            "ties": sum(1 for r in results if r["prompt_verdict"]["verdict"] == "tie"),
            "avg_section_hits_base": round(sum(r["base_metrics"]["section_hits"] for r in results) / len(results), 2),
            "avg_section_hits_adapter": round(sum(r["adapter_metrics"]["section_hits"] for r in results) / len(results), 2),
            "avg_section_hits_delta": round(
                sum(r["comparison"]["section_hits_delta"] for r in results) / len(results), 2
            ),
            "identical_outputs": sum(1 for r in results if r["comparison"]["identical_output"]),
            "runtime_sec": runtime_sec,
            "peak_gpu_memory_gb": peak_mem_gb,
        }

        human_review = human_review_notes(results, adapter_check)
        decision = decide_outcome(validation, env, adapter_check, results)

        sidecar = {
            "generated_at": payload["generated_at"],
            "decision": decision,
            "validation": validation,
            "environment": env,
            "setup": setup,
            "adapter_check": adapter_check,
            "tokenizer_check": tokenizer_check,
            "aggregate": aggregate,
            "human_review": human_review,
            "results": [
                {
                    **{k: v for k, v in item.items() if k not in ("base_output", "adapter_output")},
                    "base_output_path": str(outputs_dir / f"{item['id']}_base.txt"),
                    "adapter_output_path": str(outputs_dir / f"{item['id']}_adapter.txt"),
                }
                for item in results
            ],
        }

        output_dir.mkdir(parents=True, exist_ok=True)
        with (output_dir / "comparison_results.json").open("w", encoding="utf-8") as handle:
            json.dump(sidecar, handle, indent=2, ensure_ascii=False)

        payload.update(
            {
                "decision": decision,
                "validation": validation,
                "environment": env,
                "setup": setup,
                "adapter_check": adapter_check,
                "tokenizer_check": tokenizer_check,
                "aggregate": aggregate,
                "human_review": human_review,
                "results": results,
            }
        )
        write_report(report_path, payload)

        print(
            json.dumps(
                {
                    "decision": decision,
                    "report": str(report_path),
                    "results_json": str(output_dir / "comparison_results.json"),
                    "outputs_dir": str(outputs_dir),
                    "aggregate": aggregate,
                },
                indent=2,
                ensure_ascii=False,
            )
        )
        return 0 if decision == "COMPARISON_PASS" else 1

    except Exception as exc:
        payload["error"] = str(exc)
        payload["traceback"] = traceback.format_exc()
        try:
            write_report(report_path, payload)
        except Exception:
            pass
        print(json.dumps({"decision": "COMPARISON_FAIL", "error": str(exc)}, indent=2))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
