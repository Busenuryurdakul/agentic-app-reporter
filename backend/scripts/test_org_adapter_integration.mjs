#!/usr/bin/env node
/**
 * Serve + configure + smoke test structured LoRA adapter for PEFT Dataset Lab only.
 *
 * Usage:
 *   node ./scripts/test_org_adapter_integration.mjs --skip-serve
 *   node ./scripts/test_org_adapter_integration.mjs --generations=10
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { PeftDatasetClient } from "./lib/peft_dataset_client.mjs";
import { buildAnswersForQuestions, buildProfilePayload } from "./lib/peft_dataset_answers.mjs";
import { SCENARIOS, selectScenarios } from "./lib/peft_dataset_scenarios.mjs";
import {
  buildWorkspaceDescription,
  buildWorkspaceSlug,
  parseArgs,
  redactSecrets,
} from "./lib/peft_dataset_utils.mjs";

const ORG_ID = "4eda8bd6-7bd3-474c-8e06-267d4a9d0fe8";
const ADAPTER_MODEL = "product-spec-gemma-lora-v1";
const BASE_MODEL = "product-spec-gemma-base-v1";
const ADAPTER_URL = process.env.PEFT_ADAPTER_BASE_URL || "http://127.0.0.1:8765/v1";
const FALLBACK_URL = process.env.PEFT_FALLBACK_BASE_URL || "http://127.0.0.1:8766/v1";
/** Ten integration categories: SaaS, health, warehouse, AI, mobile, finance, logistics, municipal, energy, reservation. */
const INTEGRATION_SCENARIO_KEYS = [
  "rural-producer-platform",
  "health-appointment-portal",
  "warehouse-wms-lite",
  "ai-customer-support-agent",
  "fitness-coaching-mobile",
  "finops-cost-dashboard",
  "fleet-cargo-tracking",
  "municipal-field-ops",
  "energy-consumption-analytics",
  "hotel-reservation-ops",
];

const EXTRA_INTEGRATION_SCENARIOS = [
  {
    key: "health-appointment-portal",
    category: "Sağlık",
    project_name: "MedNova Randevu ve Telehealth Portalı",
    description:
      "Özel sağlık grubu için hasta self-servis randevu, telehealth ve e-reçete entegrasyonu.",
    target_users: ["Hasta", "Hekim", "Resepsiyon personeli"],
    platforms: ["web"],
    frontend: ["React"],
    backend: ["Go"],
    database: ["PostgreSQL"],
    infrastructure: ["Azure"],
    features: ["Randevu alma", "Telehealth", "E-reçete"],
    security_requirements: ["KVKK", "2FA", "Audit log"],
    integrations: ["E-reçete API"],
    scale_expectation: "50K hasta",
    offline_requirement: "Yok",
    reporting_requirements: ["No-show raporu"],
    special_constraints: ["Sağlık verisi hassas"],
  },
  {
    key: "warehouse-wms-lite",
    category: "Lojistik / depo",
    project_name: "DepoLite WMS",
    description:
      "KOBİ depolar için barkod, stok sayımı, sevkiyat dalgası ve ERP CSV entegrasyonu.",
    target_users: ["Depo sorumlusu", "Sevkiyat planlayıcı", "Depo operatörü"],
    platforms: ["web"],
    frontend: ["React"],
    backend: ["Go"],
    database: ["PostgreSQL"],
    infrastructure: ["On-premise"],
    features: ["Barkod okuma", "Stok sayımı", "Sevkiyat dalgası", "ERP CSV"],
    security_requirements: ["RBAC", "Audit log"],
    integrations: ["ERP CSV"],
    scale_expectation: "3 depo, 50 kullanıcı",
    offline_requirement: "Sınırlı offline sayım",
    reporting_requirements: ["Sayım hatası raporu"],
    special_constraints: ["Depo operasyonları gerçek zamanlı"],
  },
  {
    key: "municipal-field-ops",
    category: "Kamu / belediye",
    project_name: "Belediye Saha Operasyon Platformu",
    description: "Belediye saha ekipleri için görev, arıza ve SLA takibi; web ve mobil erişim.",
    target_users: ["Saha teknisyeni", "Ekip şefi", "Operasyon yöneticisi"],
    platforms: ["web", "mobile"],
    frontend: ["React Native"],
    backend: ["Go"],
    database: ["PostgreSQL"],
    infrastructure: ["Kubernetes"],
    features: ["Görev atama", "Arıza kaydı", "SLA takibi", "Fotoğraf kanıtı"],
    security_requirements: ["KVKK", "RBAC"],
    integrations: ["SMS bildirim"],
    scale_expectation: "200 saha teknisyeni",
    offline_requirement: "Offline saha görevleri",
    reporting_requirements: ["SLA ihlali raporu"],
    special_constraints: ["Düşük bant genişliği"],
  },
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");
const reportPath = path.join(backendRoot, "training-output", "test-org-adapter-integration-report.json");
const snapshotPath = path.join(backendRoot, "training-output", "test-org-llm-settings.snapshot.json");
const structuredConfig = path.join(backendRoot, "deployments/finetune/compare_prompts_structured_final_30.json");

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, text };
}

function openAiBase(baseUrl) {
  return baseUrl.replace(/\/$/, "");
}

function sanitizeLlmSnapshot(settings) {
  const s = settings?.data ?? settings ?? {};
  return {
    provider: s.provider ?? null,
    model: s.model ?? null,
    base_url: s.base_url ?? null,
    source: s.source ?? null,
    created_at: s.created_at ?? null,
  };
}

async function healthCheck(baseUrl, model) {
  const root = openAiBase(baseUrl);
  const health = await fetchJson(`${root.replace(/\/v1$/, "")}/health`);
  const models = await fetchJson(`${root}/models`);
  if (models.status !== 200) {
    return { healthy: false, message: `models HTTP ${models.status}`, health_status: health.status };
  }
  const modelIds = models.data?.data?.map((m) => m.id) || models.data?.models?.map((m) => m.id) || [];
  const probe = await fetchJson(`${root}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 8,
      temperature: 0,
    }),
  });
  const finishReason = probe.data?.choices?.[0]?.finish_reason ?? null;
  const contentLen = (probe.data?.choices?.[0]?.message?.content || "").length;
  return {
    healthy: probe.status === 200,
    message: probe.status === 200 ? "ok" : `chat HTTP ${probe.status}`,
    health_status: health.status,
    model,
    model_listed: modelIds.includes(model),
    base_url: baseUrl,
    chat_status: probe.status,
    finish_reason: finishReason,
    output_length: contentLen,
  };
}

function resolveIntegrationScenarios(count) {
  const pool = [...SCENARIOS, ...EXTRA_INTEGRATION_SCENARIOS];
  const keys = INTEGRATION_SCENARIO_KEYS.slice(0, count);
  return selectScenarios(pool, { count: keys.length, scenarioKeys: keys });
}

function runStructuredSmoke() {
  return new Promise((resolve, reject) => {
    const py = spawn(
      "python",
      [
        path.join(backendRoot, "deployments/finetune/compare_structured_lora_final_30.py"),
        "--config",
        structuredConfig,
        "--output-dir",
        path.join(backendRoot, "training-output/test-org-adapter-structured-smoke"),
        "--report-path",
        path.join(backendRoot, "peft-test-org-structured-smoke-report.md"),
        "--go-tool",
        path.join(backendRoot, "deployments/finetune/bin/structured-spec-tool"),
      ],
      { cwd: path.join(backendRoot, "deployments/finetune"), shell: true },
    );
    let out = "";
    py.stdout.on("data", (d) => {
      out += d.toString();
    });
    py.stderr.on("data", (d) => {
      out += d.toString();
    });
    py.on("close", (code) => {
      if (code !== 0 && code !== 1) {
        reject(new Error(`structured smoke exit ${code}: ${redactSecrets(out.slice(-800))}`));
        return;
      }
      try {
        const m = out.match(/\{[\s\S]*"decision"[\s\S]*\}/);
        resolve(m ? JSON.parse(m[0]) : { raw: out.slice(-500) });
      } catch {
        resolve({ raw: out.slice(-500) });
      }
    });
  });
}

async function ensureWorkspace(client, scenario, language) {
  const wsRes = await client.listWorkspaces();
  const workspaces = Array.isArray(wsRes.data) ? wsRes.data : wsRes.data?.workspaces || [];
  const slug = buildWorkspaceSlug(scenario.key);
  let ws = workspaces.find((w) => w.slug === slug);
  if (!ws) {
    const created = await client.createWorkspace({
      name: scenario.title,
      slug,
      description: buildWorkspaceDescription(scenario.key, language),
    });
    ws = created.data;
  }
  await client.upsertProfile(ws.id, buildProfilePayload(scenario, language));
  const qRes = await client.listWorkspaceQuestions(ws.id);
  const questions = qRes.data?.questions || qRes.data || [];
  const { answers } = buildAnswersForQuestions(questions, scenario, language);
  if (answers.length) await client.bulkUpsertAnswers(ws.id, answers);
  return ws;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = args.email || process.env.PEFT_DATASET_EMAIL;
  const password = args.password || process.env.PEFT_DATASET_PASSWORD;
  const generations = Number(args.generations || 10);
  const report = {
    generated_at: new Date().toISOString(),
    org_id: ORG_ID,
    adapter_model: ADAPTER_MODEL,
    adapter_base_url: ADAPTER_URL,
    fallback_base_url: FALLBACK_URL,
    git_branch: process.env.GIT_BRANCH || null,
    decision: "TEST_ORG_ADAPTER_INTEGRATION_FAIL",
  };

  report.health = {
    adapter: await healthCheck(ADAPTER_URL, ADAPTER_MODEL),
    fallback: await healthCheck(FALLBACK_URL, BASE_MODEL),
  };

  if (!email || !password) {
    report.blocker = "missing PEFT_DATASET_EMAIL/PASSWORD";
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const client = new PeftDatasetClient({ orgId: ORG_ID, apiBase: args.apiBase || process.env.API_BASE });
  const login = await client.login(email, password);
  client.token = login.data.token;

  const before = await client.getOrgLlmSettings();
  report.org_settings_before = sanitizeLlmSnapshot(before.data);
  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.writeFileSync(
    snapshotPath,
    JSON.stringify(
      {
        org_id: ORG_ID,
        saved_at: new Date().toISOString(),
        settings: sanitizeLlmSnapshot(before.data),
      },
      null,
      2,
    ),
  );

  const controlOrgId = login.data.user?.organization_id || login.data.user?.default_organization_id;
  let controlOrgBefore = null;
  if (controlOrgId && controlOrgId !== ORG_ID) {
    const ctrl = new PeftDatasetClient({ orgId: controlOrgId, apiBase: client.apiBase });
    ctrl.token = client.token;
    const ctrlSettings = await ctrl.getOrgLlmSettings();
    controlOrgBefore = sanitizeLlmSnapshot(ctrlSettings.data);
  }

  await client.updateOrgLlmSettings({
    provider: "ollama",
    base_url: ADAPTER_URL,
    model: ADAPTER_MODEL,
    enabled: true,
  });

  const afterPut = await client.getOrgLlmSettings();
  let settingsTest = null;
  try {
    settingsTest = await client.request("POST", `/organizations/${ORG_ID}/llm-settings/test`, {
      expect: [200],
    });
  } catch (err) {
    settingsTest = { error: redactSecrets(err.message), status: err.status };
  }
  const orgLlmHealth = await client.llmHealth();

  report.org_llm_settings = sanitizeLlmSnapshot(afterPut.data);
  report.org_settings_test = {
    healthy: settingsTest?.data?.healthy ?? settingsTest?.data?.data?.healthy ?? null,
    model: settingsTest?.data?.model ?? settingsTest?.data?.data?.model ?? null,
    status: settingsTest?.status ?? null,
    error: settingsTest?.error ?? null,
  };
  report.org_llm_health = {
    healthy: orgLlmHealth.data?.healthy ?? null,
    model: orgLlmHealth.data?.model ?? null,
    provider: orgLlmHealth.data?.provider ?? null,
  };
  report.rollback_command =
    `node ./scripts/rollback_test_org_adapter.mjs --snapshot=${snapshotPath.replace(/\\/g, "/")}`;

  const runStructured = args.structuredSmoke === true || args.structuredSmoke === "true";
  if (runStructured && !args.skipStructuredSmoke) {
    try {
      report.structured_smoke_5 = await runStructuredSmoke();
    } catch (err) {
      report.structured_smoke_5 = { error: redactSecrets(err.message) };
    }
  }

  const picked = resolveIntegrationScenarios(generations);
  report.generations = [];
  let gatePass = 0;
  let adapterSuccessCount = 0;
  let fallbackCount = 0;
  let emptyShown = 0;
  let providerErrors = 0;
  let warehouseResult = null;
  const latencies = [];

  for (const scenario of picked) {
    const started = Date.now();
    const item = {
      scenario_id: scenario.key,
      adapter_attempted: true,
      adapter_success: false,
      fallback_used: false,
      fallback_reason: null,
      initial_valid_json: null,
      repair_count: null,
      markdown_render_succeeded: null,
      quality_gate_passed: false,
      empty_markdown: false,
      provider_error: false,
      latency_ms: null,
      final_model: null,
    };
    try {
      const ws = await ensureWorkspace(client, scenario, args.language || "tr");
      const gen = await client.generateDocument(ws.id, {
        document_type: "product_spec",
        language: args.language || "tr",
      });
      const doc = gen.data;
      item.latency_ms = Date.now() - started;
      latencies.push(item.latency_ms);
      const sg = doc.structured_generation || {};
      item.initial_valid_json = sg.json_parse_succeeded ?? null;
      item.repair_count = sg.structured_repair_attempts ?? null;
      item.markdown_render_succeeded = sg.markdown_render_succeeded ?? null;
      item.fallback_used = Boolean(sg.used_fallback);
      item.fallback_reason = sg.fallback_reason || null;
      item.quality_gate_passed = Boolean(sg.quality_gate_passed);
      item.empty_markdown = !(doc.markdown_body || "").trim();
      item.provider_error = doc.status === "failed";
      item.final_model = doc.model_name || null;
      item.adapter_success =
        doc.status === "succeeded" && !item.fallback_used && item.quality_gate_passed;
      if (item.fallback_used) fallbackCount += 1;
      if (item.provider_error) providerErrors += 1;
      if (item.quality_gate_passed) gatePass += 1;
      if (item.adapter_success) adapterSuccessCount += 1;
      if (item.empty_markdown && doc.status === "succeeded") emptyShown += 1;
      if (scenario.key.includes("warehouse") || scenario.key === "warehouse-wms-lite") {
        warehouseResult = {
          scenario_id: scenario.key,
          adapter_result: item.adapter_success ? "pass" : "fail",
          fallback_triggered: item.fallback_used,
          final_model: item.final_model,
          final_gate_passed: item.quality_gate_passed,
          user_visible_output_empty: item.empty_markdown,
          fallback_reason: item.fallback_reason,
        };
      }
    } catch (err) {
      item.provider_error = true;
      item.error = redactSecrets(err.message);
      providerErrors += 1;
    }
    report.generations.push(item);
  }

  let controlOrgUnchanged = true;
  if (controlOrgId && controlOrgId !== ORG_ID && controlOrgBefore) {
    const ctrl = new PeftDatasetClient({ orgId: controlOrgId, apiBase: client.apiBase });
    ctrl.token = client.token;
    const ctrlAfter = await ctrl.getOrgLlmSettings();
    const after = sanitizeLlmSnapshot(ctrlAfter.data);
    controlOrgUnchanged = JSON.stringify(after) === JSON.stringify(controlOrgBefore);
    report.control_org_verification = {
      org_id: controlOrgId,
      unchanged: controlOrgUnchanged,
      before: controlOrgBefore,
      after,
    };
  } else {
    report.control_org_verification = { skipped: true, reason: "no distinct control org" };
  }

  const avgLatency = latencies.length
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : null;
  const maxLatency = latencies.length ? Math.max(...latencies) : null;

  report.summary = {
    quality_gate_passed: gatePass,
    adapter_success: adapterSuccessCount,
    fallback_used: fallbackCount,
    empty_markdown_shown: emptyShown,
    provider_errors: providerErrors,
    total: report.generations.length,
    avg_latency_ms: avgLatency,
    max_latency_ms: maxLatency,
  };

  const orgTestOk =
    report.org_settings_test?.healthy === true &&
    report.org_llm_health?.healthy === true &&
    report.org_llm_settings?.model === ADAPTER_MODEL;

  const warehouseOk =
    warehouseResult === null ||
    (!warehouseResult.user_visible_output_empty &&
      (warehouseResult.adapter_result === "pass" ||
        (warehouseResult.fallback_triggered && warehouseResult.final_gate_passed)));

  const pass =
    report.health.adapter.healthy &&
    report.health.fallback.healthy &&
    orgTestOk &&
    gatePass >= 8 &&
    emptyShown === 0 &&
    providerErrors === 0 &&
    fallbackCount <= 2 &&
    warehouseOk &&
    controlOrgUnchanged;

  report.decision = pass ? "TEST_ORG_ADAPTER_INTEGRATION_PASS" : "TEST_ORG_ADAPTER_INTEGRATION_FAIL";
  report.warehouse_result = warehouseResult;

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(redactSecrets(err.message));
  process.exit(1);
});
