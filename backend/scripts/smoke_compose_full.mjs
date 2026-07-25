/**
 * Full Compose integration smoke — services, health, API flows, observe, monitoring.
 *
 * Prerequisites:
 *   docker compose -f deployments/docker-compose.yml --profile stack up -d --build
 *   goose migrate + go run ./scripts (seed)
 *   Frontend (optional): npm run dev in frontend/ on :3000
 *
 * Usage (from backend/):
 *   node ./scripts/smoke_compose_full.mjs
 */
const API_BASE = process.env.API_BASE || "http://127.0.0.1:8080";
const API_V1 = `${API_BASE.replace(/\/$/, "")}/api/v1`;
const MLC_BASE = process.env.MLC_BASE || "http://127.0.0.1:8081";
const FRONTEND_BASE = process.env.FRONTEND_BASE || "http://127.0.0.1:3000";
const GRAFANA_BASE = process.env.GRAFANA_BASE || "http://127.0.0.1:3001";
const PROMETHEUS_BASE = process.env.PROMETHEUS_BASE || "http://127.0.0.1:9090";
const LOKI_BASE = process.env.LOKI_BASE || "http://127.0.0.1:3100";

const report = {
  startedAt: new Date().toISOString(),
  checks: [],
  fixes: [],
  composeChanges: [],
  documentGeneration: null,
  gaps: [],
};

function record(name, status, detail = "") {
  report.checks.push({ name, status, detail });
  const tag = status === "PASS" ? "PASS" : status === "SKIP" ? "SKIP" : "FAIL";
  console.log(`${tag}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function get(url, expect = 200) {
  const res = await fetch(url);
  const text = await res.text();
  if (res.status !== expect) {
    throw new Error(`${url} -> ${res.status} ${text.slice(0, 300)}`);
  }
  return text;
}

async function api(method, path, { token, orgId, workspaceId, body, expect } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (orgId) headers["X-Organization-ID"] = orgId;
  if (workspaceId) headers["X-Workspace-ID"] = workspaceId;
  const res = await fetch(`${API_V1}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  const expected = expect ?? [200, 201];
  if (!expected.includes(res.status)) {
    throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 300)}`);
  }
  return { data, status: res.status };
}

// --- Infrastructure probes ---
try {
  await get(`${API_BASE}/health/live`);
  record("Backend /health/live", "PASS");
} catch (e) {
  record("Backend /health/live", "FAIL", e.message);
}

try {
  const ready = await fetch(`${API_BASE}/health/ready`);
  const body = await ready.json();
  if (ready.ok && body.status === "ready") {
    record("Backend /health/ready", "PASS", JSON.stringify(body.services || {}));
  } else {
    record("Backend /health/ready", "FAIL", JSON.stringify(body));
  }
} catch (e) {
  record("Backend /health/ready", "FAIL", e.message);
}

try {
  await get(`${MLC_BASE}/v1/models`);
  record("MLC runtime GET /v1/models", "PASS", MLC_BASE);
} catch (e) {
  record("MLC runtime GET /v1/models", "FAIL", e.message);
}

try {
  const res = await fetch(FRONTEND_BASE, { signal: AbortSignal.timeout(15000) });
  if (res.ok) record("Frontend HTTP", "PASS", `${FRONTEND_BASE} ${res.status}`);
  else record("Frontend HTTP", "FAIL", `status ${res.status}`);
} catch (e) {
  record("Frontend HTTP", "SKIP", `not in Compose — ${e.message}`);
  report.gaps.push("Frontend runs outside Docker Compose (npm run dev on :3000)");
}

try {
  await get(`${GRAFANA_BASE}/api/health`);
  record("Grafana /api/health", "PASS", GRAFANA_BASE);
} catch (e) {
  record("Grafana /api/health", "FAIL", e.message);
}

try {
  await get(`${PROMETHEUS_BASE}/-/ready`);
  record("Prometheus /-/ready", "PASS", PROMETHEUS_BASE);
} catch (e) {
  record("Prometheus /-/ready", "FAIL", e.message);
}

try {
  await get(`${LOKI_BASE}/ready`);
  record("Loki /ready", "PASS", LOKI_BASE);
} catch (e) {
  record("Loki /ready", "FAIL", e.message);
}

// --- E2E: auth → generate → observe ---
const ts = Date.now();
const email = `compose_full_${ts}@example.com`;
const password = "SmokeTest123!";
let workspaceId = "";
let orgId = "";
let docId = "";

try {
  await api("POST", "/auth/register", {
    body: { email, password, first_name: "Compose", last_name: "Full" },
    expect: [201, 409],
  });
  const login = await api("POST", "/auth/login", { body: { email, password } });
  const token = login.data.token;
  record("Auth register/login", "PASS", email);

  const org = await api("POST", "/organizations", {
    token,
    body: { name: "Compose Smoke Org", slug: `csm${String(ts).slice(-6)}` },
  });
  orgId = org.data.id;

  const ws = await api("POST", `/organizations/${orgId}/workspaces`, {
    token,
    orgId,
    body: { name: "Compose WS", slug: "composesmoke", description: "full smoke" },
  });
  workspaceId = ws.data.id;
  record("Org + workspace", "PASS", workspaceId);

  const health = await api("GET", "/llm/health", { token, orgId });
  if (health.data?.healthy && health.data?.provider === "gemma") {
    record("Backend → MLC /llm/health", "PASS", JSON.stringify(health.data));
  } else {
    record("Backend → MLC /llm/health", "FAIL", JSON.stringify(health.data));
  }

  const gen = await api("POST", `/workspaces/${workspaceId}/documents/generate`, {
    token,
    orgId,
    workspaceId,
    body: { title: "Compose Smoke Doc", language: "tr" },
    expect: [201],
  });
  const doc = gen.data;
  docId = doc?.id;
  if (doc?.status === "succeeded" && doc?.markdown_body?.length > 0 && doc?.provider_name === "gemma") {
    report.documentGeneration = {
      success: true,
      id: docId,
      provider: doc.provider_name,
      model: doc.model_name,
      bodyPreview: String(doc.markdown_body).slice(0, 120),
    };
    record("Document generation", "PASS", `id=${docId} bytes=${doc.markdown_body.length}`);
  } else {
    report.documentGeneration = { success: false, raw: doc };
    record("Document generation", "FAIL", JSON.stringify(doc));
  }

  const readiness = await api("GET", `/workspaces/${workspaceId}/readiness`, {
    token,
    orgId,
    workspaceId,
  });
  if (typeof readiness.data?.overall === "number") {
    record("Observe /readiness", "PASS", `overall=${readiness.data.overall}`);
  } else {
    record("Observe /readiness", "FAIL", JSON.stringify(readiness.data));
  }

  const summary = await api("GET", `/workspaces/${workspaceId}/observe/summary`, {
    token,
    orgId,
    workspaceId,
  });
  if (summary.data?.totals && Array.isArray(summary.data?.recent)) {
    record("Observe /observe/summary", "PASS", `succeeded=${summary.data.totals.succeeded}`);
  } else {
    record("Observe /observe/summary", "FAIL", JSON.stringify(summary.data));
  }

  const metrics = await get(`${API_BASE}/metrics`);
  const llmMetrics = ["llm_generation_total", "llm_provider_health"].filter((m) =>
    metrics.includes(m),
  );
  if (llmMetrics.length >= 2) {
    record("Prometheus LLM metrics on API", "PASS", llmMetrics.join(", "));
  } else {
    record("Prometheus LLM metrics on API", "FAIL", "missing llm_* metrics");
  }
} catch (e) {
  record("E2E flow", "FAIL", e.message);
}

const failed = report.checks.filter((c) => c.status === "FAIL");
const passed = report.checks.filter((c) => c.status === "PASS");
const skipped = report.checks.filter((c) => c.status === "SKIP");

report.summary = {
  pass: passed.length,
  fail: failed.length,
  skip: skipped.length,
  success: failed.length === 0,
};

console.log("\n=== COMPOSE SMOKE SUMMARY ===");
console.log(`${passed.length} PASS / ${failed.length} FAIL / ${skipped.length} SKIP`);
console.log(`Document generation: ${report.documentGeneration?.success ? "YES" : "NO"}`);
console.log(`Overall: ${report.summary.success ? "SUCCESS" : "FAILED"}`);

process.exit(failed.length > 0 ? 1 : 0);
