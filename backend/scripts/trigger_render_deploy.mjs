/**
 * Trigger a Render web service deploy (no env var changes).
 *
 * Usage:
 *   RENDER_API_KEY=rnd_... node ./scripts/trigger_render_deploy.mjs
 *
 * Optional:
 *   RENDER_SERVICE_NAME=agentic-app-reporter-api
 *   RENDER_SERVICE_ID=srv-...
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
const fileEnv = loadEnv(envPath);
const renderKey = (process.env.RENDER_API_KEY || fileEnv.RENDER_API_KEY || "").trim();
const serviceName = process.env.RENDER_SERVICE_NAME || "agentic-app-reporter-api";
const serviceIdOverride = process.env.RENDER_SERVICE_ID?.trim();

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

const deploy = await renderFetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
  method: "POST",
  body: JSON.stringify({ clearCache: "do_not_clear" }),
});

const deployId = deploy?.id || deploy?.deploy?.id || "(unknown)";
console.log(`Deploy triggered: service=${serviceId} deploy=${deployId}`);
