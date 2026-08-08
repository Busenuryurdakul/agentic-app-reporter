/**
 * Sync LLM_MODEL (and optional LLM_PROVIDER) from backend/.env to Render.
 *
 * Usage (from backend/):
 *   node ./scripts/sync_render_llm_model.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
const fileEnv = loadEnv(envPath);
const renderKey = (process.env.RENDER_API_KEY || fileEnv.RENDER_API_KEY || "").trim();
const serviceName = process.env.RENDER_SERVICE_NAME || "agentic-app-reporter-api";

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

if (!renderKey) {
  console.error("RENDER_API_KEY is required");
  process.exit(1);
}

const llmModel = (fileEnv.LLM_MODEL || process.env.LLM_MODEL || "").trim();
if (!llmModel) {
  console.error("LLM_MODEL not found in backend/.env");
  process.exit(1);
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
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${options.method || "GET"} ${url} -> ${res.status} ${text}`);
  }
  return data;
}

const list = await renderFetch("https://api.render.com/v1/services?limit=100");
const match = list.find((row) => row?.service?.name === serviceName || row?.name === serviceName);
const serviceId = match?.service?.id || match?.id;
if (!serviceId) {
  console.error(`Render service not found: ${serviceName}`);
  process.exit(1);
}

const envVars = await renderFetch(`https://api.render.com/v1/services/${serviceId}/env-vars?limit=100`);
const current = envVars.find((row) => (row.envVar?.key || row.key) === "LLM_MODEL");
const currentValue = current?.envVar?.value || current?.value || "";
console.log(`Current LLM_MODEL: ${currentValue || "(unset)"}`);
console.log(`Target LLM_MODEL:  ${llmModel}`);

if (currentValue === llmModel) {
  console.log("LLM_MODEL already matches; skipping update.");
  process.exit(0);
}

await renderFetch(`https://api.render.com/v1/services/${serviceId}/env-vars/LLM_MODEL`, {
  method: "PUT",
  body: JSON.stringify({ value: llmModel }),
});
console.log("OK: LLM_MODEL updated on Render");

const deploy = await renderFetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
  method: "POST",
  body: JSON.stringify({ clearCache: "do_not_clear" }),
});
console.log(`Deploy triggered: ${deploy?.id || deploy?.deploy?.id || "(unknown)"}`);
