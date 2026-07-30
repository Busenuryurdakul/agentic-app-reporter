/**
 * Post-deploy MCP route check for Render production.
 *
 * Verifies MCP endpoints are registered (401 without auth) and ready health.
 * Optional full smoke when MCP_SMOKE_EMAIL + MCP_SMOKE_PASSWORD are set.
 *
 * Usage:
 *   node ./scripts/verify_render_mcp.mjs
 *   API_BASE=https://agentic-app-reporter-api.onrender.com node ./scripts/verify_render_mcp.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_BASE = (process.env.API_BASE || "https://agentic-app-reporter-api.onrender.com").replace(/\/$/, "");
const API = `${API_BASE}/api/v1`;

async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name} — ${err instanceof Error ? err.message : err}`);
    throw err;
  }
}

await check("health/live", async () => {
  const res = await fetch(`${API_BASE}/health/live`);
  if (!res.ok) throw new Error(`status ${res.status}`);
});

await check("health/ready", async () => {
  const res = await fetch(`${API_BASE}/health/ready`);
  if (!res.ok) throw new Error(`status ${res.status}`);
  const body = await res.json();
  if (body?.services?.postgres !== "healthy") {
    throw new Error(`postgres not healthy: ${JSON.stringify(body?.services)}`);
  }
});

await check("mcp route registered (401 without auth)", async () => {
  const res = await fetch(`${API}/mcp/health`);
  if (res.status !== 401) {
    throw new Error(`expected 401, got ${res.status} (404 means MCP routes missing — redeploy backend with migration 00022)`);
  }
});

await check("api-keys route registered (401 without auth)", async () => {
  const res = await fetch(`${API}/auth/api-keys`);
  if (res.status !== 401) {
    throw new Error(`expected 401, got ${res.status}`);
  }
});

const email = (process.env.MCP_SMOKE_EMAIL || "").trim();
const password = (process.env.MCP_SMOKE_PASSWORD || "").trim();

if (email && password) {
  await check("production MCP smoke", async () => {
    const result = spawnSync("node", ["scripts/smoke_api_keys_mcp.mjs"], {
      cwd: path.join(__dirname, ".."),
      env: { ...process.env, API_BASE: API },
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    if (result.status !== 0) {
      throw new Error("smoke_api_keys_mcp.mjs failed");
    }
  });
} else {
  console.log("SKIP  full MCP smoke — set MCP_SMOKE_EMAIL and MCP_SMOKE_PASSWORD for end-to-end prod test");
}

console.log("\n=== Render MCP verification PASSED ===");
