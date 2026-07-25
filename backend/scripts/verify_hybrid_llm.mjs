/**
 * Hybrid LLM verification — picks checks from backend/.env LLM_PROVIDER.
 *
 * Usage (from backend/):
 *   node ./scripts/verify_hybrid_llm.mjs
 *
 * Modes:
 *   mock  — skips external LLM; probes API /llm/health when API is up
 *   gemma + localhost — MLC/mock container (no API key required)
 *   gemma + remote URL — HF or Render external (API key required)
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

const fileEnv = loadEnv(envPath);
const env = { ...process.env, ...fileEnv };
for (const key of Object.keys(fileEnv)) {
  if (key.startsWith("LLM_")) env[key] = fileEnv[key];
}

const provider = (env.LLM_PROVIDER || "mock").toLowerCase();
const base = (env.LLM_BASE_URL || "").replace(/\/$/, "");
const key = env.LLM_API_KEY || "";
const model = env.LLM_MODEL || "";
const api = (process.env.API_BASE || "http://localhost:8080/api/v1").replace(/\/$/, "");

const isLocalBase =
  base.includes("127.0.0.1") || base.includes("localhost") || base.includes("mlc-llm:");

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

async function stepOptional(name, fn) {
  try {
    await fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    console.log(`SKIP  ${name} — ${err.message}`);
  }
}

console.log("Hybrid LLM verify");
console.log("  LLM_PROVIDER:", provider);
console.log("  LLM_BASE_URL:", base || "(unset)");
console.log("  LLM_MODEL:", model || "(unset)");
console.log("");

if (provider === "mock") {
  console.log("Mode A — in-process mock (no external LLM probe)");
  await stepOptional("mock — external endpoint skipped", async () => {
    if (base) throw new Error("LLM_BASE_URL set but provider is mock");
  });
} else if (provider === "gemma") {
  if (!base) {
    await step("gemma requires LLM_BASE_URL", async () => {
      throw new Error("LLM_BASE_URL is empty");
    });
  } else if (isLocalBase) {
    console.log("Mode C/D — local OpenAI-compatible endpoint");
    const mlcBase = base.replace(/\/v1$/, "");
    await stepOptional("GET /health (mock-llm only)", async () => {
      const res = await fetch(`${mlcBase}/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    });
    await step("GET /v1/models", async () => {
      const res = await fetch(`${base}/models`);
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status} ${text.slice(0, 200)}`);
    });
    await step("POST /v1/chat/completions", async () => {
      const useModel = model || "mock-mlc-model";
      const headers = { "Content-Type": "application/json" };
      if (key) headers.Authorization = `Bearer ${key}`;
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: useModel,
          messages: [{ role: "user", content: "Reply with exactly: OK" }],
          max_tokens: 32,
        }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status} ${text.slice(0, 200)}`);
      const data = JSON.parse(text);
      if (!data?.choices?.[0]?.message?.content) throw new Error("empty completion");
    });
  } else {
    console.log("Mode B/E — remote OpenAI-compatible endpoint");
    await step("GET /v1/models", async () => {
      if (!key) throw new Error("LLM_API_KEY required for remote endpoint");
      const res = await fetch(`${base}/models`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    });
    await step("POST /v1/chat/completions", async () => {
      if (!key || !model) throw new Error("LLM_API_KEY and LLM_MODEL required");
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
      if (!data?.choices?.[0]?.message?.content) throw new Error("empty completion");
    });
  }
} else {
  await step("known LLM_PROVIDER", async () => {
    throw new Error(`unsupported provider ${provider}`);
  });
}

await stepOptional("API GET /llm/health", async () => {
  const live = await fetch(`${api.replace(/\/api\/v1$/, "")}/health/live`);
  if (!live.ok) throw new Error("API not running");

  const ts = Date.now();
  const email = `hybrid_${ts}@example.com`;
  const password = "SmokeTest123!";
  const reg = await fetch(`${api}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, first_name: "Hybrid", last_name: "Verify" }),
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
    body: JSON.stringify({ name: "Hybrid Org", slug: `hyb${String(ts).slice(-6)}` }),
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
  if (!health.ok) throw new Error(`health ${health.status}`);
  if (!healthData.healthy) throw new Error(JSON.stringify(healthData));
  const expectedProvider = provider === "mock" ? "mock" : "gemma";
  if (healthData.provider !== expectedProvider) {
    throw new Error(`expected provider ${expectedProvider}, got ${JSON.stringify(healthData)}`);
  }
  console.log(`      provider=${healthData.provider} message=${healthData.message}`);
});

console.log("");
console.log(failed === 0 ? "Hybrid LLM checks passed." : `${failed} check(s) failed.`);
process.exit(failed > 0 ? 1 : 0);
