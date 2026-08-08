/**
 * Collect, dedupe, review, and approve PEFT product_spec candidates; write report.
 *
 * Usage:
 *   node ./scripts/review_approve_peft_final.mjs --org-id=... [--dry-run] [--report=./peft-final-review-report.json]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PeftDatasetClient } from "./lib/peft_dataset_client.mjs";
import { SCENARIOS } from "./lib/peft_dataset_scenarios.mjs";
import {
  assessDocumentQuality,
  parseScenarioKeyFromDescription,
  runQualityGate,
} from "./lib/peft_dataset_utils.mjs";
import {
  countForeignScript,
  countPlaceholders,
  isTruncatedOutput,
  detectGarbledText,
  countStructuredHeadings,
} from "./lib/peft_quality_gate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = {
    orgId: process.env.PEFT_ORG_ID || "",
    dryRun: false,
    report: path.join(backendRoot, "peft-final-review-report.json"),
    email: process.env.PEFT_DATASET_EMAIL || "",
    password: process.env.PEFT_DATASET_PASSWORD || "",
  };
  for (const arg of argv) {
    if (arg.startsWith("--org-id=")) args.orgId = arg.slice(9).trim();
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg.startsWith("--report=")) args.report = path.resolve(backendRoot, arg.slice(9));
  }
  if (!args.orgId) throw new Error("--org-id is required");
  return args;
}

function extractSection(body, num) {
  const re = new RegExp(`##\\s*${num}\\.[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s*\\d+\\.|$)`, "i");
  const m = String(body || "").match(re);
  return m ? m[1].trim() : "";
}

function countBullets(text) {
  return (String(text || "").match(/^[\s]*[-*]\s+/gm) || []).length;
}

function repetitionScore(text) {
  const lines = String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 40);
  const freq = new Map();
  for (const l of lines) freq.set(l, (freq.get(l) || 0) + 1);
  let max = 0;
  for (const n of freq.values()) max = Math.max(max, n);
  return max;
}

function scenarioTechTokens(scenario) {
  const parts = [
    scenario?.project_name,
    scenario?.category,
    scenario?.description,
    ...(scenario?.frontend || []),
    ...(scenario?.backend || []),
    ...(scenario?.database || []),
    ...(scenario?.integrations || []),
    ...(scenario?.features || []),
  ]
    .join(" ")
    .toLowerCase();
  const tokens = new Set();
  for (const t of ["next.js", "nextjs", "react", "go", "python", "django", "postgresql", "redis", "ollama", "llm", "rag", "kubernetes", "vercel"]) {
    if (parts.includes(t.replace(".", "")) || parts.includes(t)) tokens.add(t);
  }
  if (/go\b/i.test(parts)) tokens.add("go");
  if (/postgres/i.test(parts)) tokens.add("postgresql");
  return [...tokens];
}

function performFinalReview(doc, scenario, body) {
  const checks = {};
  const reasons = [];
  const warnings = [];

  checks.sections_complete = countStructuredHeadings(body) >= 9;
  checks.turkish_readable =
    countForeignScript(body) === 0 && !detectGarbledText(body) && /[ğüşıöçĞÜŞİÖÇa-zA-Z]/.test(body);
  checks.no_placeholders = countPlaceholders(body) === 0;
  checks.not_truncated = !isTruncatedOutput(body);

  const s2 = extractSection(body, 2);
  const s3 = extractSection(body, 3);
  const s4 = extractSection(body, 4);
  const s6 = extractSection(body, 6);
  const s7 = extractSection(body, 7);
  const s8 = extractSection(body, 8);
  const s9 = extractSection(body, 9);
  const hay = body.toLowerCase();

  checks.project_context =
    !scenario ||
    hay.includes(scenario.project_name.toLowerCase().slice(0, 10)) ||
    scenario.features?.some((f) => hay.includes(f.toLowerCase().slice(0, 6)));

  checks.concrete_problem = s2.length >= 60 && /problem|hedef|amaç|başarı|ihtiyaç/i.test(s2);
  checks.meaningful_roles = countBullets(s3) >= 1 || /admin|operatör|kullanıcı|rol|yetki/i.test(s3);
  checks.implementable_fr =
    (body.match(/\bFR-\d+/gi) || []).length >= 2 ||
    countBullets(s4) >= 3 ||
    s4.length >= 120;
  checks.architecture_aligned =
    s6.length >= 80 ||
    /mimari|servis|katman|api|deployment|docker|kubernetes|veritaban/i.test(s6) ||
    !scenario ||
    scenarioTechTokens(scenario).some((t) => hay.includes(t.replace(".", "")));
  checks.data_model =
    s7.length >= 40 || /varlık|entity|tablo|model|veri|alan|şema|schema/i.test(s7 + hay);
  checks.security_specific =
    s8.length >= 40 &&
    (/kvkk|gdpr|yetki|auth|şifre|encryption|audit|güvenlik/i.test(s8) ||
      (scenario?.security_requirements || []).some((s) => hay.includes(s.toLowerCase().slice(0, 5))));
  checks.measurable_metrics =
    /(\d+%|\d+\s*(sn|ms|dk|gün|saat)|kpi|sla|eşik|hedef|ölç|metrik)/i.test(body);
  checks.testable_acceptance =
    s9.length >= 40 &&
    (/kabul|cikis kriter|çıkış kriter|mvp|faz|doğrulama|exit criteria|release criteria/i.test(s9) ||
      /Yol Haritası ve Kabul Kriterleri/i.test(body));
  checks.not_repetitive = repetitionScore(body) <= 3;

  const contradictions = [];
  if (scenario?.backend?.some((b) => /go/i.test(b)) && /\bjava\b/i.test(s6) && !/\bgo\b/i.test(hay)) {
    contradictions.push("backend_go_vs_java_only");
  }
  checks.no_tech_contradiction = contradictions.length === 0;
  if (contradictions.length) warnings.push(...contradictions);

  const hardFails = [
    "sections_complete",
    "turkish_readable",
    "no_placeholders",
    "not_truncated",
  ].filter((k) => !checks[k]);
  const softFails = [
    "project_context",
    "concrete_problem",
    "meaningful_roles",
    "implementable_fr",
    "architecture_aligned",
    "data_model",
    "security_specific",
    "measurable_metrics",
    "testable_acceptance",
    "not_repetitive",
    "no_tech_contradiction",
  ].filter((k) => !checks[k]);

  for (const k of hardFails) reasons.push(`hard_fail:${k}`);
  for (const k of softFails) reasons.push(`soft_fail:${k}`);

  let decision = "APPROVE";
  if (hardFails.length) decision = "REJECT";
  else if (softFails.includes("not_repetitive") && repetitionScore(body) > 4) decision = "REJECT";
  else if (softFails.includes("no_tech_contradiction")) decision = "REGENERATE";
  else if (softFails.filter((s) => !["measurable_metrics", "project_context"].includes(s)).length >= 3) {
    decision = "REGENERATE";
  }

  return { decision, checks, reasons, warnings, hardFails, softFails };
}

function isCandidate(doc, gate) {
  if (doc.status !== "succeeded") return false;
  if (doc.document_type !== "product_spec") return false;
  if (!["draft", "approval_pending"].includes(doc.approval_status)) return false;
  const sg = doc.structured_generation || {};
  const body = doc.markdown_body || "";
  if (sg.structured_output_valid === false) return false;
  if (sg.markdown_render_succeeded === false) return false;
  if (!sg.structured_output_valid && !body.startsWith("# Product Spec:")) return false;
  if (!gate.quality_gate_passed) return false;
  if (gate.placeholder_count > 0) return false;
  if (gate.foreign_script_count > 0) return false;
  if (gate.truncated_output) return false;
  if (gate.structured_output_valid === false) return false;
  return true;
}

async function ensureAuth(args) {
  const client = new PeftDatasetClient({ orgId: args.orgId });
  const login = await client.login(args.email, args.password);
  client.token = login.data?.token;
  if (!client.token) throw new Error("login failed — set PEFT_DATASET_EMAIL/PASSWORD");
  return client;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const client = await ensureAuth(args);
  const scenarioByKey = new Map(SCENARIOS.map((s) => [s.key, s]));

  const wsRes = await client.listWorkspaces();
  const workspaces = Array.isArray(wsRes.data) ? wsRes.data : wsRes.data?.workspaces || [];
  const allDocs = [];

  for (const ws of workspaces) {
    const scenarioKey = parseScenarioKeyFromDescription(ws.description);
    const list = await client.request("GET", `/workspaces/${ws.id}/documents`, {
      workspaceId: ws.id,
      expect: [200],
      query: { limit: 50 },
    });
    const docs = list.data?.documents || [];
    for (const summary of docs) {
      if (summary.document_type !== "product_spec") continue;
      const detail = await client.getDocument(ws.id, summary.id);
      const doc = detail.data;
      allDocs.push({
        ...doc,
        workspace_id: ws.id,
        workspace_name: ws.name,
        scenario_key: scenarioKey,
      });
    }
  }

  const report = {
    organization_id: args.orgId,
    started_at: new Date().toISOString(),
    total_documents: allDocs.length,
    candidate_documents: 0,
    duplicate_scenario_count: 0,
    duplicate_fingerprint_count: 0,
    superseded_document_count: 0,
    approved_documents: 0,
    rejected_documents: 0,
    regenerate_documents: 0,
    approval_failed: 0,
    eligible_peft_documents: 0,
    already_approved: 0,
    reviews: [],
    export_ran: false,
    analyzer_ran: false,
    readiness: "PENDING",
  };

  const candidates = [];
  for (const doc of allDocs) {
    const gate = runQualityGate(doc.markdown_body || "", {
      lang: doc.language || "tr",
      structuredMeta: doc.structured_generation || null,
    });
    if (!isCandidate(doc, gate)) continue;
    candidates.push({ doc, gate });
  }
  report.candidate_documents = candidates.length;

  const byScenario = new Map();
  for (const item of candidates) {
    const key = item.doc.scenario_key || item.doc.workspace_id;
    if (!byScenario.has(key)) byScenario.set(key, []);
    byScenario.get(key).push(item);
  }
  report.duplicate_scenario_count = [...byScenario.values()].filter((v) => v.length > 1).length;

  const selected = [];
  for (const [, group] of byScenario) {
    group.sort((a, b) => new Date(b.doc.updated_at) - new Date(a.doc.updated_at));
    selected.push(group[0]);
    report.superseded_document_count += group.length - 1;
  }

  const byFp = new Map();
  for (const item of selected) {
    const fp = item.doc.source_fingerprint || item.doc.id;
    if (!byFp.has(fp)) byFp.set(fp, []);
    byFp.get(fp).push(item);
  }
  report.duplicate_fingerprint_count = [...byFp.values()].filter((v) => v.length > 1).length;

  const deduped = [];
  for (const [, group] of byFp) {
    group.sort((a, b) => new Date(b.doc.updated_at) - new Date(a.doc.updated_at));
    deduped.push(group[0]);
    report.superseded_document_count += group.length - 1;
  }

  const approveIds = [];
  for (const { doc } of deduped) {
    const scenario = scenarioByKey.get(doc.scenario_key);
    const body = doc.markdown_body || "";
    const quality = assessDocumentQuality(doc);
    const review = performFinalReview(doc, scenario, body);
    const entry = {
      document_id: doc.id,
      workspace_id: doc.workspace_id,
      scenario_key: doc.scenario_key,
      workspace_name: doc.workspace_name,
      title: doc.title,
      approval_status_before: doc.approval_status,
      quality_score: doc.quality?.quality_score ?? 0,
      source_fingerprint: doc.source_fingerprint || null,
      gate: quality.quality_gate,
      review_decision: review.decision,
      review_checks: review.checks,
      review_reasons: review.reasons,
      review_warnings: review.warnings,
      approved: false,
      approval_verified: false,
    };

    if (review.decision === "APPROVE") {
      if (doc.approval_status === "approved") {
        entry.approved = true;
        entry.approval_verified = true;
        entry.skipped_already_approved = true;
        approveIds.push(doc.id);
      } else if (!args.dryRun) {
        try {
          await client.approveDocument(doc.workspace_id, doc.id);
          const verified = await client.getDocument(doc.workspace_id, doc.id);
          const vd = verified.data;
          entry.approved = vd.approval_status === "approved";
          entry.approval_verified =
            vd.approval_status === "approved" && vd.approved_at && vd.approved_by;
          entry.approval_status_after = vd.approval_status;
          entry.approved_at = vd.approved_at;
          entry.approved_by = vd.approved_by;
          if (entry.approved) approveIds.push(doc.id);
          else report.approval_failed += 1;
        } catch (err) {
          entry.approval_error = err.message;
          report.approval_failed += 1;
        }
      }
      report.approved_documents += 1;
    } else if (review.decision === "REJECT") {
      report.rejected_documents += 1;
    } else {
      report.regenerate_documents += 1;
    }

    report.reviews.push(entry);
  }

  const approvedIdSet = new Set();
  for (const doc of allDocs) {
    if (doc.approval_status === "approved" && doc.status === "succeeded") {
      approvedIdSet.add(doc.id);
    }
  }
  for (const id of approveIds) approvedIdSet.add(id);
  report.already_approved = approvedIdSet.size - approveIds.filter((id) => {
    const d = allDocs.find((x) => x.id === id);
    return d?.approval_status === "approved";
  }).length;
  report.eligible_peft_documents = approvedIdSet.size;

  report.finished_at = new Date().toISOString();

  if (report.eligible_peft_documents >= 27 && !args.dryRun) {
    report.readiness = "READY_FOR_FINETUNING";
  } else if (report.eligible_peft_documents < 27) {
    report.readiness = "FIX_BEFORE_FINETUNING";
  }

  fs.writeFileSync(args.report, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    total_documents: report.total_documents,
    candidate_documents: report.candidate_documents,
    deduped_for_review: deduped.length,
    duplicate_scenario_count: report.duplicate_scenario_count,
    duplicate_fingerprint_count: report.duplicate_fingerprint_count,
    superseded_document_count: report.superseded_document_count,
    approved_documents: report.approved_documents,
    rejected_documents: report.rejected_documents,
    regenerate_documents: report.regenerate_documents,
    approval_failed: report.approval_failed,
    already_approved: report.already_approved,
    eligible_peft_documents: report.eligible_peft_documents,
    readiness: report.readiness,
    report: args.report,
  }, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
