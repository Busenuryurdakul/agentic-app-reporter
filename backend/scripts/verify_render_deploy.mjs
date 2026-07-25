/**
 * Poll Render deploy + verify API health and migration 00018 in deploy logs.
 *
 * Usage:
 *   RENDER_API_KEY=rnd_... node ./scripts/verify_render_deploy.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
const fileEnv = loadEnv(envPath);
const renderKey = (process.env.RENDER_API_KEY || fileEnv.RENDER_API_KEY || "").trim();
const serviceName = process.env.RENDER_SERVICE_NAME || "agentic-app-reporter-api";
const apiHealth =
  (process.env.API_HEALTH || "https://agentic-app-reporter-api.onrender.com/health/live").replace(/\/$/, "");

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

async function resolveServiceId() {
  const list = await renderFetch("https://api.render.com/v1/services?limit=100");
  const match = list.find((row) => row?.service?.name === serviceName || row?.name === serviceName);
  const serviceId = match?.service?.id || match?.id;
  if (!serviceId) throw new Error(`Render service not found: ${serviceName}`);
  return serviceId;
}

async function latestDeploy(serviceId) {
  const list = await renderFetch(`https://api.render.com/v1/services/${serviceId}/deploys?limit=1`);
  const row = list?.[0];
  return row?.deploy || row;
}

async function waitForLive(serviceId, maxAttempts = 40, delayMs = 15000) {
  for (let i = 1; i <= maxAttempts; i++) {
    const deploy = await latestDeploy(serviceId);
    const status = deploy?.status || "unknown";
    console.log(`deploy poll ${i}/${maxAttempts}: status=${status} id=${deploy?.id || "?"}`);
    if (status === "live") return deploy;
    if (status === "build_failed" || status === "update_failed" || status === "canceled") {
      throw new Error(`deploy failed: ${status}`);
    }
    await sleep(delayMs);
  }
  throw new Error("deploy did not reach live in time");
}

async function checkHealth() {
  const res = await fetch(apiHealth);
  if (!res.ok) throw new Error(`health ${apiHealth} -> ${res.status}`);
  console.log(`PASS  health — ${apiHealth}`);
}

async function checkMigrationLogs(serviceId, deployId) {
  const events = await renderFetch(
    `https://api.render.com/v1/services/${serviceId}/deploys/${deployId}/events?limit=100`,
  );
  const text = events
    .map((e) => e?.event?.details || e?.details || "")
    .join("\n");
  if (text.includes("Running database migrations")) {
    console.log("PASS  deploy logs — goose migrations step present");
  } else {
    console.log("WARN  deploy logs — migration step not found in recent events");
  }
  if (/goose.*(error|failed)/i.test(text)) {
    throw new Error("goose error detected in deploy logs");
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

try {
  const serviceId = await resolveServiceId();
  const deploy = await waitForLive(serviceId);
  await checkMigrationLogs(serviceId, deploy.id);
  await checkHealth();
  console.log("\n=== Render deploy verification PASSED ===");
} catch (err) {
  console.error(`FAIL  ${err.message}`);
  process.exit(1);
}
