"""Python port of backend/scripts/lib/peft_quality_gate.mjs for Docker eval."""

from __future__ import annotations

import re
from typing import Any

STRUCTURED_MARKDOWN_PREFIX = "# Product Spec:"
STRUCTURED_HEADINGS_TR = [
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
CJK_RE = re.compile(r"[\u4e00-\u9fff\u3400-\u4dbf\uac00-\ud7af\u3040-\u30ff\u0400-\u04ff]")
PLACEHOLDER_RE = re.compile(r"(?:^|\s)-önlem-|TODO\b|TBD\b|placeholder|\[\s*\]|\(\s*\)", re.I)
RAW_KEY_RE = re.compile(r"\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b")
ALLOWED_TECH = {"ci_cd", "oauth2", "openid", "next_js", "github_actions", "gitlab_ci"}
TECH_TERMS = {
    "rest", "api", "jwt", "postgresql", "postgres", "docker", "json", "kvkk", "rbac", "oauth2",
    "saas", "react", "go", "sql", "pii", "gdpr", "llm", "mcp",
}


def count_structured_headings(body: str) -> int:
    return sum(1 for h in STRUCTURED_HEADINGS_TR if h in body)


def is_structured_markdown(body: str) -> bool:
    return body.startswith(STRUCTURED_MARKDOWN_PREFIX)


def count_foreign_script(text: str) -> int:
    return len(CJK_RE.findall(text or ""))


SCHEMA_ECHO_VALUES = {
    "ornek urun",
    "kisa proje aciklamasi",
    "cozulecek ana problem",
    "saglanan deger",
    "is hedefi",
    "olculen basari metrigi",
    "rol adi",
    "ozellik basligi",
    "gereksinim aciklamasi",
    "kabul kriteri",
    "performans hedefi",
    "bilesen",
    "deployment modeli",
    "varlik",
    "amac",
    "kimlik dogrulama",
    "yetkilendirme",
    "veri koruma",
    "kapsam maddesi",
    "cikis kriteri",
}


def _line_value(line: str) -> str:
    stripped = line.strip().lstrip("-*•").strip()
    if ":" in stripped:
        _, _, rest = stripped.partition(":")
        return rest.strip().lower()
    return stripped.lower()


def count_schema_echo(text: str) -> int:
    count = 0
    for line in (text or "").splitlines():
        normalized = _line_value(line)
        if not normalized:
            continue
        if normalized in SCHEMA_ECHO_VALUES:
            count += 1
    return count


def count_placeholders(text: str) -> int:
    body = text or ""
    count = 0
    if PLACEHOLDER_RE.search(body):
        count += 1
    if re.search(r"\b-önlem-\b", body, re.I):
        count += 1
    if body.strip().endswith("..."):
        count += 1
    count += count_schema_echo(body)
    return count


def count_raw_keys(text: str) -> int:
    matches = RAW_KEY_RE.findall((text or "").lower())
    return sum(1 for tok in matches if tok not in ALLOWED_TECH and tok not in TECH_TERMS)


def is_truncated_output(text: str) -> bool:
    body = (text or "").strip()
    if not body:
        return True
    if body.endswith("..."):
        return True
    has_section9 = bool(re.search(r"(?:^|\n)#{2,4}\s*9[\.\)]", body, re.M)) or "Yol Haritası" in body
    if not has_section9:
        return True
    lines = [ln.strip() for ln in body.splitlines() if ln.strip()]
    if not lines:
        return True
    last = lines[-1]
    if re.match(r"^#{1,4}\s*\d", last):
        return True
    if re.search(r"[,\-–—:]\s*$", last):
        return True
    return bool(re.search(r"\*\*\s*$", last))


def run_quality_gate(body: str, structured_meta: dict[str, Any] | None = None, min_length: int = 1200) -> dict[str, Any]:
    structured = structured_meta or {}
    foreign_script_count = count_foreign_script(body)
    placeholder_count = count_placeholders(body)
    raw_key_count = count_raw_keys(body)
    truncated_output = is_truncated_output(body)
    structured_output_valid = structured.get(
        "structured_output_valid",
        is_structured_markdown(body) and count_structured_headings(body) >= 9,
    )
    markdown_render_succeeded = structured.get(
        "markdown_render_succeeded",
        is_structured_markdown(body) and count_structured_headings(body) >= 9,
    )
    errors: list[str] = []
    if foreign_script_count > 0:
        errors.append("foreign_script_detected")
    if placeholder_count > 0:
        errors.append("placeholder_detected")
    if raw_key_count >= 5:
        errors.append("excessive_raw_keys")
    if truncated_output:
        errors.append("truncated_output")
    if len((body or "").strip()) < min_length:
        errors.append("too_short")
    if structured_meta and structured_meta.get("structured_output_valid") is False:
        errors.append("structured_output_invalid")
    if is_structured_markdown(body) and count_structured_headings(body) < 9:
        errors.append("structured_heading_incomplete")
    return {
        "language_integrity_passed": foreign_script_count == 0,
        "placeholder_count": placeholder_count,
        "foreign_script_count": foreign_script_count,
        "raw_key_count": raw_key_count,
        "truncated_output": truncated_output,
        "structured_output_valid": structured_output_valid,
        "structured_repair_attempts": structured.get("structured_repair_attempts", 0),
        "required_field_coverage": structured.get("required_field_coverage", 1 if structured_output_valid else 0),
        "empty_required_array_count": structured.get("empty_required_array_count", 0),
        "empty_required_string_count": structured.get("empty_required_string_count", 0),
        "markdown_render_succeeded": markdown_render_succeeded,
        "quality_gate_passed": len(errors) == 0,
        "quality_gate_reasons": errors,
    }
