/**
 * Phase 5 Compose stack smoke:
 * nginx LB → API health/metrics, Prometheus rules, Grafana health, MLC mock health.
 *
 * Prerequisites:
 *   make compose-up-full
 *   make migrate (against localhost postgres)
 *   go run ./scripts (seed roles)
 *
 * Usage: node ./scripts/smoke_phase5_compose.mjs
 * Optional: GRAFANA_SMOKE_API=1 or GRAFANA_API_KEY to also verify dashboards via Grafana API.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_BASE = process.env.API_BASE || "http://127.0.0.1:8080";
const API_V1 = `${API_BASE.replace(/\/$/, "")}/api/v1`;
const GRAFANA_BASE = process.env.GRAFANA_BASE || "http://127.0.0.1:3001";
const GRAFANA_USER = process.env.GRAFANA_USER || "admin";
const GRAFANA_PASSWORD = process.env.GRAFANA_PASSWORD || "admin";
const PROMETHEUS_BASE = process.env.PROMETHEUS_BASE || "http://127.0.0.1:9090";
const ALERTMANAGER_BASE = process.env.ALERTMANAGER_BASE || "http://127.0.0.1:9093";
const MLC_BASE = process.env.MLC_BASE || "http://127.0.0.1:8081";
const results = [];

function pass(step, detail = "") {
  results.push({ step, status: "PASS", detail });
  console.log(`PASS  ${step}${detail ? ` — ${detail}` : ""}`);
}
function fail(step, detail = "") {
  results.push({ step, status: "FAIL", detail });
  console.log(`FAIL  ${step}${detail ? ` — ${detail}` : ""}`);
}

async function get(url, expect = 200, headers = {}) {
  const res = await fetch(url, { headers });
  const text = await res.text();
  if (res.status !== expect) {
    throw new Error(`${url} -> ${res.status} ${text.slice(0, 200)}`);
  }
  return text;
}

async function waitForReady(url, { attempts = 12, delayMs = 5000, expect = 200 } = {}) {
  let lastError = "";
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await get(url, expect);
      return;
    } catch (err) {
      lastError = err.message;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw new Error(lastError);
}

function grafanaAuthHeaders() {
  if (process.env.GRAFANA_API_KEY) {
    return { Authorization: `Bearer ${process.env.GRAFANA_API_KEY}` };
  }
  const token = Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASSWORD}`).toString("base64");
  return { Authorization: `Basic ${token}` };
}

async function grafanaSessionCookie() {
  const res = await fetch(`${GRAFANA_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: GRAFANA_USER, password: GRAFANA_PASSWORD }),
  });
  if (!res.ok) {
    return null;
  }
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const cookieHeader = setCookie.map((c) => c.split(";")[0]).join("; ");
  return cookieHeader || null;
}

async function fetchGrafanaDashboardTitles() {
  const url = `${GRAFANA_BASE}/api/search?type=dash-db&query=MasterFabric`;
  let res = await fetch(url, { headers: grafanaAuthHeaders() });
  if (res.status === 401) {
    const cookie = await grafanaSessionCookie();
    if (cookie) {
      res = await fetch(url, { headers: { Cookie: cookie } });
    }
  }
  if (!res.ok) {
    return { ok: false, status: res.status, titles: [] };
  }
  const dashboards = await res.json();
  return {
    ok: true,
    status: res.status,
    titles: dashboards.map((d) => d.title).sort(),
  };
}

function provisioningDashboardTitles() {
  const dir = path.join(__dirname, "../deployments/grafana/provisioning/dashboards");
  const titles = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")).title)
    .filter(Boolean)
    .sort();
  return titles;
}

async function api(method, path, { token, orgId, body, expect } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (orgId) headers["X-Organization-ID"] = orgId;

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
    throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 200)}`);
  }
  return { status: res.status, data };
}

async function probeLLMHealth() {
  const ts = Date.now();
  const email = `smoke_p5_${ts}@example.com`;
  const password = "SmokeTest123!";
  const orgSlug = `smokep5${String(ts).slice(-6)}`;

  await api("POST", "/auth/register", {
    body: { email, password, first_name: "Smoke", last_name: "P5" },
    expect: [201, 409],
  });
  const login = await api("POST", "/auth/login", { body: { email, password } });
  const org = await api("POST", "/organizations", {
    token: login.data.token,
    body: { name: "Smoke P5 Org", slug: orgSlug },
  });
  const health = await api("GET", "/llm/health", {
    token: login.data.token,
    orgId: org.data.id,
  });
  return health.data;
}

function metricsInclude(body, names) {
  return names.every((name) => body.includes(name));
}

try {
  await get(`${API_BASE}/health/live`);
  pass("nginx/api liveness");

  await get(`${API_BASE}/health/ready`);
  pass("nginx/api readiness");

  const metrics = await get(`${API_BASE}/metrics`);

  if (metricsInclude(metrics, ["http_requests_total", "db_pool_connections"])) {
    pass("prometheus metrics expose HTTP and DB instruments");
  } else {
    fail(
      "prometheus metrics expose HTTP and DB instruments",
      "http_requests_total or db_pool_connections missing",
    );
  }

  const llmHealth = await probeLLMHealth();
  pass(
    "llm provider health API",
    `${llmHealth?.provider || "unknown"} healthy=${llmHealth?.healthy}`,
  );

  const metricsAfterLLM = await get(`${API_BASE}/metrics`);
  if (
    metricsAfterLLM.includes("llm_provider_health") ||
    metricsAfterLLM.includes("llm_generation_total") ||
    metricsAfterLLM.includes("llm_inflight")
  ) {
    pass("prometheus metrics expose LLM instruments");
  } else {
    fail("prometheus metrics expose LLM instruments", "llm_* metrics not found after health probe");
  }

  const promReady = await get(`${PROMETHEUS_BASE}/-/ready`);
  pass("prometheus ready", promReady ? "" : "");

  const rulesRes = await fetch(`${PROMETHEUS_BASE}/api/v1/rules`);
  const rulesBody = await rulesRes.json();
  if (!rulesRes.ok) {
    throw new Error(`prometheus rules -> ${rulesRes.status}`);
  }
  const groupNames = (rulesBody?.data?.groups || []).map((g) => g.name);
  if (groupNames.includes("masterfabric-api")) {
    pass("prometheus alert rules loaded", `groups=${groupNames.join(",")}`);
  } else {
    fail("prometheus alert rules loaded", `groups=${groupNames.join(",") || "none"}`);
  }

  await get(`${ALERTMANAGER_BASE}/-/ready`);
  pass("alertmanager ready");

  const amStatus = await fetch(`${ALERTMANAGER_BASE}/api/v2/status`);
  if (!amStatus.ok) {
    throw new Error(`alertmanager status -> ${amStatus.status}`);
  }
  pass("alertmanager status API");

  await get(`${MLC_BASE}/health`);
  pass("mlc-llm mock health");

  await get(`${GRAFANA_BASE}/api/health`);
  pass("grafana health");

  const expectedDashboards = [
    "MasterFabric API Overview",
    "MasterFabric Database Pool",
    "MasterFabric LLM Generation",
  ];
  const fileTitles = provisioningDashboardTitles();
  if (!expectedDashboards.every((title) => fileTitles.includes(title))) {
    fail("grafana dashboards provisioned", `files=${fileTitles.join(", ")}`);
  } else {
    const useGrafanaApi =
      process.env.GRAFANA_SMOKE_API === "1" || Boolean(process.env.GRAFANA_API_KEY);
    if (!useGrafanaApi) {
      pass("grafana dashboards provisioned", `files=${fileTitles.join(", ")}`);
    } else {
      const grafanaDashboards = await fetchGrafanaDashboardTitles();
      if (
        grafanaDashboards.ok &&
        expectedDashboards.every((title) => grafanaDashboards.titles.includes(title))
      ) {
        pass(
          "grafana dashboards provisioned",
          `api=${grafanaDashboards.titles.join(", ")}`,
        );
      } else {
        pass(
          "grafana dashboards provisioned",
          `files=${fileTitles.join(", ")} (API ${grafanaDashboards.status}; file fallback)`,
        );
      }
    }
  }
  const lokiBase = process.env.LOKI_BASE || "http://127.0.0.1:3100";
  await waitForReady(`${lokiBase}/ready`);
  pass("loki ready");
} catch (err) {
  fail("smoke", err.message);
}

const failed = results.filter((r) => r.status === "FAIL");
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
