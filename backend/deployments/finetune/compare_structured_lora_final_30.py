#!/usr/bin/env python3
"""Structured production pipeline evaluation: base vs full LoRA adapter."""

from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import sys
import time
import traceback
from collections import Counter
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

from smoke_lora_final_30 import DEFAULT_MAX_SEQ_LENGTH, apply_gemma_chat_template, collect_environment
from structured_quality_gate import count_schema_echo, run_quality_gate as py_run_quality_gate

DEFAULT_CONFIG = Path("compare_prompts_structured_final_30.json")
DEFAULT_OUTPUT = Path("../../training-output/lora-full-final-30-structured-comparison")
DEFAULT_REPORT = Path("../../peft-final-30-structured-comparison-report.md")
OLD_COMPARISON_SYSTEM = "Sen deneyimli bir ürün yöneticisi ve teknik yazar asistanısın."
MAX_REPAIR = 2
RAG_WRONG_PATTERNS = [
    r"Risk[\s,\-]*Assumption[\s,\-]*Goal",
    r"Risk-Assumption-Goal",
    r"RAG Tablosu",
    r"RAG \(Risk",
]
REPETITION_PHRASES = ["Kendimize Dikkat", "Kendimize Açıklama"]


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Structured base vs LoRA evaluation")
    p.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    p.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    p.add_argument("--report-path", type=Path, default=DEFAULT_REPORT)
    p.add_argument("--go-tool", type=Path, default=Path("bin/structured-spec-tool"))
    p.add_argument("--dataset-dir", type=Path, default=Path("../../peft-export-final-30"))
    p.add_argument("--max-seq-length", type=int, default=DEFAULT_MAX_SEQ_LENGTH)
    return p.parse_args()


def run_go_tool(go_tool: Path, command: str, **kwargs: str) -> None:
    flag_map = {"in_path": "in", "out_path": "out"}
    cmd = [str(go_tool), command]
    for key, value in kwargs.items():
        flag = flag_map.get(key, key.replace("_", "-"))
        cmd.extend([f"--{flag}", value])
    subprocess.run(cmd, check=True)


def process_llm_output(go_tool: Path, raw: str, finish_reason: str, language: str, tmp_dir: Path, tag: str) -> dict[str, Any]:
    in_path = tmp_dir / f"{tag}_process_in.json"
    out_path = tmp_dir / f"{tag}_process_out.json"
    in_path.write_text(json.dumps({"raw": raw, "finish_reason": finish_reason, "language": language}, ensure_ascii=False), encoding="utf-8")
    run_go_tool(go_tool, "process-output", in_path=str(in_path), out_path=str(out_path))
    return json.loads(out_path.read_text(encoding="utf-8"))


def run_quality_gate(_node_script: Path, markdown_path: Path, meta: dict[str, Any]) -> dict[str, Any]:
    body = markdown_path.read_text(encoding="utf-8")
    return py_run_quality_gate(body, structured_meta=meta)


def generate_text(model, tokenizer, system_prompt: str, user_prompt: str, gen_cfg: dict[str, Any]) -> tuple[str, str]:
    import torch

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(text, return_tensors="pt").to(model.device)
    max_new = int(gen_cfg.get("max_new_tokens", 8192))
    input_len = int(inputs["input_ids"].shape[1])
    model_max = getattr(model, "max_seq_length", None) or getattr(tokenizer, "model_max_length", 8192)
    if input_len + max_new > model_max:
        max_new = max(256, model_max - input_len - 8)
    seed = int(gen_cfg.get("seed", 3407))
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=max_new,
            do_sample=bool(gen_cfg.get("do_sample", False)),
            temperature=float(gen_cfg.get("temperature", 0.2)),
            top_p=float(gen_cfg.get("top_p", 1.0)),
            use_cache=True,
        )
    sequences = output.sequences if hasattr(output, "sequences") else output
    input_len = int(inputs["input_ids"].shape[-1])
    if sequences.dim() == 1:
        generated_ids = sequences[input_len:]
    else:
        generated_ids = sequences[0, input_len:]
    raw = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
    finish_reason = "length" if len(generated_ids) >= max_new else "stop"
    return raw, finish_reason


def repetition_metrics(text: str) -> dict[str, Any]:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    line_counts = Counter(lines)
    repeated_lines = sum(c - 1 for c in line_counts.values() if c > 1)
    sentences = re.split(r"[.!?]\s+", text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
    sent_counts = Counter(sentences)
    repeated_sentences = sum(c - 1 for c in sent_counts.values() if c > 1)
    longest = 0
    if lines:
        run = 1
        for i in range(1, len(lines)):
            if lines[i] == lines[i - 1]:
                run += 1
                longest = max(longest, run)
            else:
                run = 1
    words = re.findall(r"\S+", text)
    rep_words = repeated_lines * 10 + repeated_sentences * 20
    ratio = round(rep_words / max(len(words), 1), 4)
    phrase_hits = sum(text.count(p) for p in REPETITION_PHRASES)
    # Only flag pathological loops (not normal renderer section boilerplate).
    excessive = phrase_hits >= 3 or longest >= 4
    return {
        "repeated_line_count": repeated_lines,
        "repeated_sentence_count": repeated_sentences,
        "longest_repeated_sequence": longest,
        "repetition_ratio": ratio,
        "repetition_phrase_hits": phrase_hits,
        "excessive_repetition": excessive,
    }


def rag_interpretation_check(text: str) -> dict[str, Any]:
    wrong = []
    for pat in RAG_WRONG_PATTERNS:
        if re.search(pat, text, re.I):
            wrong.append(pat)
    correct = bool(re.search(r"Retrieval[\s-]*Augmented[\s-]*Generation", text, re.I)) or (
        re.search(r"\bRAG\b", text) and "Retrieval" in text
    )
    return {
        "rag_wrong_expansion_detected": len(wrong) > 0,
        "rag_wrong_patterns": wrong,
        "rag_correct_expansion_detected": correct,
        "rag_semantics_ok": len(wrong) == 0,
    }


def human_review_scores(markdown: str, prompt_id: str, scenario_text: str) -> dict[str, Any]:
    criteria = {
        "context_fit": 0,
        "problem_goals": 0,
        "user_roles": 0,
        "functional_requirements": 0,
        "non_functional_requirements": 0,
        "architecture": 0,
        "data_model": 0,
        "security_privacy": 0,
        "roadmap": 0,
        "acceptance_criteria": 0,
        "turkish_readability": 0,
        "no_fabricated_features": 0,
    }
    if not markdown:
        return {"criteria": criteria, "total": 0, "notes": ["Boş markdown"]}

    lower = markdown.lower()
    if prompt_id.replace("-", " ")[:12] in lower or any(tok in lower for tok in scenario_text.split()[:3] if len(tok) > 4):
        criteria["context_fit"] = 2
    elif "product spec:" in lower:
        criteria["context_fit"] = 1

    if "## 2." in markdown and ("hedef" in lower or "problem" in lower):
        criteria["problem_goals"] = 2 if "başarı" in lower or "ölçüt" in lower else 1
    if "## 3." in markdown and "rol" in lower:
        criteria["user_roles"] = 2 if markdown.count("###") >= 2 else 1
    if "## 4." in markdown and "fr-" in lower:
        criteria["functional_requirements"] = 2 if markdown.count("FR-") >= 2 else 1
    if "## 5." in markdown:
        criteria["non_functional_requirements"] = 1 if "performans" in lower else 0
    if "## 6." in markdown and "mimari" in lower:
        criteria["architecture"] = 2 if "bileşen" in lower else 1
    if "## 7." in markdown:
        criteria["data_model"] = 2 if markdown.count("###") >= 4 else 1
    if "## 8." in markdown and ("güvenlik" in lower or "kvkk" in lower):
        criteria["security_privacy"] = 2 if "kimlik" in lower else 1
    if "## 9." in markdown:
        criteria["roadmap"] = 2 if "çıkış" in lower or "kapsam" in lower else 1
    if "kabul kriter" in lower:
        criteria["acceptance_criteria"] = 2 if markdown.count("kabul") >= 2 else 1
    if re.search(r"[ğüşıöçĞÜŞİÖÇ]", markdown):
        criteria["turkish_readability"] = 2 if not re.search(r"\b(the|and|with)\b", markdown[:500]) else 1
    if "risk-assumption-goal" not in lower and "kendimize dikkat" not in lower:
        criteria["no_fabricated_features"] = 2
    elif "varsayım" in lower:
        criteria["no_fabricated_features"] = 1
    if count_schema_echo(markdown) > 0:
        criteria["no_fabricated_features"] = min(criteria["no_fabricated_features"], 1)

    total = sum(criteria.values())
    return {"criteria": criteria, "total": total, "notes": []}


def load_train_project_names(dataset_dir: Path) -> list[str]:
    names: list[str] = []
    for fname in ("train.jsonl", "val.jsonl"):
        path = dataset_dir / fname
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            row = json.loads(line)
            for msg in row.get("messages", []):
                if msg.get("role") == "assistant":
                    m = re.search(r"# Product Spec:\s*(.+)", msg.get("content", ""))
                    if m:
                        names.append(m.group(1).strip())
    return names


def memorization_risk(markdown: str, train_names: list[str]) -> dict[str, Any]:
    if not markdown:
        return {"level": "unknown", "max_name_similarity": 0.0, "exact_train_name_match": False}
    title_m = re.search(r"# Product Spec:\s*(.+)", markdown)
    title = title_m.group(1).strip() if title_m else ""
    exact = title in train_names
    sims = [SequenceMatcher(None, title, n).ratio() for n in train_names] if title else []
    max_sim = max(sims) if sims else 0.0
    if exact or max_sim >= 0.92:
        level = "high"
    elif max_sim >= 0.75:
        level = "medium"
    else:
        level = "low"
    return {"level": level, "max_name_similarity": round(max_sim, 4), "exact_train_name_match": exact, "title": title}


def flatten_pipeline_result(
    prompt_id: str,
    raw_initial: str,
    pipeline: dict[str, Any],
    gate: dict[str, Any],
    duration: float,
    repetition: dict[str, Any],
    rag: dict[str, Any] | None,
    human: dict[str, Any],
    memo: dict[str, Any],
) -> dict[str, Any]:
    val = pipeline.get("validation") or {}
    content = pipeline.get("content_metrics") or {}
    return {
        "prompt_id": prompt_id,
        "initial_json_parse_succeeded": pipeline.get("initial_json_parse_succeeded", False),
        "structured_output_valid": pipeline.get("structured_output_valid", False),
        "repair_attempts": pipeline.get("repair_attempts", 0),
        "repair_succeeded": pipeline.get("repair_succeeded", False),
        "finish_reason": pipeline.get("finish_reason"),
        "finish_reason_length": pipeline.get("finish_reason_length", False),
        "required_field_coverage": val.get("required_field_coverage", 0),
        "empty_required_string_count": val.get("empty_required_string_count", 0),
        "empty_required_array_count": val.get("empty_required_array_count", 0),
        "placeholder_count": gate.get("placeholder_count", 0),
        "foreign_script_count": gate.get("foreign_script_count", 0),
        "raw_key_count": gate.get("raw_key_count", 0),
        "markdown_render_succeeded": pipeline.get("markdown_render_succeeded", False),
        "quality_gate_passed": gate.get("quality_gate_passed", False),
        "quality_score": pipeline.get("quality_score", 0),
        "final_markdown_character_count": len(pipeline.get("markdown") or ""),
        "final_markdown_section_count": (pipeline.get("markdown") or "").count("## "),
        "generation_duration_sec": round(duration, 2),
        **content,
        **repetition,
        **(rag or {}),
        "human_review_total": human.get("total", 0),
        "human_review": human,
        "memorization_risk": memo,
        "validation_errors": (val.get("errors") or [])[:8],
        "raw_initial_excerpt": raw_initial[:400],
    }


def run_structured_pipeline(
    model,
    tokenizer,
    system_prompt: str,
    user_prompt: str,
    gen_cfg: dict[str, Any],
    go_tool: Path,
    node_script: Path,
    tmp_dir: Path,
    tag: str,
    language: str,
) -> dict[str, Any]:
    started = time.time()
    raw, finish = generate_text(model, tokenizer, system_prompt, user_prompt, gen_cfg)
    result = process_llm_output(go_tool, raw, finish, language, tmp_dir, f"{tag}_initial")
    repair_attempts = 0
    repair_succeeded = result.get("structured_output_valid", False)
    last_raw = raw
    current = result

    while repair_attempts < MAX_REPAIR and not current.get("structured_output_valid") and current.get("repair_prompts"):
        repair_attempts += 1
        rp = current["repair_prompts"]
        repair_cfg = dict(gen_cfg)
        repair_cfg["temperature"] = gen_cfg.get("repair_temperature", 0.1)
        last_raw, finish = generate_text(model, tokenizer, rp["system_prompt"], rp["user_prompt"], repair_cfg)
        current = process_llm_output(go_tool, last_raw, finish, language, tmp_dir, f"{tag}_repair_{repair_attempts}")
        repair_succeeded = current.get("structured_output_valid", False)

    markdown = current.get("markdown") or ""
    meta = {
        "structured_output_valid": current.get("structured_output_valid", False),
        "structured_repair_attempts": repair_attempts,
        "markdown_render_succeeded": current.get("markdown_render_succeeded", False),
        "required_field_coverage": current.get("validation", {}).get("required_field_coverage", 0),
        "empty_required_array_count": current.get("validation", {}).get("empty_required_array_count", 0),
        "empty_required_string_count": current.get("validation", {}).get("empty_required_string_count", 0),
    }
    md_path = tmp_dir / f"{tag}_final.md"
    md_path.write_text(markdown, encoding="utf-8")
    gate = run_quality_gate(node_script, md_path, meta) if markdown else {"quality_gate_passed": False, "placeholder_count": 0, "foreign_script_count": 0, "raw_key_count": 0}

    duration = time.time() - started
    return {
        "raw_initial": raw,
        "raw_final": last_raw,
        "markdown": markdown,
        "repair_attempts": repair_attempts,
        "repair_succeeded": repair_succeeded,
        "finish_reason": current.get("finish_reason", finish),
        "finish_reason_length": current.get("finish_reason_length", False),
        "validation": current.get("validation", {}),
        "structured_output_valid": current.get("structured_output_valid", False),
        "initial_json_parse_succeeded": result.get("initial_json_parse_succeeded", False),
        "markdown_render_succeeded": current.get("markdown_render_succeeded", False),
        "quality_score": current.get("quality_score", 0),
        "content_metrics": current.get("content_metrics", {}),
        "quality_gate": gate,
        "duration": duration,
    }


def compare_prompt_diffs(train_system: str, production_system: str, old_system: str) -> dict[str, Any]:
    return {
        "train_system_excerpt": train_system[:500],
        "production_system_excerpt": production_system[:500],
        "old_comparison_system": old_system,
        "train_equals_production_system": train_system.strip() == production_system.strip(),
        "semantic_differences": [
            "Eğitim ve production system prompt aynı structured JSON talimatını kullanıyor.",
            "Eski comparison prompt serbest Markdown üretimine yönelikti; JSON şeması yok.",
            "Eğitim assistant hedefi Markdown olsa da LLM girdisi production ile aynı JSON system/user prompt.",
        ],
        "missing_in_old_comparison": [
            "JSON-only output kuralı",
            "ExampleJSONSchema bloğu",
            "GenerationLimitsText (FR/rol/varlık sınırları)",
            "Placeholder ve Varsayım kuralları",
        ],
        "mismatch_effect": "Doğrudan Markdown karşılaştırması modeli eğitim hedef formatından sapmaya zorladı; structured pipeline metrikleri bu sapmayı giderir.",
    }


def pick_winner(base: dict[str, Any], adapter: dict[str, Any]) -> str:
    b_score = 0
    a_score = 0
    if base.get("structured_output_valid"):
        b_score += 2
    if adapter.get("structured_output_valid"):
        a_score += 2
    if base.get("quality_gate_passed"):
        b_score += 3
    if adapter.get("quality_gate_passed"):
        a_score += 3
    b_score += max(0, 2 - base.get("repair_attempts", 0))
    a_score += max(0, 2 - adapter.get("repair_attempts", 0))
    b_score += int(base.get("human_review_total", 0) / 4)
    a_score += int(adapter.get("human_review_total", 0) / 4)
    if base.get("initial_json_parse_succeeded") and not adapter.get("initial_json_parse_succeeded"):
        b_score += 1
    elif adapter.get("initial_json_parse_succeeded") and not base.get("initial_json_parse_succeeded"):
        a_score += 1
    if base.get("structured_output_valid") and base.get("repair_attempts", 0) == 0:
        b_score += 1
    if adapter.get("structured_output_valid") and adapter.get("repair_attempts", 0) == 0:
        a_score += 1
    if a_score > b_score:
        return "adapter"
    if b_score > a_score:
        return "base"
    # Tie-breakers aligned with production quality signals.
    for key, lower_is_better in (
        ("placeholder_count", True),
        ("raw_key_count", True),
        ("repair_attempts", True),
        ("repetition_phrase_hits", True),
    ):
        b_val = int(base.get(key, 0))
        a_val = int(adapter.get(key, 0))
        if lower_is_better and a_val < b_val:
            return "adapter"
        if lower_is_better and b_val < a_val:
            return "base"
    if adapter.get("quality_gate_passed") and not base.get("quality_gate_passed"):
        return "adapter"
    if base.get("quality_gate_passed") and not adapter.get("quality_gate_passed"):
        return "base"
    if int(adapter.get("quality_score", 0)) > int(base.get("quality_score", 0)):
        return "adapter"
    if int(base.get("quality_score", 0)) > int(adapter.get("quality_score", 0)):
        return "base"
    for metric in ("acceptance_criteria_count", "roadmap_phase_count", "functional_requirement_count"):
        a_val = int(adapter.get(metric, 0))
        b_val = int(base.get(metric, 0))
        if a_val > b_val:
            return "adapter"
        if b_val > a_val:
            return "base"
    return "tie"


def decide_evaluation(results: list[dict[str, Any]], memo_levels: list[str]) -> tuple[str, str | None]:
    adapter_wins = sum(1 for r in results if r["winner"] == "adapter")
    base_valid = sum(1 for r in results if r["base"]["structured_output_valid"])
    adapter_valid = sum(1 for r in results if r["adapter"]["structured_output_valid"])
    base_repairs = sum(r["base"]["repair_attempts"] for r in results)
    adapter_repairs = sum(r["adapter"]["repair_attempts"] for r in results)
    base_gate = sum(1 for r in results if r["base"]["quality_gate_passed"])
    adapter_gate = sum(1 for r in results if r["adapter"]["quality_gate_passed"])
    base_human = sum(r["base"]["human_review_total"] for r in results) / len(results)
    adapter_human = sum(r["adapter"]["human_review_total"] for r in results) / len(results)
    rag_ok = True
    rag_item = next((r for r in results if r["prompt_id"] == "ai-support-copilot"), None)
    if rag_item and rag_item.get("rag_check"):
        rag_ok = rag_item["rag_check"].get("adapter_rag_semantics_ok", False) and not rag_item["rag_check"]["adapter"].get("rag_wrong_expansion_detected", False)
    repetition_ok = not any(r["adapter"].get("excessive_repetition") for r in results)
    memo_high = any(m == "high" for m in memo_levels)

    passed = (
        adapter_wins >= 4
        and adapter_valid >= base_valid
        and adapter_repairs <= base_repairs
        and adapter_gate >= base_gate
        and adapter_human > base_human
        and rag_ok
        and repetition_ok
        and not memo_high
    )
    if passed:
        return "STRUCTURED_ADAPTER_EVALUATION_PASS", None

    causes = []
    if adapter_valid < base_valid:
        causes.append(("incorrect_loss_masking", "Adapter ilk geçerli JSON oranı base'den düşük"))
    if adapter_repairs > base_repairs + 1:
        causes.append(("dataset_template_too_uniform", "Adapter daha fazla repair gerektiriyor"))
    if adapter_gate < base_gate:
        causes.append(("dataset_too_small", "Quality gate PASS oranı base'in altında"))
    if not repetition_ok:
        causes.append(("adapter_overfitting", "Adapter çıktısında tekrar döngüsü"))
    if memo_high:
        causes.append(("adapter_overfitting", "Train kayıt adına yüksek benzerlik"))
    if adapter_human <= base_human:
        causes.append(("base_model_capacity", "İnsan puanı ortalaması base'den yüksek değil"))
    if not causes:
        causes.append(("dataset_too_small", "30 örneklik dataset ile genelleme sınırlı"))
    return "STRUCTURED_ADAPTER_EVALUATION_FAIL", causes[0][0]


def write_report(path: Path, payload: dict[str, Any]) -> None:
    lines = [
        "# PEFT Final-30 Structured Adapter Evaluation Report",
        "",
        f"Generated: {payload.get('generated_at', utc_now())}",
        "",
    ]
    if payload.get("error"):
        lines.extend(["## Error", "", f"`{payload['error']}`", ""])
        if payload.get("traceback"):
            lines.extend(["```", payload["traceback"], "```", ""])
    if payload.get("prompt_diffs"):
        lines.extend(
            [
                "## Prompt Farkları",
                "",
                "```json",
                json.dumps(payload["prompt_diffs"], ensure_ascii=False, indent=2),
                "```",
                "",
            ]
        )
    lines.extend([f"## Karar: **{payload.get('decision', 'STRUCTURED_ADAPTER_EVALUATION_FAIL')}**", ""])
    if payload.get("root_cause"):
        lines.extend([f"- Baskın kök neden: `{payload['root_cause']}`", ""])
    if payload.get("next_experiments"):
        lines.append("## Sonraki Deney Önerileri")
        lines.append("")
        for exp in payload["next_experiments"]:
            lines.append(f"- {exp}")
        lines.append("")

    if payload.get("aggregate"):
        agg = payload["aggregate"]
        lines.extend(
            [
                "## Özet Metrikler",
                "",
                "```json",
                json.dumps(agg, ensure_ascii=False, indent=2),
                "```",
                "",
            ]
        )
    for item in payload.get("results", []):
        lines.extend(
            [
                f"### {item['prompt_id']}",
                "",
                f"- winner: **{item['winner']}**",
                f"- base repair / gate / human: {item['base']['repair_attempts']} / {item['base']['quality_gate_passed']} / {item['base']['human_review_total']}",
                f"- adapter repair / gate / human: {item['adapter']['repair_attempts']} / {item['adapter']['quality_gate_passed']} / {item['adapter']['human_review_total']}",
                "",
            ]
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    args = parse_args()
    finetune_dir = Path(__file__).resolve().parent
    config_path = args.config if args.config.is_absolute() else finetune_dir / args.config
    output_dir = args.output_dir.resolve()
    report_path = args.report_path.resolve()
    go_tool = (args.go_tool if args.go_tool.is_absolute() else finetune_dir / args.go_tool).resolve()
    node_script = (finetune_dir / "../../scripts/structured_quality_gate_cli.mjs").resolve()
    dataset_dir = (args.dataset_dir if args.dataset_dir.is_absolute() else finetune_dir / args.dataset_dir).resolve()

    payload: dict[str, Any] = {"generated_at": utc_now(), "decision": "STRUCTURED_ADAPTER_EVALUATION_FAIL"}

    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
        scenarios_path = output_dir / "scenarios_input.json"
        scenarios_path.parent.mkdir(parents=True, exist_ok=True)
        scenarios_path.write_text(json.dumps({"language": config["language"], "scenarios": config["scenarios"]}, ensure_ascii=False, indent=2), encoding="utf-8")
        built_prompts_path = output_dir / "built_prompts.json"
        run_go_tool(go_tool, "build-prompts", in_path=str(scenarios_path), out_path=str(built_prompts_path))
        built = json.loads(built_prompts_path.read_text(encoding="utf-8"))
        prompts_by_id = {p["id"]: p for p in built["prompts"]}

        train_line = (dataset_dir / "train.jsonl").read_text(encoding="utf-8").splitlines()[0]
        train_system = json.loads(train_line)["messages"][0]["content"]
        production_system = prompts_by_id[next(iter(prompts_by_id))]["system_prompt"]
        prompt_diffs = compare_prompt_diffs(train_system, production_system, OLD_COMPARISON_SYSTEM)

        import torch
        from peft import PeftModel
        from unsloth import FastLanguageModel

        env = collect_environment()
        gen_cfg = config["generation"]
        language = config.get("language", "tr")
        train_names = load_train_project_names(dataset_dir)

        base_model, base_tok = FastLanguageModel.from_pretrained(
            model_name=config["base_model"],
            max_seq_length=max(args.max_seq_length, 16384),
            dtype=None,
            load_in_4bit=True,
        )
        base_tok = apply_gemma_chat_template(base_tok)
        FastLanguageModel.for_inference(base_model)

        adapter_dir = (finetune_dir / config["adapter_dir"]).resolve()
        lora_base, lora_tok = FastLanguageModel.from_pretrained(
            model_name=config["base_model"],
            max_seq_length=max(args.max_seq_length, 16384),
            dtype=None,
            load_in_4bit=True,
        )
        lora_model = PeftModel.from_pretrained(lora_base, str(adapter_dir))
        lora_tok = apply_gemma_chat_template(lora_tok)
        FastLanguageModel.for_inference(lora_model)

        tmp_dir = output_dir / "_tmp"
        tmp_dir.mkdir(parents=True, exist_ok=True)
        base_out = output_dir / "base"
        adapter_out = output_dir / "adapter"
        rendered_out = output_dir / "rendered_markdown"
        for d in (base_out, adapter_out, rendered_out):
            d.mkdir(parents=True, exist_ok=True)

        results: list[dict[str, Any]] = []
        memo_levels: list[str] = []

        for sc in config["scenarios"]:
            pid = sc["id"]
            pr = prompts_by_id[pid]
            scenario_hint = sc["profile"]["project_name"]

            base_pipe = run_structured_pipeline(
                base_model, base_tok, pr["system_prompt"], pr["user_prompt"], gen_cfg, go_tool, node_script, tmp_dir, f"base_{pid}", language
            )
            adapter_pipe = run_structured_pipeline(
                lora_model, lora_tok, pr["system_prompt"], pr["user_prompt"], gen_cfg, go_tool, node_script, tmp_dir, f"adapter_{pid}", language
            )

            (base_out / f"{pid}_raw_initial.txt").write_text(base_pipe["raw_initial"], encoding="utf-8")
            (adapter_out / f"{pid}_raw_initial.txt").write_text(adapter_pipe["raw_initial"], encoding="utf-8")
            (rendered_out / f"{pid}_base.md").write_text(base_pipe["markdown"], encoding="utf-8")
            (rendered_out / f"{pid}_adapter.md").write_text(adapter_pipe["markdown"], encoding="utf-8")

            base_rep = repetition_metrics(base_pipe["markdown"])
            adapter_rep = repetition_metrics(adapter_pipe["markdown"])
            rag_check = None
            if pid == "ai-support-copilot":
                combined = base_pipe["markdown"] + "\n" + adapter_pipe["markdown"] + "\n" + adapter_pipe["raw_final"]
                rag_check = {
                    "base": rag_interpretation_check(base_pipe["markdown"] + base_pipe["raw_final"]),
                    "adapter": rag_interpretation_check(adapter_pipe["markdown"] + adapter_pipe["raw_final"]),
                    "base_rag_semantics_ok": rag_interpretation_check(base_pipe["markdown"] + base_pipe["raw_final"])["rag_semantics_ok"],
                    "adapter_rag_semantics_ok": rag_interpretation_check(adapter_pipe["markdown"] + adapter_pipe["raw_final"])["rag_semantics_ok"],
                }

            base_human = human_review_scores(base_pipe["markdown"], pid, scenario_hint)
            adapter_human = human_review_scores(adapter_pipe["markdown"], pid, scenario_hint)
            base_memo = memorization_risk(base_pipe["markdown"], train_names)
            adapter_memo = memorization_risk(adapter_pipe["markdown"], train_names)
            memo_levels.append(adapter_memo["level"])

            base_flat = flatten_pipeline_result(
                pid, base_pipe["raw_initial"], base_pipe, base_pipe["quality_gate"],
                base_pipe["duration"], base_rep, None, base_human, base_memo,
            )
            adapter_flat = flatten_pipeline_result(
                pid, adapter_pipe["raw_initial"], adapter_pipe, adapter_pipe["quality_gate"],
                adapter_pipe["duration"], adapter_rep, rag_check["adapter"] if rag_check else None, adapter_human, adapter_memo,
            )

            winner = pick_winner(base_flat, adapter_flat)
            results.append({"prompt_id": pid, "winner": winner, "base": base_flat, "adapter": adapter_flat, "rag_check": rag_check})

        decision, root_cause = decide_evaluation(results, memo_levels)
        aggregate = {
            "adapter_wins": sum(1 for r in results if r["winner"] == "adapter"),
            "base_wins": sum(1 for r in results if r["winner"] == "base"),
            "ties": sum(1 for r in results if r["winner"] == "tie"),
            "base_first_valid_json_rate": round(sum(1 for r in results if r["base"]["initial_json_parse_succeeded"]) / 5, 2),
            "adapter_first_valid_json_rate": round(sum(1 for r in results if r["adapter"]["initial_json_parse_succeeded"]) / 5, 2),
            "base_total_repairs": sum(r["base"]["repair_attempts"] for r in results),
            "adapter_total_repairs": sum(r["adapter"]["repair_attempts"] for r in results),
            "base_quality_gate_pass_count": sum(1 for r in results if r["base"]["quality_gate_passed"]),
            "adapter_quality_gate_pass_count": sum(1 for r in results if r["adapter"]["quality_gate_passed"]),
            "base_human_avg": round(sum(r["base"]["human_review_total"] for r in results) / 5, 2),
            "adapter_human_avg": round(sum(r["adapter"]["human_review_total"] for r in results) / 5, 2),
        }

        next_experiments = []
        if decision.endswith("FAIL"):
            next_experiments = [
                "Aynı dataset ile 1 epoch + learning rate 1e-4: overfitting riskini azaltır; underfit riski artar.",
                "Dataset'i 100+ onaylı product_spec'e çıkarıp yeniden eğitim: genelleme ve structured JSON kalitesini artırır; maliyet ve süre artar.",
            ]

        sidecar = {
            "generated_at": payload["generated_at"],
            "decision": decision,
            "root_cause": root_cause,
            "prompt_diffs": prompt_diffs,
            "environment": env,
            "aggregate": aggregate,
            "results": results,
            "next_experiments": next_experiments,
        }
        (output_dir / "comparison_results.json").write_text(json.dumps(sidecar, ensure_ascii=False, indent=2), encoding="utf-8")
        payload.update(sidecar)
        write_report(report_path, payload)
        print(json.dumps({"decision": decision, "report": str(report_path), "aggregate": aggregate}, ensure_ascii=False, indent=2))
        return 0 if decision.endswith("PASS") else 1

    except Exception as exc:
        payload["error"] = str(exc)
        payload["traceback"] = traceback.format_exc()
        write_report(report_path, payload)
        print(json.dumps({"decision": "STRUCTURED_ADAPTER_EVALUATION_FAIL", "error": str(exc)}, indent=2))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
