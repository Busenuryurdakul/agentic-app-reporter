/**
 * Org LLM Settings smoke: migration-backed API, RBAC, generate resolver, security checks.
 * Usage: node ./scripts/smoke_org_llm_settings.mjs
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
function skip(step, detail = "") {
  results.push({ step, status: "SKIP", detail });
  console.log(`SKIP  ${step}${detail ? ` — ${detail}` : ""}`);
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
    const err = new Error(`${method} ${path} -> ${res.status} ${text}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return { status: res.status, data, raw: text };
}

function assertNoSecrets(payload, label) {
  const s = typeof payload === "string" ? payload : JSON.stringify(payload);
  const banned = [/sk-[a-zA-Z0-9]{8,}/, /"provider_api_key"\s*:\s*"[^*]/, /Bearer\s+[a-zA-Z0-9._-]{12,}/];
  for (const re of banned) {
    if (re.test(s)) {
      throw new Error(`${label}: response may contain raw secret`);
    }
  }
}

const ts = Date.now();
const password = "SmokeTest123!";

async function registerLogin(email, first, last) {
  await api("POST", "/auth/register", {
    body: { email, password, first_name: first, last_name: last },
  });
  const login = await api("POST", "/auth/login", { body: { email, password } });
  return { token: login.data.token, userId: login.data.user.id };
}

async function main() {
  let devRoleId = process.env.SMOKE_DEV_ROLE_ID;
  let viewerRoleId = process.env.SMOKE_VIEWER_ROLE_ID;

  const adminEmail = `smoke_llm_admin_${ts}@example.com`;
  const { token: adminToken, userId: adminUserId } = await registerLogin(
    adminEmail,
    "Smoke",
    "Admin",
  );
  ok("register/login org_admin user", adminEmail);

  const org = await api("POST", "/organizations", {
    token: adminToken,
    body: { name: "Smoke LLM Org", slug: `smokellm${String(ts).slice(-6)}` },
  });
  const orgId = org.data.id;

  const ws = await api("POST", `/organizations/${orgId}/workspaces`, {
    token: adminToken,
    orgId,
    body: { name: "Smoke LLM WS", slug: "smokellmws", description: "llm smoke" },
  });
  const workspaceId = ws.data.id;
  ok("org+workspace", orgId);

  // Foreign org
  const foreignEmail = `smoke_llm_foreign_${ts}@example.com`;
  const { token: foreignToken } = await registerLogin(foreignEmail, "Foreign", "User");
  const orgB = await api("POST", "/organizations", {
    token: foreignToken,
    body: { name: "Smoke LLM Org B", slug: `smokellmb${String(ts).slice(-5)}` },
  });
  const orgBId = orgB.data.id;

  // 1) GET default — environment source
  const get0 = await api("GET", `/organizations/${orgId}/llm-settings`, {
    token: adminToken,
    orgId,
  });
  assertNoSecrets(get0.data, "GET default");
  if (get0.data.source === "environment" && get0.data.configured === false) {
    ok("GET default source=environment", `provider=${get0.data.provider}`);
  } else {
    fail("GET default source=environment", JSON.stringify(get0.data));
  }
  if (!("provider_api_key" in get0.data) && !get0.data.provider_api_key) {
    ok("GET response has no raw provider_api_key field");
  } else {
    fail("GET response exposes provider_api_key", JSON.stringify(get0.data));
  }

  // Cross-org 403
  try {
    await api("GET", `/organizations/${orgId}/llm-settings`, {
      token: foreignToken,
      orgId: orgBId,
      expect: [403],
    });
    ok("foreign org header mismatch -> 403");
  } catch (e) {
    fail("foreign org access", e.message);
  }

  // 2) PUT org settings
  const put1 = await api("PUT", `/organizations/${orgId}/llm-settings`, {
    token: adminToken,
    orgId,
    body: {
      provider: "mock",
      model: "smoke-org-model",
      timeout_seconds: 45,
      max_retries: 1,
      enabled: true,
    },
  });
  assertNoSecrets(put1.data, "PUT settings");
  if (put1.data.source === "organization" && put1.data.configured === true) {
    ok("PUT saves org settings", `model=${put1.data.model}`);
  } else {
    fail("PUT saves org settings", JSON.stringify(put1.data));
  }

  // 3) POST test saved settings
  const test1 = await api("POST", `/organizations/${orgId}/llm-settings/test`, {
    token: adminToken,
    orgId,
    body: {},
  });
  if (test1.data.healthy === true && test1.data.provider === "mock") {
    ok("POST test connection", test1.data.message);
  } else {
    fail("POST test connection", JSON.stringify(test1.data));
  }

  // 4) Generate uses org override (model name in response metadata)
  const gen = await api("POST", `/workspaces/${workspaceId}/documents/generate`, {
    token: adminToken,
    orgId,
    workspaceId,
    body: { title: "LLM Smoke Doc", language: "tr" },
    expect: [201],
  });
  if (gen.data.status === "succeeded" && gen.data.provider_name === "mock") {
    ok("generate with org resolver", `doc=${gen.data.id}`);
  } else {
    fail("generate with org resolver", JSON.stringify(gen.data));
  }

  const regen = await api("POST", `/workspaces/${workspaceId}/documents/${gen.data.id}/regenerate`, {
    token: adminToken,
    orgId,
    workspaceId,
    expect: [201],
  });
  if (regen.data.status === "succeeded") {
    ok("regenerate uses same resolver", regen.data.id);
  } else {
    fail("regenerate", JSON.stringify(regen.data));
  }

  // 5) reset_to_env_defaults
  const reset = await api("PUT", `/organizations/${orgId}/llm-settings`, {
    token: adminToken,
    orgId,
    body: { reset_to_env_defaults: true, provider: "mock" },
  });
  if (reset.data.source === "environment" && reset.data.configured === false) {
    ok("reset_to_env_defaults", "back to environment");
  } else {
    fail("reset_to_env_defaults", JSON.stringify(reset.data));
  }

  // RBAC: developer + viewer
  if (!devRoleId || !viewerRoleId) {
    skip("RBAC developer/viewer", "set SMOKE_DEV_ROLE_ID and SMOKE_VIEWER_ROLE_ID from verify-llm-db");
  } else {
    const devEmail = `smoke_llm_dev_${ts}@example.com`;
    const { token: devToken, userId: devUserId } = await registerLogin(devEmail, "Dev", "User");
    await api("POST", "/roles/assign", {
      token: adminToken,
      orgId,
      body: {
        user_id: devUserId,
        role_id: devRoleId,
        organization_id: orgId,
      },
      expect: [204],
    });

    await api("GET", `/organizations/${orgId}/llm-settings`, { token: devToken, orgId });
    ok("developer can GET llm-settings");

    try {
      await api("PUT", `/organizations/${orgId}/llm-settings`, {
        token: devToken,
        orgId,
        body: { provider: "mock", model: "dev-attempt" },
        expect: [403],
      });
      ok("developer PUT -> 403");
    } catch (e) {
      fail("developer PUT -> 403", e.message);
    }

    const viewerEmail = `smoke_llm_viewer_${ts}@example.com`;
    const { token: viewerToken, userId: viewerUserId } = await registerLogin(
      viewerEmail,
      "View",
      "Er",
    );
    await api("POST", "/roles/assign", {
      token: adminToken,
      orgId,
      body: {
        user_id: viewerUserId,
        role_id: viewerRoleId,
        organization_id: orgId,
      },
      expect: [204],
    });
    await api("GET", `/organizations/${orgId}/llm-settings`, { token: viewerToken, orgId });
    ok("viewer can GET llm-settings");
    try {
      await api("PUT", `/organizations/${orgId}/llm-settings`, {
        token: viewerToken,
        orgId,
        body: { provider: "mock", model: "viewer-attempt" },
        expect: [403],
      });
      ok("viewer PUT -> 403");
    } catch (e) {
      fail("viewer PUT -> 403", e.message);
    }
  }

  // org_admin write still works
  await api("PUT", `/organizations/${orgId}/llm-settings`, {
    token: adminToken,
    orgId,
    body: { provider: "mock", model: "admin-final" },
  });
  ok("org_admin PUT after reset");

  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log("\n--- Summary ---");
  console.log(`PASS=${results.filter((r) => r.status === "PASS").length} FAIL=${failed} SKIP=${results.filter((r) => r.status === "SKIP").length}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("FATAL", err.message || err);
  process.exit(1);
});
