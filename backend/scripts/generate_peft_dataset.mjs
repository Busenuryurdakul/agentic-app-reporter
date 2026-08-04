#!/usr/bin/env node
/**
 * Generate realistic PEFT product_spec datasets via existing Studio API (no SQL inserts).
 *
 * Usage:
 *   node ./scripts/generate_peft_dataset.mjs --org-id=<UUID> --count=30 --provider=ollama --dry-run
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildAnswersForQuestions, buildDocumentTitle, buildProfilePayload } from "./lib/peft_dataset_answers.mjs";
import { PeftDatasetClient } from "./lib/peft_dataset_client.mjs";
import {
  categoryDistribution,
  loadScenariosFromFile,
  SCENARIOS,
  selectScenarios,
} from "./lib/peft_dataset_scenarios.mjs";
import {
  assertMockAllowed,
  assessDocumentQuality,
  buildWorkspaceDescription,
  buildWorkspaceSlug,
  findExistingScenarioWorkspace,
  parseArgs,
  parseScenarioKeyFromDescription,
  redactSecrets,
  validateArgs,
} from "./lib/peft_dataset_utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");

function debugLog(args, ...parts) {
  if (args.debug) console.log("[debug]", ...parts);
}

function resolveDecision(item, quality) {
  if (item.status === "failed" || item.status === "generation_failed") return "REJECT";
  if (item.status === "quality_failed" || item.flags?.quality_failed) return "REJECT";
  if (item.flags?.approved) return "APPROVE";
  if (item.flags?.generation_succeeded && quality?.approve_eligible) return "APPROVE";
  if (item.flags?.generation_succeeded) return "REGENERATE";
  return "REJECT";
}

function initialReport(args) {
  return {
    organization_id: args.orgId,
    provider: args.provider,
    requested_count: args.count,
    processed_count: 0,
    workspace_created: 0,
    generation_succeeded: 0,
    generation_failed: 0,
    quality_passed: 0,
    quality_failed: 0,
    approved: 0,
    approval_pending: 0,
    peft_eligible: 0,
    started_at: new Date().toISOString(),
    finished_at: null,
    items: [],
  };
}

async function configureProvider(client, args) {
  if (args.dryRun) return;
  if (!["ollama", "gemma", "mock"].includes(args.provider)) {
    throw new Error(`unsupported --provider ${args.provider}`);
  }
  const payload = {
    provider: args.provider,
    enabled: true,
  };
  if (args.baseUrl) payload.base_url = args.baseUrl;
  if (args.model) payload.model = args.model;
  const res = await client.updateOrgLlmSettings(payload);
  debugLog(args, `LLM settings: ${res.status}`);
  if (res.status !== 200) {
    throw new Error(`LLM settings update failed: HTTP ${res.status}`);
  }
}

async function ensureAuth(args) {
  const client = new PeftDatasetClient({ orgId: args.orgId });
  if (args.email && args.password) {
    debugLog(args, "Authentication method: LOGIN_JWT");
    const login = await client.login(args.email, args.password);
    const token = login.data?.token;
    if (!token) {
      throw new Error("Login: FAIL — JWT not received");
    }
    debugLog(args, "Login: PASS");
    debugLog(args, "JWT received: yes");
    debugLog(args, `JWT length: ${token.length}`);
    client.token = token;
    return client;
  }
  if (args.apiKey) {
    debugLog(args, "Authentication method: API_KEY");
    client.token = args.apiKey;
    return client;
  }
  throw new Error(
    "--email and --password (or PEFT_DATASET_EMAIL/PASSWORD / --api-key / ADCS_API_KEY) are required",
  );
}

async function preflight(client, args) {
  const health = await client.llmHealth();
  const provider = health.data?.provider || "unknown";
  assertMockAllowed(provider, args.allowMock);
  if (!health.data?.healthy) {
    throw new Error(`LLM unhealthy: ${redactSecrets(JSON.stringify(health.data))}`);
  }
  if (args.provider && provider !== args.provider && !args.allowMock) {
    console.warn(`WARN  effective provider=${provider}, requested=${args.provider}`);
  }
  return health.data;
}

async function processScenario(client, scenario, index, args, timestamp, existingWorkspaces) {
  const item = {
    scenario_key: scenario.key,
    category: scenario.category,
    workspace_id: null,
    workspace_name: scenario.project_name,
    document_id: null,
    provider: args.provider,
    model: null,
    quality_score: 0,
    status: "pending",
    errors: [],
    warnings: [],
    flags: {
      workspace_created: false,
      profile_saved: false,
      questionnaire_completed: false,
      generation_succeeded: false,
      generation_failed: false,
      quality_failed: false,
      approval_pending: false,
      approved: false,
      peft_eligible: false,
    },
  };

  try {
    let workspaceId = null;
    const existing = findExistingScenarioWorkspace(existingWorkspaces, scenario.key);

    if (existing && !args.force) {
      if (args.reuseWorkspace || args.scenarioKeyList?.length) {
        workspaceId = existing.id;
        item.workspace_id = workspaceId;
        item.warnings.push(`reusing workspace_id=${workspaceId}`);
      } else {
        item.warnings.push(`scenario already exists workspace_id=${existing.id}`);
        item.status = "skipped_existing";
        return item;
      }
    }

    if (!workspaceId) {
      const slug = buildWorkspaceSlug(timestamp, index);
      const wsRes = await client.createWorkspace({
        name: scenario.project_name,
        slug,
        description: buildWorkspaceDescription(scenario.key),
      });
      workspaceId = wsRes.data.id;
      item.workspace_id = workspaceId;
      item.flags.workspace_created = true;
    }

    await client.upsertProfile(workspaceId, buildProfilePayload(scenario, args.language));
    item.flags.profile_saved = true;

    const qRes = await client.listWorkspaceQuestions(workspaceId);
    const questions = qRes.data?.questions || [];
    const { answers, fallbackKeys } = buildAnswersForQuestions(questions, scenario, args.language);
    if (fallbackKeys.length) {
      item.warnings.push(`fallback_answer_used: ${fallbackKeys.join(", ")}`);
    }
    if (answers.length) {
      await client.bulkUpsertAnswers(workspaceId, answers);
    }

    let missing = await client.missingInformation(workspaceId);
    if ((missing.data?.missing || []).length > 0) {
      const retryAnswers = buildAnswersForQuestions(questions, scenario, args.language).answers;
      if (retryAnswers.length) await client.bulkUpsertAnswers(workspaceId, retryAnswers);
      missing = await client.missingInformation(workspaceId);
    }
    if ((missing.data?.missing || []).length > 0) {
      throw new Error(
        `missing required questions after bulk upsert: ${missing.data.missing.map((m) => m.title).join("; ")}`,
      );
    }
    item.flags.questionnaire_completed = true;

    const completeness = await client.getProfileCompleteness(workspaceId);
    if ((completeness.data?.missing_fields || []).length > 0) {
      item.warnings.push(`profile missing: ${completeness.data.missing_fields.join(", ")}`);
    }

    const gen = await client.generateDocument(workspaceId, {
      title: buildDocumentTitle(scenario),
      language: args.language,
      document_type: "product_spec",
    });
    const doc = gen.data;
    item.document_id = doc.id;
    item.model = doc.model_name;
    item.provider = doc.provider_name || args.provider;

    if (doc.status !== "succeeded") {
      item.flags.generation_failed = true;
      item.status = "generation_failed";
      item.errors.push(doc.error_message || `status=${doc.status}`);
      item.decision = "REJECT";
      item.quality_gate_passed = false;
      console.log(
        `${scenario.key} structured_output_valid=false markdown_render_succeeded=false quality_gate_passed=false decision=REJECT`,
      );
      return item;
    }
    item.flags.generation_succeeded = true;

    const quality = assessDocumentQuality(doc);
    item.quality_score = quality.quality_score;
    item.warnings.push(...quality.warnings);
    const sg = doc.structured_generation || {};
    const gate = quality.quality_gate || {};
    item.decision = resolveDecision(item, quality);
    item.structured_output_valid = sg.structured_output_valid ?? gate.structured_output_valid ?? null;
    item.markdown_render_succeeded = sg.markdown_render_succeeded ?? gate.markdown_render_succeeded ?? null;
    item.quality_gate_passed = gate.quality_gate_passed ?? quality.passed;
    console.log(
      `${scenario.key} structured_output_valid=${item.structured_output_valid ?? "n/a"} ` +
        `markdown_render_succeeded=${item.markdown_render_succeeded ?? "n/a"} ` +
        `quality_gate_passed=${item.quality_gate_passed} decision=${item.decision}`,
    );
    if (!quality.passed) {
      item.flags.quality_failed = true;
      item.status = "quality_failed";
      item.errors.push(...quality.errors);
      item.decision = "REJECT";
      console.log(
        `${scenario.key} structured_output_valid=${item.structured_output_valid ?? "n/a"} ` +
          `markdown_render_succeeded=${item.markdown_render_succeeded ?? "n/a"} ` +
          `quality_gate_passed=false decision=REJECT`,
      );
      return item;
    }

    item.status = "approval_pending";
    item.flags.approval_pending = true;

    if (args.approve) {
      if (!quality.approve_eligible) {
        item.flags.quality_failed = true;
        item.status = "quality_failed";
        item.errors.push("approval blocked: quality gate failed");
        return item;
      }
      await client.approveDocument(workspaceId, doc.id);
      item.flags.approved = true;
      item.flags.approval_pending = false;
      item.status = "approved";
      if (doc.source_fingerprint) {
        item.flags.peft_eligible = true;
      }
    }

    return item;
  } catch (err) {
    item.errors.push(redactSecrets(err.message));
    item.status = item.status === "pending" ? "failed" : item.status;
    if (!item.flags.generation_succeeded) item.flags.generation_failed = true;
    item.decision = "REJECT";
    console.log(
      `${scenario.key} structured_output_valid=n/a markdown_render_succeeded=n/a quality_gate_passed=false decision=REJECT`,
    );
    return item;
  }
}

function summarizeReport(report) {
  for (const item of report.items) {
    report.processed_count += 1;
    if (item.flags.workspace_created) report.workspace_created += 1;
    if (item.flags.generation_succeeded) report.generation_succeeded += 1;
    if (item.flags.generation_failed || item.status === "generation_failed") report.generation_failed += 1;
    if (item.flags.quality_failed || item.status === "quality_failed") report.quality_failed += 1;
    if (item.status === "approval_pending" || item.flags.approval_pending) report.approval_pending += 1;
    if (item.flags.approved) report.approved += 1;
    if (item.flags.generation_succeeded && !item.flags.quality_failed && item.quality_score >= 80) {
      report.quality_passed += 1;
    }
    if (item.flags.peft_eligible) report.peft_eligible += 1;
  }
  report.finished_at = new Date().toISOString();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  validateArgs(args);

  const allScenarios = loadScenariosFromFile(args.scenarioFile, fs);
  const scenarios = selectScenarios(allScenarios, {
    count: args.count,
    startIndex: args.startIndex,
    scenarioKeys: args.scenarioKeyList,
  });
  if (args.scenarioKeyList?.length) {
    args.reuseWorkspace = true;
  }
  const timestamp = Date.now();

  console.log("=== PEFT Dataset Generator ===");
  console.log(`org-id=${args.orgId} count=${args.count} provider=${args.provider} dry-run=${args.dryRun}`);

  if (args.dryRun) {
    console.log("\nDry-run scenarios:");
    for (let i = 0; i < scenarios.length; i++) {
      const idx = args.startIndex + i;
      const slug = buildWorkspaceSlug(timestamp, idx);
      console.log(
        `  ${idx}. [${scenarios[i].category}] ${scenarios[i].project_name} key=${scenarios[i].key} slug=${slug}`,
      );
    }
    console.log("\nCategory distribution:", categoryDistribution(scenarios));
    console.log(`Would create ${scenarios.length} workspaces (no API mutations).`);
    return;
  }

  const client = await ensureAuth(args);
  await configureProvider(client, args);
  const health = await preflight(client, args);
  console.log(`Auth: LOGIN_JWT | LLM settings: 200 | health: ${health.provider}`);

  const workspaces = (await client.listWorkspaces()).data?.workspaces || [];
  const report = initialReport(args);

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    const index = args.startIndex + i;
    const item = await processScenario(client, scenario, index, args, timestamp, workspaces);
    report.items.push(item);

    if (item.flags.workspace_created) {
      workspaces.push({ id: item.workspace_id, description: buildWorkspaceDescription(scenario.key) });
    }

    if (item.status === "failed" && !args.continueOnError) {
      console.error("Stopping due to error (--no-continue-on-error)");
      break;
    }
  }

  summarizeReport(report);
  const outPath = path.resolve(backendRoot, args.outputReport);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const summary = {
    generated: report.generation_succeeded,
    approved: report.approved,
    regenerated: report.items.filter((i) => i.decision === "REGENERATE").length,
    rejected: report.items.filter((i) => i.decision === "REJECT").length,
    failed: report.items.filter((i) => i.status === "failed" || i.status === "generation_failed").length,
    provider_errors: report.items.filter((i) =>
      (i.errors || []).some((e) => /502|bad gateway|provider|upstream/i.test(e)),
    ).length,
    timeout: report.items.filter((i) => (i.errors || []).some((e) => /timeout|timed out|deadline/i.test(e))).length,
    finish_reason_length: report.items.filter((i) =>
      (i.errors || []).some((e) => /truncated|finish_reason|structured_json_parse/i.test(e)),
    ).length,
    structured_output_invalid: report.items.filter((i) => i.structured_output_valid === false).length,
    quality_gate_failed: report.items.filter((i) => i.quality_gate_passed === false).length,
    approval_pending: report.approval_pending,
  };

  console.log("\n=== Generation Summary ===");
  for (const [k, v] of Object.entries(summary)) console.log(`${k}: ${v}`);
  console.log(`Overall: ${summary.failed === 0 && summary.provider_errors === 0 ? "SUCCESS" : "PARTIAL"}`);
  console.log(`Report: ${outPath}`);

  if (report.generation_failed > 0 && !args.continueOnError) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`FAIL  ${redactSecrets(err.message)}`);
  process.exit(1);
});
