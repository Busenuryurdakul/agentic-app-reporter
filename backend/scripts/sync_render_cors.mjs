/**
 * Update CORS_ALLOWED_ORIGINS on the Render web service (no redeploy required).
 *
 * Usage:
 *   RENDER_API_KEY=rnd_... node ./scripts/sync_render_cors.mjs
 *
 * Optional:
 *   RENDER_SERVICE_NAME=agentic-app-reporter-api
 *   CORS_ALLOWED_ORIGINS=https://a.vercel.app,https://b.vercel.app
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..");
const envPath = path.join(__dirname, "..", ".env");
const fileEnv = loadEnv(envPath);

const renderKey = (process.env.RENDER_API_KEY || fileEnv.RENDER_API_KEY || "").trim();
const serviceName = process.env.RENDER_SERVICE_NAME || "agentic-app-reporter-api";

const defaultOrigins = [
  "https://frontend-orpin-nine-72.vercel.app",
  "https://frontend-buse7.vercel.app",
  "https://frontend-git-main-buse7.vercel.app",
  "https://agentic-app-reporter.vercel.app",
  "https://agentic-app-reporter-buse7.vercel.app",
  "https://agentic-app-reporter-git-main-buse7.vercel.app",
];

const corsValue = (process.env.CORS_ALLOWED_ORIGINS || defaultOrigins.join(","))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .join(",");

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

function readRenderYamlOrigins() {
  const yamlPath = path.join(repoRoot, "render.yaml");
  if (!fs.existsSync(yamlPath)) return null;
  const text = fs.readFileSync(yamlPath, "utf8");
  const block = text.match(
    /- key: CORS_ALLOWED_ORIGINS\s*\n\s*value: >-\s*\n((?:\s+.+\n?)+)/,
  );
  if (!block) return null;
  return block[1]
    .split("\n")
    .map((line) => line.trim().replace(/,$/, ""))
    .filter(Boolean)
    .join(",");
}

if (!renderKey) {
  console.error("RENDER_API_KEY is required (Render Dashboard → Account Settings → API Keys)");
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

const yamlOrigins = readRenderYamlOrigins();
const targetValue = yamlOrigins || corsValue;

const list = await renderFetch("https://api.render.com/v1/services?limit=100");
const match = list.find((row) => row?.service?.name === serviceName || row?.name === serviceName);
const serviceId = match?.service?.id || match?.id;
if (!serviceId) {
  console.error(`Render service not found: ${serviceName}`);
  process.exit(1);
}

const envVars = await renderFetch(`https://api.render.com/v1/services/${serviceId}/env-vars?limit=100`);
const rows = Array.isArray(envVars) ? envVars : envVars?.envVars || [];
const existing = rows.find((row) => (row?.envVar?.key || row?.key) === "CORS_ALLOWED_ORIGINS");

await renderFetch(`https://api.render.com/v1/services/${serviceId}/env-vars/CORS_ALLOWED_ORIGINS`, {
  method: "PUT",
  body: JSON.stringify({ value: targetValue }),
});

if (existing) {
  console.log(`Updated CORS_ALLOWED_ORIGINS on ${serviceName} (${serviceId})`);
} else {
  console.log(`Set CORS_ALLOWED_ORIGINS on ${serviceName} (${serviceId})`);
}

console.log(`Origins: ${targetValue}`);

const deploy = await renderFetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
  method: "POST",
  body: JSON.stringify({ clearCache: "do_not_clear" }),
});
const deployId = deploy?.id || deploy?.deploy?.id || "(unknown)";
console.log(`Deploy triggered: ${deployId}`);
