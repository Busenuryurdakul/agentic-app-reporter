/**
 * Phase 3 API smoke: health → generate → list → get → regenerate → foreign 403
 * Prerequisites: API :8080, migration 16, LLM_PROVIDER=mock, roles seeded.
 * Usage: node ./scripts/smoke_phase3_documents.mjs
 */

const API = process.env.API_BASE || "http://localhost:8080/api/v1";
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

  const expected = expect ?? [200, 201];
  if (!expected.includes(res.status)) {
    throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  }
  return { status: res.status, data };
}

const ts = Date.now();
const email = `smoke_p3_${ts}@example.com`;
const password = "SmokeTest123!";
const orgSlug = `smokep3${String(ts).slice(-6)}`;

try {
  await api("POST", "/auth/register", {
    body: { email, password, first_name: "Smoke", last_name: "P3" },
  });
  const login = await api("POST", "/auth/login", { body: { email, password } });
  const token = login.data.token;
  ok("register/login", email);

  const org = await api("POST", "/organizations", {
    token,
    body: { name: "Smoke P3 Org", slug: orgSlug },
  });
  const orgId = org.data.id;

  const ws = await api("POST", `/organizations/${orgId}/workspaces`, {
    token,
    orgId,
    body: { name: "Smoke P3 WS", slug: "smokep3ws", description: "phase3" },
  });
  const workspaceId = ws.data.id;
  ok("org+workspace", workspaceId);

  const emailB = `smoke_p3b_${ts}@example.com`;
  await api("POST", "/auth/register", {
    body: { email: emailB, password, first_name: "Other", last_name: "Org" },
  });
  const loginB = await api("POST", "/auth/login", { body: { email: emailB, password } });
  const tokenB = loginB.data.token;
  const orgB = await api("POST", "/organizations", {
    token: tokenB,
    body: { name: "Smoke P3 Org B", slug: `${orgSlug}b` },
  });
  const orgBId = orgB.data.id;
  ok("foreign org ready", orgBId);

  const health = await api("GET", "/llm/health", { token, orgId });
  if (health.data?.healthy && health.data?.provider === "mock") {
    ok("llm health", `${health.data.provider} healthy=${health.data.healthy}`);
  } else {
    fail("llm health", JSON.stringify(health.data));
  }

  const gen = await api("POST", `/workspaces/${workspaceId}/documents/generate`, {
    token,
    orgId,
    workspaceId,
    body: { title: "Smoke Markdown", language: "tr" },
    expect: [201],
  });
  const doc = gen.data;
  if (doc?.id && doc?.markdown_body && doc?.status === "succeeded") {
    ok("generate", `id=${doc.id} provider=${doc.provider_name}`);
  } else {
    fail("generate", JSON.stringify(doc));
  }
  const docId = doc.id;

  const list = await api("GET", `/workspaces/${workspaceId}/documents`, {
    token,
    orgId,
    workspaceId,
  });
  const listed = (list.data?.documents ?? []).find((d) => d.id === docId);
  if (listed && listed.markdown_body === undefined) {
    ok("list", `count=${list.data.documents.length} summary omits body`);
  } else if (listed) {
    ok("list", `count=${list.data.documents.length}`);
  } else {
    fail("list", "document not found");
  }

  const got = await api("GET", `/workspaces/${workspaceId}/documents/${docId}`, {
    token,
    orgId,
    workspaceId,
  });
  if (got.data?.markdown_body?.length > 0) {
    ok("get", `body_bytes=${got.data.markdown_body.length}`);
  } else {
    fail("get", "empty body");
  }

  const regen = await api("POST", `/workspaces/${workspaceId}/documents/${docId}/regenerate`, {
    token,
    orgId,
    workspaceId,
    expect: [201],
  });
  if (regen.data?.id && regen.data.id !== docId) {
    ok("regenerate", `new_id=${regen.data.id} old_id=${docId}`);
  } else {
    fail("regenerate", "expected new id");
  }

  const still = await api("GET", `/workspaces/${workspaceId}/documents/${docId}`, {
    token,
    orgId,
    workspaceId,
  });
  if (still.data?.id === docId) ok("source kept", docId);
  else fail("source kept");

  await api("GET", `/workspaces/${workspaceId}/documents/${docId}`, {
    token: tokenB,
    orgId: orgBId,
    workspaceId,
    expect: [403],
  });
  ok("foreign get 403", "orgB blocked");
} catch (err) {
  fail("smoke aborted", err.message);
}

const pass = results.filter((r) => r.status === "PASS").length;
const failCount = results.filter((r) => r.status === "FAIL").length;
console.log("");
console.log(`Result: ${pass} PASS / ${failCount} FAIL`);
process.exit(failCount > 0 ? 1 : 0);
