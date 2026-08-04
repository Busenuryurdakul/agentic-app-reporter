#!/usr/bin/env node
/**
 * Regenerate authorized PEFT workspaces using structured JSON → deterministic Markdown flow.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PeftDatasetClient } from "./lib/peft_dataset_client.mjs";
import { buildAnswersForQuestions } from "./lib/peft_dataset_answers.mjs";
import { SCENARIOS } from "./lib/peft_dataset_scenarios.mjs";
import { isStructuredMarkdown } from "./lib/peft_quality_gate.mjs";
import {
  assessDocumentQuality,
  parseArgs,
  parseScenarioKeyFromDescription,
  redactSecrets,
} from "./lib/peft_dataset_utils.mjs";

const ORG_ID = "4eda8bd6-7bd3-474c-8e06-267d4a9d0fe8";
const SCENARIO_KEYS = [
  "rural-producer-platform",
  "finops-cost-dashboard",
  "hr-onboarding-portal",
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function manualDecision(doc, quality, scenarioKey) {
  if (doc.status !== "succeeded") return "REJECT";
  const body = doc.markdown_body || "";
  const sg = doc.structured_generation || {};
  if (!quality.approve_eligible) return "REGENERATE";
  if (!isStructuredMarkdown(body)) return "REGENERATE";
  if (sg.structured_output_valid === false) return "REGENERATE";
  if (!/FR-\d{3}|Fonksiyonel Gereksinimler/i.test(body)) return "REGENERATE";
  if (scenarioKey === "finops-cost-dashboard" && !/maliyet|finops|bütçe/i.test(body)) {
    return "REGENERATE";
  }
  return "APPROVE";
}

async function findWorkspace(client, scenarioKey) {
  const wsRes = await client.listWorkspaces();
  const workspaces = Array.isArray(wsRes.data) ? wsRes.data : wsRes.data?.workspaces || [];
  return workspaces.find((ws) => parseScenarioKeyFromDescription(ws.description) === scenarioKey);
}

async function latestProductSpecDoc(client, workspaceId) {
  const docsRes = await client.request("GET", `/workspaces/${workspaceId}/documents`, {
    workspaceId,
    expect: [200],
  });
  const docs = (docsRes.data?.documents || docsRes.data || [])
    .filter((d) => d.document_type === "product_spec")
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return docs[0] || null;
}

async function regenerateScenario(client, scenarioKey, language) {
  const scenario = SCENARIOS.find((s) => s.key === scenarioKey);
  if (!scenario) throw new Error(`scenario not found: ${scenarioKey}`);

  const workspace = await findWorkspace(client, scenarioKey);
  if (!workspace) throw new Error(`workspace not found: ${scenarioKey}`);

  const sourceDoc = await latestProductSpecDoc(client, workspace.id);
  if (!sourceDoc) throw new Error(`no product_spec document: ${scenarioKey}`);

  const qRes = await client.listWorkspaceQuestions(workspace.id);
  const questions = qRes.data?.questions || qRes.data || [];
  const { answers } = buildAnswersForQuestions(questions, scenario, language);
  if (answers.length) await client.bulkUpsertAnswers(workspace.id, answers);

  let attempt = 0;
  let currentSourceId = sourceDoc.id;
  let last = null;

  while (attempt < 2) {
    attempt += 1;
    const regen = await client.regenerateDocument(workspace.id, currentSourceId);
    const doc = regen.data;
    const sg = doc.structured_generation || {};
    const quality = assessDocumentQuality(doc, { lang: language });
    const decision = manualDecision(doc, quality, scenarioKey);

    last = {
      scenario_key: scenarioKey,
      old_document_id: currentSourceId,
      new_document_id: doc.id,
      generation_attempt: attempt,
      json_parse_succeeded: sg.json_parse_succeeded ?? null,
      structured_output_valid: sg.structured_output_valid ?? quality.quality_gate.structured_output_valid,
      structured_repair_attempts: sg.structured_repair_attempts ?? quality.quality_gate.structured_repair_attempts,
      markdown_render_succeeded: sg.markdown_render_succeeded ?? quality.quality_gate.markdown_render_succeeded,
      quality_score: quality.quality_score,
      quality_gate_passed: quality.quality_gate.quality_gate_passed,
      markdown_character_count: (doc.markdown_body || "").length,
      section_coverage: doc.quality?.section_coverage_ok ?? null,
      provider: doc.provider_name,
      model: doc.model_name,
      decision,
      approved: false,
      structured_generation: sg,
      quality_gate: quality.quality_gate,
      errors: quality.errors,
    };

    if (decision === "APPROVE") {
      await client.approveDocument(workspace.id, doc.id);
      last.approved = true;
      break;
    }
    if (doc.status !== "succeeded") break;
    currentSourceId = doc.id;
  }

  return last;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = args.email || process.env.PEFT_DATASET_EMAIL;
  const password = args.password || process.env.PEFT_DATASET_PASSWORD;
  const client = new PeftDatasetClient({ orgId: ORG_ID });
  const login = await client.login(email, password);
  client.token = login.data.token;

  await client.updateOrgLlmSettings({
    provider: "ollama",
    model: args.model || "llama3.2:latest",
    base_url: args.baseUrl || "http://127.0.0.1:11434/v1",
  });

  const results = [];
  for (const key of SCENARIO_KEYS) {
    try {
      results.push(await regenerateScenario(client, key, args.language || "tr"));
    } catch (err) {
      results.push({ scenario_key: key, error: redactSecrets(err.message) });
    }
  }

  const out = { org_id: ORG_ID, flow: "structured_json_markdown", results };
  fs.writeFileSync(path.join(__dirname, "..", "peft-structured-regeneration-results.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(redactSecrets(err.message));
  process.exit(1);
});
