/**
 * Sync Ollama LLM_BASE_URL (and optional LLM_API_KEY) from local .env to Render.
 * Run ONLY after verify_ollama_endpoint.mjs passes.
 *
 * Usage (from backend/):
 *   node ./scripts/verify_ollama_endpoint.mjs && node ./scripts/sync_render_llm_ollama.mjs
 *
 * Required in backend/.env or environment:
 *   RENDER_API_KEY
 *   OLLAMA_BASE_URL or LLM_BASE_URL  (https://.../v1)
 *
 * Optional:
 *   OLLAMA_BEARER_TOKEN or LLM_API_KEY (Ollama proxy Bearer; skips HF keys)
 *   RENDER_SERVICE_NAME=agentic-app-reporter-api
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
const fileEnv = loadEnv(envPath);

const renderKey = (process.env.RENDER_API_KEY || fileEnv.RENDER_API_KEY || "").trim();
const serviceName = process.env.RENDER_SERVICE_NAME || "agentic-app-reporter-api";
const serviceIdOverride = process.env.RENDER_SERVICE_ID?.trim();

const baseURL = normalizeBase(
  process.env.OLLAMA_BASE_URL ||
    process.env.LLM_BASE_URL ||
    fileEnv.OLLAMA_BASE_URL ||
    fileEnv.LLM_BASE_URL ||
    "",
);

const llmApiKey = (
  process.env.OLLAMA_BEARER_TOKEN ||
  process.env.LLM_API_KEY ||
  fileEnv.OLLAMA_BEARER_TOKEN ||
  fileEnv.LLM_API_KEY ||
  ""
).trim();

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

function normalizeBase(url) {
  return String(url || "")
    .trim()
    .replace(/\/$/, "");
}

function hostOnly(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "[invalid]";
  }
}

function rejectHuggingFaceHost(url) {
  let host;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    throw new Error("LLM_BASE_URL is not a valid URL");
  }
  if (host === "router.huggingface.co" || host.endsWith(".huggingface.co")) {
    throw new Error(
      "LLM_BASE_URL points at Hugging Face — set OLLAMA_BASE_URL to your Ollama VPS /v1 endpoint",
    );
  }
}

if (!renderKey) {
  console.error("RENDER_API_KEY is required in backend/.env or environment");
  process.exit(1);
}

if (!baseURL) {
  console.error("OLLAMA_BASE_URL or LLM_BASE_URL is required (https://your-domain/v1)");
  process.exit(1);
}

if (!baseURL.startsWith("https://") || !baseURL.endsWith("/v1")) {
  console.error("Base URL must be https://<domain>/v1");
  process.exit(1);
}

try {
  rejectHuggingFaceHost(baseURL);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

console.log("Pre-flight: verify_ollama_endpoint.mjs");
const verify = spawnSync(process.execPath, [path.join(__dirname, "verify_ollama_endpoint.mjs")], {
  cwd: path.join(__dirname, ".."),
  env: {
    ...process.env,
    OLLAMA_BASE_URL: baseURL,
    LLM_BASE_URL: baseURL,
    OLLAMA_BEARER_TOKEN: llmApiKey,
    LLM_API_KEY: llmApiKey,
  },
  stdio: "inherit",
});
if (verify.status !== 0) {
  console.error("Aborting Render sync — endpoint verification failed");
  process.exit(verify.status || 1);
}

async function renderFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${renderKey}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${options.method || "GET"} ${url} -> ${res.status} ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

let serviceId = serviceIdOverride;
if (!serviceId) {
  const list = await renderFetch("https://api.render.com/v1/services?limit=100");
  const match = list.find((row) => row?.service?.name === serviceName || row?.name === serviceName);
  serviceId = match?.service?.id || match?.id;
  if (!serviceId) {
    console.error(`Render service not found: ${serviceName}`);
    process.exit(1);
  }
}

console.log("Updating Render LLM_BASE_URL host:", hostOnly(baseURL));
await renderFetch(`https://api.render.com/v1/services/${serviceId}/env-vars/LLM_BASE_URL`, {
  method: "PUT",
  body: JSON.stringify({ value: baseURL }),
});

if (llmApiKey && !llmApiKey.startsWith("hf_")) {
  console.log("Updating Render LLM_API_KEY: [set]");
  await renderFetch(`https://api.render.com/v1/services/${serviceId}/env-vars/LLM_API_KEY`, {
    method: "PUT",
    body: JSON.stringify({ value: llmApiKey }),
  });
} else if (llmApiKey.startsWith("hf_")) {
  console.warn("Skipping LLM_API_KEY sync — value looks like Hugging Face token");
  console.warn("Set OLLAMA_BEARER_TOKEN to your Caddy/Nginx shared secret");
} else {
  console.log("LLM_API_KEY not set — skipping (only if proxy has no Bearer auth)");
}

const deploy = await renderFetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
  method: "POST",
  body: JSON.stringify({ clearCache: "do_not_clear" }),
});

const deployId = deploy?.id || deploy?.deploy?.id || "(unknown)";
console.log("OK: Render LLM_BASE_URL updated; deploy triggered:", deployId);
console.log("After deploy: node ./scripts/diagnose_production_generate.mjs");
