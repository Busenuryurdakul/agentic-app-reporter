/**
 * WebMCP-1 JWT smoke — mirrors frontend mcp.ts (session JWT, not adcs_ keys).
 *
 * Usage (from backend/, backend running):
 *   node ./scripts/smoke_webmcp_jwt.mjs
 */
const API = process.env.API_BASE || "http://127.0.0.1:8080/api/v1";
const results = [];

function pass(step, detail = "") {
  results.push({ step, status: "PASS", detail });
  console.log(`PASS  ${step}${detail ? ` — ${detail}` : ""}`);
}

function fail(step, detail = "") {
  results.push({ step, status: "FAIL", detail });
  console.log(`FAIL  ${step}${detail ? ` — ${detail}` : ""}`);
}

async function api(method, path, { token, orgId, workspaceId, body, expect } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (orgId) headers["X-Organization-ID"] = orgId;
  if (workspaceId) headers["X-Workspace-ID"] = workspaceId;
  const res = await fetch(`${API}${path}`, {
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
    throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  }
  return { status: res.status, data };
}

const ts = Date.now();
const email = `webmcp_${ts}@example.com`;
const password = "SmokeTest123!";

let failed = false;

try {
  await api("POST", "/auth/register", {
    body: { email, password, first_name: "Web", last_name: "MCP" },
  });
  const login = await api("POST", "/auth/login", { body: { email, password } });
  const jwt = login.data.token;
  if (String(jwt).startsWith("adcs_")) {
    throw new Error("login returned api key instead of jwt");
  }
  pass("jwt auth (not adcs_ key)", email);

  const health = await api("GET", "/mcp/health", { token: jwt });
  if (health.data.auth_method !== "jwt") {
    throw new Error(`expected jwt auth_method, got ${health.data.auth_method}`);
  }
  pass("mcp health via jwt", health.data.auth_method);

  const org = await api("POST", "/organizations", {
    token: jwt,
    body: { name: "WebMCP Org", slug: `wm${String(ts).slice(-6)}` },
    expect: [201],
  });
  const orgId = org.data.id;

  const ws = await api("POST", `/organizations/${orgId}/workspaces`, {
    token: jwt,
    orgId,
    body: { name: "WebMCP WS", slug: "webmcp" },
    expect: [201],
  });
  const workspaceId = ws.data.id;

  async function mcpCall(name, bodyExtra = {}) {
    return api("POST", "/mcp/tools/call", {
      token: jwt,
      orgId,
      workspaceId,
      body: {
        name,
        arguments: { workspace_id: workspaceId, ...bodyExtra },
      },
    });
  }

  const readiness = await mcpCall("workspace_readiness");
  if (typeof readiness.data.result?.overall !== "number") {
    throw new Error("workspace_readiness missing overall");
  }
  pass("workspace_readiness", `score=${readiness.data.result.overall}`);

  const docs = await mcpCall("list_documents");
  if (!Array.isArray(docs.data.result?.documents)) {
    throw new Error("list_documents missing documents array");
  }
  pass("list_documents", `${docs.data.result.documents.length} doc(s)`);

  const llm = await mcpCall("llm_health");
  if (!llm.data.result?.provider) {
    throw new Error("llm_health missing provider");
  }
  pass("llm_health", llm.data.result.provider);

  try {
    await api("GET", "/mcp/health", { expect: [401] });
    pass("401 without auth readable", "401");
  } catch {
    throw new Error("expected 401 without auth");
  }

  try {
    await api("POST", "/mcp/tools/call", {
      token: jwt,
      orgId,
      body: { name: "workspace_readiness", arguments: {} },
      expect: [400],
    });
    pass("400 missing workspace context", "400");
  } catch {
    throw new Error("expected 400 without workspace_id or header");
  }
} catch (err) {
  failed = true;
  fail("smoke_webmcp_jwt", err instanceof Error ? err.message : String(err));
}

console.log("\n--- Summary ---");
for (const r of results) {
  console.log(`${r.status.padEnd(4)} ${r.step}${r.detail ? ` — ${r.detail}` : ""}`);
}

if (failed) process.exit(1);
console.log("\nAll WebMCP JWT smoke checks passed.");
