/**
 * Smoke: user API keys + MCP endpoints (JWT management, adcs_ headless access).
 *
 * Usage (from backend/):
 *   node ./scripts/smoke_api_keys_mcp.mjs
 */
const API = process.env.API_BASE || "http://127.0.0.1:8080/api/v1";
const results = [];

function ok(step, detail = "") {
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
  const expected = expect ?? [200, 201, 204];
  if (!expected.includes(res.status)) {
    throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  }
  return { status: res.status, data };
}

const ts = Date.now();
const email = `smoke_mcp_${ts}@example.com`;
const password = "SmokeTest123!";

let failed = false;

try {
  await api("POST", "/auth/register", {
    body: { email, password, first_name: "MCP", last_name: "Smoke" },
  });
  const login = await api("POST", "/auth/login", { body: { email, password } });
  const jwt = login.data.token;
  ok("auth register+login", email);

  const created = await api("POST", "/auth/api-keys", {
    token: jwt,
    body: { name: "smoke-mcp-key" },
    expect: [201],
  });
  const rawKey = created.data.key;
  if (!rawKey || !String(rawKey).startsWith("adcs_")) {
    throw new Error("created key missing or invalid prefix");
  }
  ok("create user api key", rawKey.slice(0, 12) + "…");

  const listed = await api("GET", "/auth/api-keys", { token: jwt });
  const keys = listed.data.keys ?? [];
  if (!Array.isArray(keys) || keys.length < 1) {
    throw new Error("list keys empty");
  }
  ok("list user api keys", `${keys.length} key(s)`);

  const mcpHealthJwt = await api("GET", "/mcp/health", { token: jwt });
  if (mcpHealthJwt.data.auth_method !== "jwt") {
    throw new Error(`expected jwt auth_method, got ${mcpHealthJwt.data.auth_method}`);
  }
  ok("mcp health via jwt", mcpHealthJwt.data.status);

  const mcpHealthKey = await api("GET", "/mcp/health", { token: rawKey });
  if (mcpHealthKey.data.auth_method !== "api_key") {
    throw new Error(`expected api_key auth_method, got ${mcpHealthKey.data.auth_method}`);
  }
  ok("mcp health via api key", mcpHealthKey.data.status);

  const tools = await api("GET", "/mcp/tools", { token: rawKey });
  const toolNames = (tools.data.tools ?? []).map((t) => t.name);
  const required = ["get_me", "llm_health", "list_documents", "get_document", "workspace_readiness"];
  if (!required.every((n) => toolNames.includes(n))) {
    throw new Error(`unexpected tools: ${toolNames.join(", ")}`);
  }
  ok("mcp list tools", toolNames.join(", "));

  const getMe = await api("POST", "/mcp/tools/call", {
    token: rawKey,
    body: { name: "get_me" },
  });
  if (getMe.data.result?.email !== email) {
    throw new Error("get_me returned wrong email");
  }
  ok("mcp call get_me", getMe.data.result.email);

  const llmHealth = await api("POST", "/mcp/tools/call", {
    token: rawKey,
    body: { name: "llm_health" },
  });
  if (!llmHealth.data.result?.provider) {
    throw new Error("llm_health missing provider");
  }
  ok("mcp call llm_health", llmHealth.data.result.provider);

  const scoped = await api("POST", "/auth/api-keys", {
    token: jwt,
    body: { name: "profile-only", scopes: ["mcp:profile"] },
    expect: [201],
  });
  const profileKey = scoped.data.key;
  ok("create scoped api key", "mcp:profile");

  const profileGetMe = await api("POST", "/mcp/tools/call", {
    token: profileKey,
    body: { name: "get_me" },
  });
  if (!profileGetMe.data.result?.email) {
    throw new Error("scoped key get_me failed");
  }
  ok("scoped key get_me", profileGetMe.data.result.email);

  try {
    await api("POST", "/mcp/tools/call", {
      token: profileKey,
      body: { name: "llm_health" },
      expect: [403],
    });
    ok("scoped key denies llm_health", "403");
  } catch {
    throw new Error("scoped key should deny llm_health with 403");
  }

  const orgSlug = `mcp${String(ts).slice(-6)}`;
  const org = await api("POST", "/organizations", {
    token: jwt,
    body: { name: "MCP Smoke Org", slug: orgSlug },
    expect: [201],
  });
  const orgId = org.data.id;
  ok("create org for workspace tools", orgId);

  const ws = await api("POST", `/organizations/${orgId}/workspaces`, {
    token: jwt,
    orgId,
    body: { name: "MCP Workspace", slug: "mcpws" },
    expect: [201],
  });
  const workspaceId = ws.data.id;
  ok("create workspace", workspaceId);

  async function mcpCall(name, bodyExtra = {}) {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${rawKey}`,
      "X-Organization-ID": orgId,
      "X-Workspace-ID": workspaceId,
    };
    const res = await fetch(`${API}/mcp/tools/call`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name, arguments: { workspace_id: workspaceId, ...bodyExtra } }),
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      throw new Error(`mcp ${name} -> ${res.status} ${text}`);
    }
    return data;
  }

  const listDocs = await mcpCall("list_documents");
  if (!Array.isArray(listDocs.result?.documents)) {
    throw new Error("list_documents missing documents array");
  }
  ok("mcp list_documents", `${listDocs.result.documents.length} doc(s)`);

  const readiness = await mcpCall("workspace_readiness");
  if (typeof readiness.result?.overall !== "number") {
    throw new Error("workspace_readiness missing overall score");
  }
  ok("mcp workspace_readiness", `score=${readiness.result.overall}`);

  const missingDocId = await fetch(`${API}/mcp/tools/call`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${rawKey}`,
      "X-Organization-ID": orgId,
      "X-Workspace-ID": workspaceId,
    },
    body: JSON.stringify({
      name: "get_document",
      arguments: { workspace_id: workspaceId },
    }),
  });
  if (missingDocId.status !== 400) {
    throw new Error(`get_document without document_id expected 400, got ${missingDocId.status}`);
  }
  ok("mcp get_document validation", "400 without document_id");

  const keyId = created.data.id;
  await api("DELETE", `/auth/api-keys/${keyId}`, { token: jwt, expect: [204] });
  ok("revoke user api key", keyId);

  try {
    await api("GET", "/mcp/health", { token: rawKey, expect: [401] });
    ok("revoked key rejected", "401");
  } catch {
    throw new Error("revoked key should return 401");
  }
} catch (err) {
  failed = true;
  fail("smoke_api_keys_mcp", err instanceof Error ? err.message : String(err));
}

console.log("\n--- Summary ---");
for (const r of results) {
  console.log(`${r.status.padEnd(4)} ${r.step}${r.detail ? ` — ${r.detail}` : ""}`);
}

if (failed) process.exit(1);
console.log("\nAll API key + MCP smoke checks passed.");
