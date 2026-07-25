/**
 * Diagnose production document generate failure against Render API.
 * Prints provider_error_code when present (after error-handling deploy).
 */
const API = (process.env.API_BASE || "https://agentic-app-reporter-api.onrender.com/api/v1").replace(/\/$/, "");

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
    const err = new Error(`${method} ${path} -> ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return { status: res.status, data };
}

const ts = Date.now();
const email = `diag_${ts}@example.com`;
const password = "SmokeTest123!";
const orgSlug = `diag${String(ts).slice(-6)}`;

try {
  await api("POST", "/auth/register", {
    body: { email, password, first_name: "Diag", last_name: "Gen" },
  });
  const login = await api("POST", "/auth/login", { body: { email, password } });
  const token = login.data.token;
  const org = await api("POST", "/organizations", {
    token,
    body: { name: "Diag Org", slug: orgSlug },
  });
  const orgId = org.data.id;
  const ws = await api("POST", `/organizations/${orgId}/workspaces`, {
    token,
    orgId,
    body: { name: "Diag WS", slug: `diagws${String(ts).slice(-4)}`, description: "diag" },
  });
  const workspaceId = ws.data.id;
  await api("PUT", `/workspaces/${workspaceId}/profile`, {
    token,
    orgId,
    workspaceId,
    body: {
      project_name: "Diag Reporter",
      project_description: "Production generate diagnosis",
      product_type: "web",
      preferred_document_language: "tr",
      project_status: "planned",
    },
  });

  const health = await api("GET", "/llm/health", { token, orgId });
  console.log("llm/health:", JSON.stringify(health.data));

  try {
    await api("POST", `/workspaces/${workspaceId}/documents/generate`, {
      token,
      orgId,
      workspaceId,
      body: { title: "Diag Doc", language: "tr" },
      expect: [201],
    });
    console.log("generate: PASS");
  } catch (e) {
    console.log("generate: FAIL");
    console.log("  http_status:", e.status);
    console.log("  body:", JSON.stringify(e.data, null, 2));
    if (e.data?.provider_error_code) {
      console.log("  provider_error_code:", e.data.provider_error_code);
    }
  }
} catch (e) {
  console.error("diagnosis aborted:", e.message);
  if (e.data) console.error(JSON.stringify(e.data, null, 2));
  process.exit(1);
}
