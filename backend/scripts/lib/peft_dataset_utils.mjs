/** Shared utilities for PEFT dataset generation (no smoke markers). */

import { runQualityGate, shouldApproveDocument } from "./peft_quality_gate.mjs";

export { runQualityGate, shouldApproveDocument };

export const DATASET_SOURCE_TAG = "dataset_source=generated_scenario_v1";
export const SCENARIO_KEY_PREFIX = "dataset_scenario_key=";

export const FORBIDDEN_MARKERS = [
  "[[PEFT_SMOKE_TEST]]",
  "smokepeft",
  "PEFT Smoke Org",
  "PEFT Smoke Batch",
  "PEFT Smoke WS",
];

export const DEFAULT_MIN_QUALITY = 80;
export const RETRYABLE_STATUSES = new Set([429, 502, 503]);
export const NO_RETRY_STATUSES = new Set([400, 401, 403, 404]);

export function parseArgs(argv) {
  const args = {
    orgId: "",
    count: 30,
    provider: "ollama",
    baseUrl: "",
    model: "",
    email: "",
    password: "",
    apiKey: "",
    scenarioFile: "",
    startIndex: 1,
    language: "tr",
    approve: false,
    dryRun: false,
    continueOnError: true,
    allowMock: false,
    force: false,
    debug: false,
    scenarioKeys: "",
    reuseWorkspace: false,
    outputReport: "./peft-generation-report.json",
  };

  for (const arg of argv) {
    if (arg === "--approve") args.approve = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--continue-on-error") args.continueOnError = true;
    else if (arg === "--no-continue-on-error") args.continueOnError = false;
    else if (arg === "--allow-mock") args.allowMock = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--debug") args.debug = true;
    else if (arg.startsWith("--scenario-keys=")) args.scenarioKeys = arg.slice(16).trim();
    else if (arg === "--reuse-workspace") args.reuseWorkspace = true;
    else if (arg.startsWith("--org-id=")) args.orgId = arg.slice(9).trim();
    else if (arg.startsWith("--count=")) args.count = Number(arg.slice(8));
    else if (arg.startsWith("--provider=")) args.provider = arg.slice(11).trim();
    else if (arg.startsWith("--base-url=")) args.baseUrl = arg.slice(11).trim();
    else if (arg.startsWith("--model=")) args.model = arg.slice(8).trim();
    else if (arg.startsWith("--email=")) args.email = arg.slice(8).trim();
    else if (arg.startsWith("--password=")) args.password = arg.slice(11).trim();
    else if (arg.startsWith("--api-key=")) args.apiKey = arg.slice(10).trim();
    else if (arg.startsWith("--scenario-file=")) args.scenarioFile = arg.slice(16).trim();
    else if (arg.startsWith("--start-index=")) args.startIndex = Number(arg.slice(14));
    else if (arg.startsWith("--language=")) args.language = arg.slice(11).trim();
    else if (arg.startsWith("--output-report=")) args.outputReport = arg.slice(16).trim();
  }

  if (!args.email) args.email = process.env.PEFT_DATASET_EMAIL || "";
  if (!args.password) args.password = process.env.PEFT_DATASET_PASSWORD || "";
  if (!args.apiKey) {
    args.apiKey = process.env.PEFT_DATASET_API_KEY || "";
  }
  if (!args.apiKey && !args.email && !args.password) {
    args.apiKey = process.env.ADCS_API_KEY || "";
  }
  if (!args.baseUrl) {
    args.baseUrl =
      process.env.PEFT_DATASET_BASE_URL ||
      process.env.LLM_BASE_URL ||
      process.env.OLLAMA_BASE_URL ||
      "";
  }
  if (!args.model) {
    args.model = process.env.PEFT_DATASET_MODEL || process.env.LLM_MODEL || "";
  }
  if (args.provider === "ollama") {
    if (!args.baseUrl) args.baseUrl = "http://127.0.0.1:11434/v1";
    if (!args.model) args.model = "llama3.2:latest";
  }

  return args;
}

export function validateArgs(args) {
  if (!args.orgId) {
    throw new Error("--org-id is required");
  }
  const scenarioKeyList = parseScenarioKeys(args.scenarioKeys);
  if (scenarioKeyList.length) {
    args.scenarioKeyList = scenarioKeyList;
    return;
  }
  if (!Number.isFinite(args.count) || args.count < 1) {
    throw new Error("--count must be a positive integer");
  }
  if (!Number.isFinite(args.startIndex) || args.startIndex < 1) {
    throw new Error("--start-index must be >= 1");
  }
}

export function parseScenarioKeys(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function containsForbiddenMarker(text) {
  const hay = String(text || "").toLowerCase();
  return FORBIDDEN_MARKERS.some((m) => hay.includes(m.toLowerCase()));
}

export function buildWorkspaceSlug(timestamp, index) {
  return `peftdata${timestamp}${index}`;
}

export function isAlphanumericSlug(slug) {
  return /^[a-zA-Z0-9]+$/.test(slug);
}

export function buildWorkspaceDescription(scenarioKey) {
  return `${DATASET_SOURCE_TAG} ${SCENARIO_KEY_PREFIX}${scenarioKey}`;
}

export function parseScenarioKeyFromDescription(description) {
  const match = String(description || "").match(/dataset_scenario_key=([a-z0-9-]+)/i);
  return match ? match[1] : null;
}

export function findExistingScenarioWorkspace(workspaces, scenarioKey) {
  return (workspaces || []).find(
    (ws) => parseScenarioKeyFromDescription(ws.description) === scenarioKey,
  );
}

export function assertMockAllowed(provider, allowMock) {
  if (provider === "mock" && !allowMock) {
    throw new Error(
      "mock provider detected — use --allow-mock for technical trials only, not real dataset generation",
    );
  }
}

export function assessDocumentQuality(doc, { lang = "tr" } = {}) {
  const errors = [];
  const warnings = [];
  const body = doc?.markdown_body || "";

  if (doc?.status !== "succeeded") errors.push(`status=${doc?.status}`);
  if (doc?.document_type !== "product_spec") errors.push(`document_type=${doc?.document_type}`);
  if (!body.trim()) errors.push("empty markdown body");
  if (containsForbiddenMarker(body)) errors.push("forbidden smoke marker in assistant body");

  const q = doc?.quality || {};
  if (q.quality_score < DEFAULT_MIN_QUALITY) {
    errors.push(`quality_score=${q.quality_score} below ${DEFAULT_MIN_QUALITY}`);
  }
  if (q.section_coverage_ok === false) errors.push("section_coverage not OK");
  if (!doc?.source_fingerprint) warnings.push("missing source_fingerprint");
  if (body.length > 0 && body.length < 200) errors.push("assistant body too short");

  const gate = runQualityGate(body, {
    lang,
    structuredMeta: doc?.structured_generation || null,
  });
  if (!gate.quality_gate_passed) {
    errors.push(...gate.quality_gate_reasons.map((r) => `quality_gate:${r}`));
  }
  warnings.push(...(gate.warnings || []));

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    quality_score: q.quality_score ?? 0,
    quality_gate: gate,
    approve_eligible: shouldApproveDocument(doc, gate),
  };
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry(fn, { maxRetries = 2 } = {}) {
  let attempt = 0;
  let lastErr;
  while (attempt <= maxRetries) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      const status = err.status || err.statusCode;
      if (NO_RETRY_STATUSES.has(status)) throw err;
      if (!RETRYABLE_STATUSES.has(status) && !/timeout/i.test(String(err.message))) {
        throw err;
      }
      if (attempt >= maxRetries) break;
      const delay = 500 * 2 ** attempt;
      await sleep(delay);
      attempt += 1;
    }
  }
  throw lastErr;
}

export function redactSecrets(text) {
  return String(text || "")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/hf_[a-zA-Z0-9]+/g, "hf_[REDACTED]")
    .replace(/sk-[a-zA-Z0-9]+/g, "sk-[REDACTED]");
}
