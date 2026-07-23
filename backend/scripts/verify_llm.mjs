/**
 * Verify Hugging Face / OpenAI-compatible LLM wiring (reads backend/.env locally).
 * Usage (from backend/): node ./scripts/verify_llm.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");

function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i <= 0) continue;
    out[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
  }
  return out;
}

// Prefer backend/.env for LLM_* so stale shell exports (e.g. LLM_PROVIDER=mock) do not mask local config.
const fileEnv = loadEnv(envPath);
const env = { ...process.env, ...fileEnv };
for (const key of Object.keys(fileEnv)) {
  if (key.startsWith("LLM_")) {
    env[key] = fileEnv[key];
  }
}
const base = (env.LLM_BASE_URL || "").replace(/\/$/, "");
const key = env.LLM_API_KEY || "";
const model = env.LLM_MODEL || "";
const api = process.env.API_BASE || "http://localhost:8080/api/v1";

console.log("LLM_PROVIDER:", env.LLM_PROVIDER || "(unset)");
console.log("LLM_BASE_URL:", base || "(unset)");
console.log("LLM_MODEL:", model || "(unset)");
console.log("LLM_API_KEY:", key ? `${key.slice(0, 7)}…` : "(unset)");

let failed = 0;

async function step(name, fn) {
  try {
    await fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL  ${name} — ${err.message}`);
  }
}

await step("HF GET /models", async () => {
  if (!base || !key) throw new Error("LLM_BASE_URL and LLM_API_KEY required");
  const res = await fetch(`${base}/models`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
});

await step("HF chat completion", async () => {
  if (!base || !key || !model) throw new Error("LLM_BASE_URL, LLM_API_KEY, LLM_MODEL required");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      max_tokens: 16,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${text.slice(0, 200)}`);
  const data = JSON.parse(text);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("empty completion");
  console.log(`      sample: ${String(content).slice(0, 80)}`);
});

await step("API /llm/health (authenticated)", async () => {
  const ts = Date.now();
  const email = `llm_verify_${ts}@example.com`;
  const password = "SmokeTest123!";
  const reg = await fetch(`${api}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, first_name: "LLM", last_name: "Verify" }),
  });
  if (!reg.ok && reg.status !== 409) throw new Error(`register ${reg.status}`);

  const login = await fetch(`${api}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginData = await login.json();
  if (!login.ok) throw new Error(`login ${login.status}`);

  const org = await fetch(`${api}/organizations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${loginData.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "LLM Verify Org", slug: `llmv${String(ts).slice(-6)}` }),
  });
  const orgData = await org.json();
  if (!org.ok) throw new Error(`org ${org.status}`);

  const health = await fetch(`${api}/llm/health`, {
    headers: {
      Authorization: `Bearer ${loginData.token}`,
      "X-Organization-ID": orgData.id,
    },
  });
  const healthData = await health.json();
  if (!health.ok) throw new Error(`health ${health.status} ${JSON.stringify(healthData)}`);
  if (!healthData.healthy || healthData.provider !== "gemma") {
    throw new Error(JSON.stringify(healthData));
  }
  console.log(`      provider=${healthData.provider} message=${healthData.message}`);
});

console.log("");
console.log(failed === 0 ? "All LLM checks passed." : `${failed} check(s) failed.`);
process.exit(failed > 0 ? 1 : 0);
