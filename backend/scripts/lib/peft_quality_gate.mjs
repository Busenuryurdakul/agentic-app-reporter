/** Product Spec content quality gate (complements backend quality_score). */

export const STRUCTURED_MARKDOWN_PREFIX = "# Product Spec:";

const STRUCTURED_HEADINGS_TR = [
  "## 1. Proje Özeti",
  "## 2. Problem, Hedefler ve Başarı Ölçütleri",
  "## 3. Kullanıcılar ve Roller",
  "## 4. Fonksiyonel Gereksinimler",
  "## 5. Fonksiyonel Olmayan Gereksinimler",
  "## 6. Teknik Mimari",
  "## 7. Veri Modeli",
  "## 8. Güvenlik ve Gizlilik",
  "## 9. Yol Haritası ve Kabul Kriterleri",
];

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uac00-\ud7af\u3040-\u30ff\u0400-\u04ff]/g;
const PLACEHOLDER_RE = /(?:^|\s)-önlem-|TODO\b|TBD\b|placeholder|\[\s*\]|\(\s*\)/i;
const RAW_KEY_RE = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g;
const ALLOWED_TECH = new Set([
  "ci_cd",
  "oauth2",
  "openid",
  "next_js",
  "github_actions",
  "gitlab_ci",
]);

const TECH_TERMS = new Set([
  "rest",
  "api",
  "jwt",
  "ci",
  "cd",
  "postgresql",
  "postgres",
  "docker",
  "grafana",
  "github",
  "json",
  "kvkk",
  "iso",
  "27001",
  "rbac",
  "oauth2",
  "oidc",
  "tls",
  "ssl",
  "http",
  "https",
  "saas",
  "kubernetes",
  "next",
  "nestjs",
  "go",
  "react",
  "ollama",
  "llm",
  "mcp",
  "sql",
  "redis",
  "aws",
  "azure",
  "devops",
  "finops",
  "sso",
  "pii",
  "gdpr",
  "iso27001",
]);

const SCHEMA_ECHO_VALUES = new Set([
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
]);

function lineValue(line) {
  const stripped = String(line || "")
    .trim()
    .replace(/^[-*•]\s*/, "");
  const colon = stripped.indexOf(":");
  if (colon >= 0) {
    return stripped.slice(colon + 1).trim().toLowerCase();
  }
  return stripped.toLowerCase();
}

export function countSchemaEcho(text) {
  let count = 0;
  for (const line of String(text || "").split(/\r?\n/)) {
    const normalized = lineValue(line);
    if (normalized && SCHEMA_ECHO_VALUES.has(normalized)) {
      count += 1;
    }
  }
  return count;
}

export function countForeignScript(text) {
  const m = String(text || "").match(CJK_RE);
  return m ? m.length : 0;
}

export function countPlaceholders(text) {
  let count = 0;
  const body = String(text || "");
  if (PLACEHOLDER_RE.test(body)) count += 1;
  if (/\b-önlem-\b/i.test(body)) count += 1;
  if (/\bnew_user_[a-z0-9_]+\b/i.test(body)) count += 1;
  if (/\.\.\.\s*$/.test(body.trim())) count += 1;
  count += countSchemaEcho(body);
  return count;
}

export function countRawKeys(text) {
  const body = String(text || "").toLowerCase();
  const matches = body.match(RAW_KEY_RE) || [];
  return matches.filter((tok) => !ALLOWED_TECH.has(tok) && !TECH_TERMS.has(tok)).length;
}

export function isTruncatedOutput(text) {
  const body = String(text || "").trim();
  if (!body) return true;
  if (/\.\.\.\s*$/.test(body)) return true;

  const hasSection9 =
    /(?:^|\n)#{2,4}\s*9[\.\)]/m.test(body) ||
    /Yol\s+Haritası/i.test(body) ||
    /Açık\s+[Ss]orular/i.test(body) ||
    /Open\s+[Qq]uestions/i.test(body);
  if (!hasSection9) return true;

  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  const lastLine = lines[lines.length - 1] || "";
  if (/^#{1,4}\s*\d/.test(lastLine)) return true;
  if (/[,\-–—:]\s*$/.test(lastLine)) return true;
  if (/\*\*\s*$/.test(lastLine)) return true;
  return false;
}

export function detectGarbledText(text) {
  const body = String(text || "");
  const garbledPatterns = [
    /\bSistemiçer/i,
    /\bveriștirişer/i,
    /\bÖffikAçıklar/i,
    /\bkleinen\b/i,
    /\bproduktör/i,
    /\bgestion etmesini\b/i,
  ];
  return garbledPatterns.some((re) => re.test(body));
}

export function hasEmptyCriticalSections(text, lang = "tr") {
  const body = String(text || "");
  if (isStructuredMarkdown(body) && countStructuredHeadings(body) >= 9) {
    return false;
  }
  const headings =
    lang === "en"
      ? [
          "Summary",
          "Problem",
          "Requirements",
          "Architecture",
          "Security",
          "Open questions",
        ]
      : ["Özet", "Problem", "gereksinim", "Mimari", "Güvenlik", "Açık sorular"];
  let empty = 0;
  for (const h of headings) {
    const re = new RegExp(`##\\s*[^\\n]*${h}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "i");
    const m = body.match(re);
    if (!m) continue;
    const content = m[1].replace(/[-*]\s*/g, "").trim();
    if (content.length < 40) empty += 1;
  }
  return empty >= 3;
}

export function isStructuredMarkdown(body) {
  return String(body || "").startsWith(STRUCTURED_MARKDOWN_PREFIX);
}

export function countStructuredHeadings(body) {
  const text = String(body || "");
  return STRUCTURED_HEADINGS_TR.filter((h) => text.includes(h)).length;
}

export function runQualityGate(body, { minLength = 1200, lang = "tr", structuredMeta = null } = {}) {
  const errors = [];
  const warnings = [];
  const foreign_script_count = countForeignScript(body);
  const placeholder_count = countPlaceholders(body);
  const raw_key_count = countRawKeys(body);
  const truncated_output = isTruncatedOutput(body);
  const garbled_text_detected = detectGarbledText(body);
  const structured = structuredMeta || {};
  const structured_output_valid =
    structured.structured_output_valid ?? (isStructuredMarkdown(body) && countStructuredHeadings(body) >= 9);
  const markdown_render_succeeded =
    structured.markdown_render_succeeded ?? (isStructuredMarkdown(body) && countStructuredHeadings(body) >= 9);

  if (foreign_script_count > 0) errors.push("foreign_script_detected");
  if (placeholder_count > 0) errors.push("placeholder_detected");
  if (raw_key_count >= 5) errors.push("excessive_raw_keys");
  if (truncated_output) errors.push("truncated_output");
  if (garbled_text_detected) errors.push("garbled_text");
  if (String(body || "").trim().length < minLength) errors.push("too_short");
  if (hasEmptyCriticalSections(body, lang)) errors.push("empty_critical_sections");
  if (structuredMeta && structuredMeta.structured_output_valid === false) {
    errors.push("structured_output_invalid");
  }
  if (isStructuredMarkdown(body) && countStructuredHeadings(body) < 9) {
    errors.push("structured_heading_incomplete");
  }

  if (!/(\d+%|\d+\s*(sn|ms|dk|gün|saat)|SLA|KPI|eşik|hedef)/i.test(body)) {
    warnings.push("weak_measurable_criteria");
  }
  if (/\blocal\b/i.test(body) && !/\b(staging|prod|production|üretim)\b/i.test(body)) {
    warnings.push("single_local_environment");
  }

  const language_integrity_passed = foreign_script_count === 0 && !garbled_text_detected;
  const quality_gate_passed = errors.length === 0;

  return {
    language_integrity_passed,
    placeholder_count,
    foreign_script_count,
    raw_key_count,
    truncated_output,
    garbled_text_detected,
    structured_output_valid,
    structured_repair_attempts: structured.structured_repair_attempts ?? 0,
    required_field_coverage: structured.required_field_coverage ?? (structured_output_valid ? 1 : 0),
    empty_required_array_count: structured.empty_required_array_count ?? 0,
    empty_required_string_count: structured.empty_required_string_count ?? 0,
    markdown_render_succeeded,
    quality_gate_passed,
    quality_gate_reasons: errors,
    warnings,
  };
}

export function shouldApproveDocument(doc, gateResult, { minQualityScore = 80 } = {}) {
  const q = doc?.quality || {};
  if (doc?.status !== "succeeded") return false;
  if ((q.quality_score ?? 0) < minQualityScore) return false;
  if (!gateResult?.quality_gate_passed) return false;
  const sg = doc?.structured_generation;
  if (sg && sg.structured_output_valid === false) return false;
  if (gateResult.structured_output_valid === false) return false;
  return true;
}
