#!/usr/bin/env node
/**
 * Regenerate first 3 PEFT authorized documents with updated answers and quality gate.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PeftDatasetClient } from "./lib/peft_dataset_client.mjs";
import { buildAnswersForQuestions } from "./lib/peft_dataset_answers.mjs";
import { SCENARIOS } from "./lib/peft_dataset_scenarios.mjs";
import {
  assessDocumentQuality,
  parseArgs,
  parseScenarioKeyFromDescription,
  redactSecrets,
} from "./lib/peft_dataset_utils.mjs";

const ORG_ID = "4eda8bd6-7bd3-474c-8e06-267d4a9d0fe8";
const TARGETS = [
  { scenarioKey: "rural-producer-platform", workspacePrefix: "a5f94410", documentPrefix: "3849a120" },
  { scenarioKey: "finops-cost-dashboard", workspacePrefix: "d8a483ea", documentPrefix: "f9f2d218" },
  { scenarioKey: "hr-onboarding-portal", workspacePrefix: "641ea674", documentPrefix: "dd1f5065" },
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findByPrefix(items, prefix, field = "id") {
  return (items || []).find((item) => String(item[field] || "").startsWith(prefix));
}

function evaluateDecision(doc, quality) {
  const gate = quality.quality_gate;
  if (!quality.approve_eligible) {
    if (gate.garbled_text_detected || gate.foreign_script_count > 0) return "REJECT";
    return "REGENERATE";
  }
  return "APPROVE";
}

async function regenerateOne(client, target, scenario, language) {
  const wsRes = await client.listWorkspaces();
  const workspaces = Array.isArray(wsRes.data) ? wsRes.data : wsRes.data?.workspaces || [];
  const workspace = findByPrefix(workspaces, target.workspacePrefix);
  if (!workspace) throw new Error(`workspace not found for ${target.scenarioKey}`);

  const docsRes = await client.request("GET", `/workspaces/${workspace.id}/documents`, {
    workspaceId: workspace.id,
    expect: [200],
  });
  const docs = docsRes.data?.documents || docsRes.data || [];
  const sourceDoc = findByPrefix(docs, target.documentPrefix);
  if (!sourceDoc) throw new Error(`source document not found for ${target.scenarioKey}`);

  const qRes = await client.listWorkspaceQuestions(workspace.id);
  const questions = qRes.data?.questions || qRes.data || [];
  const { answers, fallbackKeys } = buildAnswersForQuestions(questions, scenario, language);
  if (answers.length) await client.bulkUpsertAnswers(workspace.id, answers);

  let attempt = 0;
  let lastResult = null;
  let currentSourceId = sourceDoc.id;

  while (attempt < 2) {
    attempt += 1;
    const regen = await client.regenerateDocument(workspace.id, currentSourceId);
    const doc = regen.data;
    const quality = assessDocumentQuality(doc, { lang: language });
    const decision = evaluateDecision(doc, quality);

    lastResult = {
      old_document_id: currentSourceId,
      new_document_id: doc.id,
      scenario_key: target.scenarioKey,
      generation_attempt: attempt,
      quality_score: quality.quality_score,
      quality_gate_passed: quality.quality_gate.quality_gate_passed,
      foreign_script_count: quality.quality_gate.foreign_script_count,
      placeholder_count: quality.quality_gate.placeholder_count,
      raw_key_count: quality.quality_gate.raw_key_count,
      truncated_output: quality.quality_gate.truncated_output,
      markdown_character_count: (doc.markdown_body || "").length,
      section_coverage: doc.quality?.section_coverage_ok ?? null,
      provider: doc.provider_name,
      model: doc.model_name,
      fallback_keys: fallbackKeys,
      decision,
      approved: false,
      quality_gate: quality.quality_gate,
      errors: quality.errors,
    };

    if (decision === "APPROVE") {
      await client.approveDocument(workspace.id, doc.id);
      lastResult.approved = true;
      break;
    }
    currentSourceId = doc.id;
  }

  return lastResult;
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
  for (const target of TARGETS) {
    const scenario = SCENARIOS.find((s) => s.key === target.scenarioKey);
    if (!scenario) throw new Error(`scenario missing: ${target.scenarioKey}`);
    try {
      results.push(await regenerateOne(client, target, scenario, args.language || "tr"));
    } catch (err) {
      results.push({
        scenario_key: target.scenarioKey,
        error: redactSecrets(err.message),
      });
    }
  }

  const outPath = path.join(__dirname, "..", "peft-regeneration-results.json");
  fs.writeFileSync(outPath, JSON.stringify({ org_id: ORG_ID, results }, null, 2));
  console.log(JSON.stringify({ org_id: ORG_ID, results }, null, 2));
}

main().catch((err) => {
  console.error(redactSecrets(err.message));
  process.exit(1);
});
