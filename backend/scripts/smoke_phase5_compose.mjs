/**
 * Phase 5 Compose stack smoke:
 * nginx LB → API health/metrics, Grafana health, optional MLC mock health.
 *
 * Prerequisites:
 *   make compose-up-full
 *   make migrate (against localhost postgres)
 *   go run ./scripts (seed roles)
 *
 * Usage: node ./scripts/smoke_phase5_compose.mjs
 */
const API_BASE = process.env.API_BASE || "http://127.0.0.1:8080";
const GRAFANA_BASE = process.env.GRAFANA_BASE || "http://127.0.0.1:3001";
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

async function get(url, expect = 200) {
  const res = await fetch(url);
  const text = await res.text();
  if (res.status !== expect) {
    throw new Error(`${url} -> ${res.status} ${text.slice(0, 200)}`);
  }
  return text;
}

try {
  await get(`${API_BASE}/health/live`);
  pass("nginx/api liveness");

  await get(`${API_BASE}/health/ready`);
  pass("nginx/api readiness");

  const metrics = await get(`${API_BASE}/metrics`);
  if (metrics.includes("llm_generation_total") || metrics.includes("llm_inflight")) {
    pass("prometheus metrics expose LLM instruments");
  } else {
    fail("prometheus metrics expose LLM instruments", "llm_* metrics not found yet");
  }

  await get(`${MLC_BASE}/health`);
  pass("mlc-llm mock health");

  await get(`${GRAFANA_BASE}/api/health`);
  pass("grafana health");

  const lokiBase = process.env.LOKI_BASE || "http://127.0.0.1:3100";
  await get(`${lokiBase}/ready`);
  pass("loki ready");
} catch (err) {
  fail("smoke", err.message);
}

const failed = results.filter((r) => r.status === "FAIL");
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
