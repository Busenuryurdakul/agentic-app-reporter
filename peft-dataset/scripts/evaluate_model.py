#!/usr/bin/env python3
"""Compare base model and LoRA adapter outputs on held-out prompts."""

from __future__ import annotations

import argparse
import hashlib
import re
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from _utils import (  # noqa: E402
    PROJECT_ROOT,
    choose_torch_dtype,
    detect_device,
    estimate_tokens,
    load_json,
    resolve_project_path,
    save_json,
    torch_dtype_from_name,
)

SYSTEM_PROMPT = (
    "Sen Türkçe yanıt veren deneyimli bir ürün ve yazılım gereksinimleri uzmanısın."
)

HEADING_HINTS = {
    "product_spec": ["ürün özeti", "problem", "hedef kullanıcı", "gereksinim", "risk"],
    "project_planning": ["sprint", "faz", "milestone", "plan", "kilometre"],
    "requirement_analysis": ["fr-", "nfr", "must", "should", "gereksinim"],
    "technical_documentation": ["api", "endpoint", "schema", "deploy", "index"],
    "risk_analysis": ["risk", "mitigasyon", "etki", "olasılık"],
    "user_story": ["us-", "kabul", "kriter", "olarak", "istiyorum"],
}

PRODUCT_SPEC_SECTIONS = [
    "ürün özeti",
    "problem",
    "hedef kullanıcı",
    "temel özellik",
    "fonksiyonel gereksinim",
    "fonksiyonel olmayan",
    "teknik yaklaşım",
    "risk",
    "başarı kriter",
]

PROFILE_PRESETS: dict[str, dict[str, Any]] = {
    "deterministic": {
        "max_new_tokens": 512,
        "temperature": 0.3,
        "top_p": 0.9,
        "top_k": 50,
        "repetition_penalty": 1.15,
        "no_repeat_ngram_size": 3,
        "do_sample": False,
    },
    "controlled": {
        "max_new_tokens": 512,
        "temperature": 0.3,
        "top_p": 0.9,
        "top_k": 50,
        "repetition_penalty": 1.15,
        "no_repeat_ngram_size": 3,
        "do_sample": True,
    },
}

SAFE_DEFAULT_PROFILE = PROFILE_PRESETS["controlled"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Base vs LoRA model karşılaştırması")
    parser.add_argument("--base-model", required=True)
    parser.add_argument("--adapter-dir", required=True)
    parser.add_argument("--prompts", default="evaluation/prompts.json")
    parser.add_argument("--output-dir", default="training-output/evaluation")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument(
        "--profile",
        choices=sorted(PROFILE_PRESETS),
        default=None,
        help="Generation profili: deterministic (greedy) veya controlled (sampling)",
    )
    parser.add_argument("--max-new-tokens", type=int, default=None)
    parser.add_argument("--temperature", type=float, default=None)
    parser.add_argument("--top-p", type=float, default=None)
    parser.add_argument("--top-k", type=int, default=None)
    parser.add_argument("--repetition-penalty", type=float, default=None)
    parser.add_argument("--no-repeat-ngram-size", type=int, default=None)
    parser.add_argument(
        "--do-sample",
        action=argparse.BooleanOptionalAction,
        default=None,
        help="Sampling açık/kapalı; --no-do-sample ile greedy mod",
    )
    return parser.parse_args()


def resolve_generation_profile(args: argparse.Namespace) -> dict[str, Any]:
    base = (
        PROFILE_PRESETS[args.profile].copy()
        if args.profile
        else SAFE_DEFAULT_PROFILE.copy()
    )
    overrides = {
        "max_new_tokens": args.max_new_tokens,
        "temperature": args.temperature,
        "top_p": args.top_p,
        "top_k": args.top_k,
        "repetition_penalty": args.repetition_penalty,
        "no_repeat_ngram_size": args.no_repeat_ngram_size,
        "do_sample": args.do_sample,
    }
    for key, value in overrides.items():
        if value is not None:
            base[key] = value
    base["profile_name"] = args.profile or "default-controlled"
    return base


def build_user_content(item: dict[str, Any]) -> str:
    instruction = str(item.get("instruction", "")).strip()
    input_text = str(item.get("input", "")).strip()
    return f"{instruction}\n\n{input_text}" if input_text else instruction


def tokenize_words(text: str) -> list[str]:
    return [part for part in re.findall(r"\w+", text.lower()) if part]


def repeated_ngram_ratio(text: str, n: int = 3) -> float:
    words = tokenize_words(text)
    if len(words) < n:
        return 0.0
    ngrams = [tuple(words[i : i + n]) for i in range(len(words) - n + 1)]
    if not ngrams:
        return 0.0
    counts = Counter(ngrams)
    repeated = sum(count - 1 for count in counts.values() if count > 1)
    return round(repeated / len(ngrams), 4)


def longest_repeated_sequence(text: str, min_len: int = 8) -> int:
    normalized = re.sub(r"\s+", " ", text.strip().lower())
    if len(normalized) < min_len * 2:
        return 0
    best = 0
    for size in range(min_len, len(normalized) // 2 + 1):
        seen: set[str] = set()
        for start in range(0, len(normalized) - size + 1):
            chunk = normalized[start : start + size]
            if chunk in seen:
                best = max(best, size)
                break
            seen.add(chunk)
    return best


def prompt_echo_ratio(prompt: str, response: str) -> float:
    prompt_words = set(tokenize_words(prompt))
    response_words = tokenize_words(response)
    if not response_words:
        return 0.0
    overlap = sum(1 for word in response_words if word in prompt_words)
    return round(overlap / len(response_words), 4)


def unique_token_ratio(text: str) -> float:
    words = tokenize_words(text)
    if not words:
        return 0.0
    return round(len(set(words)) / len(words), 4)


def looks_turkish(text: str) -> bool:
    if not text.strip():
        return False
    turkish_chars = sum(1 for ch in text.lower() if ch in "ğüşıöç")
    common = sum(1 for word in ["ve", "için", "bir", "ile", "olarak"] if word in text.lower())
    return turkish_chars >= 2 or common >= 2


def category_section_coverage(category: str, text: str) -> dict[str, Any]:
    lowered = text.lower()
    hints = HEADING_HINTS.get(category, [])
    matched = [hint for hint in hints if hint in lowered]
    return {
        "expected_hints": hints,
        "matched_hints": matched,
        "matched_count": len(matched),
        "expected_count": len(hints),
        "coverage_ratio": round(len(matched) / len(hints), 4) if hints else 0.0,
    }


def product_spec_section_coverage(text: str) -> dict[str, Any]:
    lowered = text.lower()
    matched = [section for section in PRODUCT_SPEC_SECTIONS if section in lowered]
    return {
        "expected_sections": PRODUCT_SPEC_SECTIONS,
        "matched_sections": matched,
        "matched_count": len(matched),
        "expected_count": len(PRODUCT_SPEC_SECTIONS),
        "coverage_ratio": round(len(matched) / len(PRODUCT_SPEC_SECTIONS), 4),
    }


def analyze_response(category: str, prompt: str, text: str) -> dict[str, Any]:
    ngram_ratio = repeated_ngram_ratio(text)
    longest_repeat = longest_repeated_sequence(text)
    empty = not bool(text.strip())
    excessive = (
        ngram_ratio >= 0.25
        or longest_repeat >= 40
        or (len(text) > 200 and unique_token_ratio(text) < 0.35)
    )
    section = category_section_coverage(category, text)
    metrics: dict[str, Any] = {
        "repeated_ngram_ratio": ngram_ratio,
        "longest_repeated_sequence": longest_repeat,
        "prompt_echo_ratio": prompt_echo_ratio(prompt, text),
        "unique_token_ratio": unique_token_ratio(text),
        "excessive_repetition": excessive,
        "empty_response": empty,
        "language_check": looks_turkish(text),
        "section_coverage": section,
        "too_short": len(text.strip()) < 120,
    }
    if category == "product_spec":
        metrics["product_spec_sections"] = product_spec_section_coverage(text)
    return metrics


def quality_score(metrics: dict[str, Any]) -> float:
    if metrics["empty_response"]:
        return -1000.0
    score = 0.0
    if metrics["excessive_repetition"]:
        score -= 80.0
    score -= metrics["repeated_ngram_ratio"] * 120.0
    score -= metrics["prompt_echo_ratio"] * 40.0
    score += metrics["unique_token_ratio"] * 35.0
    score += metrics["section_coverage"]["matched_count"] * 6.0
    if metrics["language_check"]:
        score += 8.0
    if metrics.get("product_spec_sections"):
        score += metrics["product_spec_sections"]["matched_count"] * 4.0
    if metrics["too_short"]:
        score -= 15.0
    return round(score, 3)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_training_report(adapter_dir: Path) -> dict[str, Any]:
    report_path = adapter_dir / "training_report.json"
    if not report_path.exists():
        return {}
    data = load_json(report_path)
    return data if isinstance(data, dict) else {}


def build_metadata(
    *,
    base_model: str,
    adapter_dir: Path,
    generation_profile: dict[str, Any],
    prompt_count: int,
    evaluation_started_at: str,
    evaluation_completed_at: str,
) -> dict[str, Any]:
    adapter_weights = adapter_dir / "adapter_model.safetensors"
    adapter_config = adapter_dir / "adapter_config.json"
    training_report_path = adapter_dir / "training_report.json"
    training_report = load_training_report(adapter_dir)

    generation_export = {
        key: generation_profile[key]
        for key in (
            "profile_name",
            "max_new_tokens",
            "temperature",
            "top_p",
            "top_k",
            "repetition_penalty",
            "no_repeat_ngram_size",
            "do_sample",
        )
    }

    return {
        "base_model": base_model,
        "evaluated_adapter_path": str(adapter_dir),
        "adapter_config_path": str(adapter_config),
        "training_report_path": str(training_report_path) if training_report_path.exists() else None,
        "training_completed_at": training_report.get("completed_at"),
        "adapter_sha256": sha256_file(adapter_weights) if adapter_weights.exists() else None,
        "evaluation_started_at": evaluation_started_at,
        "evaluation_completed_at": evaluation_completed_at,
        "generation_profile": generation_export,
        "prompt_count": prompt_count,
        "training_report_summary": {
            "status": training_report.get("status"),
            "train_count": training_report.get("train_count"),
            "validation_count": training_report.get("validation_count"),
            "epochs": training_report.get("epochs"),
            "smoke_mode": training_report.get("smoke_mode"),
            "final_train_loss": training_report.get("final_train_loss"),
            "final_validation_loss": training_report.get("final_validation_loss"),
        },
    }


def build_generation_kwargs(generation_profile: dict[str, Any], tokenizer) -> dict[str, Any]:
    """Build kwargs for ``model.generate``.

    When ``do_sample=False``, explicitly set sampling params to greedy-neutral values
    so they override the pretrained model ``generation_config`` (e.g. Qwen defaults
    temperature=0.7, top_p=0.8) and Transformers does not warn that they are ignored.
    """
    kwargs: dict[str, Any] = {
        "max_new_tokens": generation_profile["max_new_tokens"],
        "do_sample": generation_profile["do_sample"],
        "pad_token_id": tokenizer.pad_token_id,
        "eos_token_id": tokenizer.eos_token_id,
        "repetition_penalty": generation_profile["repetition_penalty"],
        "no_repeat_ngram_size": generation_profile["no_repeat_ngram_size"],
    }
    if generation_profile["do_sample"]:
        kwargs["temperature"] = generation_profile["temperature"]
        kwargs["top_p"] = generation_profile["top_p"]
        kwargs["top_k"] = generation_profile["top_k"]
    else:
        # Greedy decode ignores these, but unset values inherit from model config and trigger warnings.
        kwargs["temperature"] = 1.0
        kwargs["top_p"] = 1.0
        kwargs["top_k"] = 50
    return kwargs


def generate(
    model,
    tokenizer,
    messages: list[dict[str, str]],
    device: str,
    generation_kwargs: dict[str, Any],
) -> tuple[str, float]:
    import torch

    prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )
    inputs = tokenizer(prompt, return_tensors="pt").to(device)
    start = time.perf_counter()
    with torch.no_grad():
        output_ids = model.generate(**inputs, **generation_kwargs)
    elapsed = time.perf_counter() - start
    generated = tokenizer.decode(
        output_ids[0][inputs["input_ids"].shape[1] :],
        skip_special_tokens=True,
    ).strip()
    return generated, elapsed


def compare_winner(base_metrics: dict[str, Any], lora_metrics: dict[str, Any]) -> str:
    base_score = quality_score(base_metrics)
    lora_score = quality_score(lora_metrics)
    if abs(base_score - lora_score) < 1.0:
        return "tie"
    return "base" if base_score > lora_score else "lora"


def render_markdown(payload: dict[str, Any]) -> str:
    metadata = payload["metadata"]
    results = payload["results"]
    gen = metadata["generation_profile"]

    lines = [
        "# Base vs LoRA Karşılaştırma Raporu",
        "",
        "## Metadata",
        "",
        f"- **Base model:** `{metadata['base_model']}`",
        f"- **Adapter yolu:** `{metadata['evaluated_adapter_path']}`",
        f"- **Adapter SHA256:** `{metadata['adapter_sha256']}`",
        f"- **Training report:** `{metadata['training_report_path']}`",
        f"- **Training completed at:** {metadata.get('training_completed_at') or '—'}",
        f"- **Evaluation started:** {metadata['evaluation_started_at']}",
        f"- **Evaluation completed:** {metadata['evaluation_completed_at']}",
        f"- **Prompt count:** {metadata['prompt_count']}",
        "",
        "### Generation profili",
        "",
        f"- Profil: `{gen.get('profile_name')}`",
        f"- max_new_tokens: {gen['max_new_tokens']}",
        f"- do_sample: {gen['do_sample']}",
        f"- temperature: {gen['temperature']}",
        f"- top_p: {gen['top_p']}",
        f"- top_k: {gen['top_k']}",
        f"- repetition_penalty: {gen['repetition_penalty']}",
        f"- no_repeat_ngram_size: {gen['no_repeat_ngram_size']}",
        "",
        "> Base ve LoRA modelleri tamamen aynı generation parametreleriyle çalıştırıldı.",
        "",
        "## Özet tablo",
        "",
        "| ID | Kategori | Kazanan | Base tekrar | LoRA tekrar | Base echo | LoRA echo | Base bölüm | LoRA bölüm |",
        "|---|---|---|---:|---:|---:|---:|---:|---:|",
    ]

    base_wins = lora_wins = ties = 0
    for item in results:
        winner = item["comparison"]["winner"]
        if winner == "base":
            base_wins += 1
        elif winner == "lora":
            lora_wins += 1
        else:
            ties += 1
        base_m = item["base"]["metrics"]
        lora_m = item["lora"]["metrics"]
        lines.append(
            f"| {item['id']} | {item['category']} | {winner} | "
            f"{base_m['repeated_ngram_ratio']} | {lora_m['repeated_ngram_ratio']} | "
            f"{base_m['prompt_echo_ratio']} | {lora_m['prompt_echo_ratio']} | "
            f"{base_m['section_coverage']['matched_count']} | {lora_m['section_coverage']['matched_count']} |"
        )

    lines.extend(
        [
            "",
            f"**Skor özeti:** Base {base_wins} — LoRA {lora_wins} — Berabere {ties}",
            "",
        ]
    )

    for item in results:
        base_m = item["base"]["metrics"]
        lora_m = item["lora"]["metrics"]
        lines.extend(
            [
                f"## {item['id']} — {item['category']}",
                "",
                f"**Kazanan:** {item['comparison']['winner']} "
                f"(base={item['comparison']['base_score']}, lora={item['comparison']['lora_score']})",
                "",
                "### Girdi",
                "",
                item["prompt"],
                "",
                "### Base model",
                "",
                item["base"]["text"] or "(boş)",
                "",
                "### LoRA model",
                "",
                item["lora"]["text"] or "(boş)",
                "",
                "### Tekrar metrikleri",
                "",
                "| Metrik | Base | LoRA |",
                "|---|---:|---:|",
                f"| repeated_ngram_ratio | {base_m['repeated_ngram_ratio']} | {lora_m['repeated_ngram_ratio']} |",
                f"| longest_repeated_sequence | {base_m['longest_repeated_sequence']} | {lora_m['longest_repeated_sequence']} |",
                f"| prompt_echo_ratio | {base_m['prompt_echo_ratio']} | {lora_m['prompt_echo_ratio']} |",
                f"| unique_token_ratio | {base_m['unique_token_ratio']} | {lora_m['unique_token_ratio']} |",
                f"| excessive_repetition | {base_m['excessive_repetition']} | {lora_m['excessive_repetition']} |",
                f"| empty_response | {base_m['empty_response']} | {lora_m['empty_response']} |",
                f"| language_check | {base_m['language_check']} | {lora_m['language_check']} |",
                f"| section_coverage | {base_m['section_coverage']['matched_count']}/{base_m['section_coverage']['expected_count']} | "
                f"{lora_m['section_coverage']['matched_count']}/{lora_m['section_coverage']['expected_count']} |",
            ]
        )
        if item["category"] == "product_spec":
            base_ps = base_m.get("product_spec_sections", {})
            lora_ps = lora_m.get("product_spec_sections", {})
            lines.extend(
                [
                    "",
                    "### Product Spec — 9 bölüm kapsamı",
                    "",
                    f"- Base: {base_ps.get('matched_count', 0)}/9 — {', '.join(base_ps.get('matched_sections', [])) or '—'}",
                    f"- LoRA: {lora_ps.get('matched_count', 0)}/9 — {', '.join(lora_ps.get('matched_sections', [])) or '—'}",
                ]
            )
        lines.append("")

    return "\n".join(lines) + "\n"


def main() -> int:
    args = parse_args()
    generation_profile = resolve_generation_profile(args)
    prompts_path = resolve_project_path(args.prompts)
    adapter_dir = resolve_project_path(args.adapter_dir)
    output_dir = resolve_project_path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not adapter_dir.exists():
        print(f"FAIL  Adapter dizini bulunamadı: {adapter_dir}", file=sys.stderr)
        return 1

    adapter_weights = adapter_dir / "adapter_model.safetensors"
    if not adapter_weights.exists():
        print(f"FAIL  adapter_model.safetensors bulunamadı: {adapter_weights}", file=sys.stderr)
        return 1

    prompts = load_json(prompts_path)
    if not isinstance(prompts, list):
        print("FAIL  prompts.json bir dizi olmalıdır", file=sys.stderr)
        return 1

    if args.limit is not None:
        prompts = prompts[: args.limit]

    evaluation_started_at = datetime.now(timezone.utc).isoformat()
    device, _ = detect_device()
    dtype_name = choose_torch_dtype(device)

    import torch
    from peft import PeftModel
    from transformers import AutoModelForCausalLM, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    generation_kwargs = build_generation_kwargs(generation_profile, tokenizer)

    base_model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        dtype=torch_dtype_from_name(dtype_name),
        trust_remote_code=True,
    ).to(device)
    base_model.eval()

    lora_model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        dtype=torch_dtype_from_name(dtype_name),
        trust_remote_code=True,
    )
    lora_model = PeftModel.from_pretrained(lora_model, str(adapter_dir)).to(device)
    lora_model.eval()

    results: list[dict[str, Any]] = []

    for item in prompts:
        user_content = build_user_content(item)
        category = str(item.get("category"))
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]

        base_text, base_elapsed = generate(
            base_model, tokenizer, messages, device, generation_kwargs
        )
        lora_text, lora_elapsed = generate(
            lora_model, tokenizer, messages, device, generation_kwargs
        )

        base_metrics = analyze_response(category, user_content, base_text)
        lora_metrics = analyze_response(category, user_content, lora_text)
        base_score = quality_score(base_metrics)
        lora_score = quality_score(lora_metrics)

        results.append(
            {
                "id": item.get("id"),
                "category": category,
                "prompt": user_content,
                "base": {
                    "text": base_text,
                    "char_count": len(base_text),
                    "estimated_tokens": estimate_tokens(base_text),
                    "elapsed_sec": round(base_elapsed, 3),
                    "metrics": base_metrics,
                    "quality_score": base_score,
                },
                "lora": {
                    "text": lora_text,
                    "char_count": len(lora_text),
                    "estimated_tokens": estimate_tokens(lora_text),
                    "elapsed_sec": round(lora_elapsed, 3),
                    "metrics": lora_metrics,
                    "quality_score": lora_score,
                },
                "comparison": {
                    "winner": compare_winner(base_metrics, lora_metrics),
                    "base_score": base_score,
                    "lora_score": lora_score,
                },
            }
        )

    evaluation_completed_at = datetime.now(timezone.utc).isoformat()
    metadata = build_metadata(
        base_model=args.base_model,
        adapter_dir=adapter_dir,
        generation_profile=generation_profile,
        prompt_count=len(results),
        evaluation_started_at=evaluation_started_at,
        evaluation_completed_at=evaluation_completed_at,
    )
    payload = {"metadata": metadata, "results": results}

    comparison_json = output_dir / "comparison.json"
    comparison_md = output_dir / "comparison.md"
    save_json(comparison_json, payload)
    comparison_md.write_text(render_markdown(payload), encoding="utf-8")

    print(f"Değerlendirme tamamlandı: {output_dir.relative_to(PROJECT_ROOT)}")
    print(f"  Adapter : {adapter_dir.relative_to(PROJECT_ROOT)}")
    print(f"  SHA256  : {metadata['adapter_sha256']}")
    print(f"  Profil  : {generation_profile['profile_name']}")
    print(f"  JSON    : {comparison_json.name}")
    print(f"  MD      : {comparison_md.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
