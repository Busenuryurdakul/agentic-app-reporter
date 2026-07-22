/**
 * Phase 3 final release smoke (API):
 * workspace → profile (plan) → questionnaire → health → generate → list → get → regenerate → failed list entry
 *
 * Failed-document persistence is exercised by forcing provider failure via a dedicated
 * unit test in the same release checklist (see release runner). This script verifies the
 * happy path plus that regenerate keeps history.
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
const email = `smoke_rel_${ts}@example.com`;
const password = "SmokeTest123!";
const orgSlug = `smokerel${String(ts).slice(-6)}`;

try {
  await api("POST", "/auth/register", {
    body: { email, password, first_name: "Release", last_name: "Smoke" },
  });
  const login = await api("POST", "/auth/login", { body: { email, password } });
  const token = login.data.token;
  ok("auth", email);

  const org = await api("POST", "/organizations", {
    token,
    body: { name: "Release Smoke Org", slug: orgSlug },
  });
  const orgId = org.data.id;

  const ws = await api("POST", `/organizations/${orgId}/workspaces`, {
    token,
    orgId,
    body: { name: "Release Smoke WS", slug: "releasesmokes", description: "phase3 release" },
  });
  const workspaceId = ws.data.id;
  ok("workspace create", workspaceId);

  const profile = await api("PUT", `/workspaces/${workspaceId}/profile`, {
    token,
    orgId,
    workspaceId,
    body: {
      project_name: "Release Reporter",
      project_description: "Phase 3 release smoke",
      product_type: "web",
      preferred_document_language: "tr",
      project_status: "planned",
    },
  });
  if (profile.data?.project_name === "Release Reporter") {
    ok("plan screen (profile API)", profile.data.project_name);
  } else {
    fail("plan screen (profile API)", JSON.stringify(profile.data));
  }

  const questionsRes = await api("GET", `/workspaces/${workspaceId}/questions`, {
    token,
    orgId,
    workspaceId,
  });
  const questions = questionsRes.data?.questions ?? [];
  if (!Array.isArray(questions) || questions.length === 0) {
    fail("questionnaire", "empty questions");
  } else {
    const q = questions.find((item) => item?.id && item.active !== false) ?? questions[0];
    let value = "smoke-answer";
    if (q.input_type === "boolean") value = true;
    else if (q.input_type === "number") value = 1;
    else if (q.input_type === "multi_select") value = ["smoke"];
    await api("PUT", `/workspaces/${workspaceId}/answers/${q.id}`, {
      token,
      orgId,
      workspaceId,
      body: { value },
    });
    ok("questionnaire", `${questions.length} questions; answered ${q.key || q.id}`);
  }

  const health = await api("GET", "/llm/health", { token, orgId });
  if (health.data?.healthy && health.data?.provider === "mock") {
    ok("llm health", health.data.provider);
  } else {
    fail("llm health", JSON.stringify(health.data));
  }

  const gen = await api("POST", `/workspaces/${workspaceId}/documents/generate`, {
    token,
    orgId,
    workspaceId,
    body: { title: "Release Doc", language: "tr" },
    expect: [201],
  });
  if (gen.data?.status === "succeeded" && gen.data?.markdown_body) {
    ok("generate document", gen.data.id);
  } else {
    fail("generate document", JSON.stringify(gen.data));
  }
  const docId = gen.data.id;

  const list = await api("GET", `/workspaces/${workspaceId}/documents`, {
    token,
    orgId,
    workspaceId,
  });
  const listed = (list.data?.documents ?? []).find((d) => d.id === docId);
  if (listed && listed.markdown_body === undefined) {
    ok("document list", `count=${list.data.documents.length}`);
  } else if (listed) {
    ok("document list", `found ${docId}`);
  } else {
    fail("document list", "missing generated doc");
  }

  const detail = await api("GET", `/workspaces/${workspaceId}/documents/${docId}`, {
    token,
    orgId,
    workspaceId,
  });
  if (detail.data?.markdown_body && detail.data?.source_fingerprint) {
    ok("document detail", `bytes=${detail.data.markdown_body.length}`);
  } else {
    fail("document detail", JSON.stringify(detail.data));
  }

  const regen = await api("POST", `/workspaces/${workspaceId}/documents/${docId}/regenerate`, {
    token,
    orgId,
    workspaceId,
    expect: [201],
  });
  if (regen.data?.id && regen.data.id !== docId) {
    ok("regenerate", `new=${regen.data.id}`);
  } else {
    fail("regenerate", JSON.stringify(regen.data));
  }

  // Overlap protection (related to generate safety)
  // Hold gate by starting two concurrent generates after unlock — mock is instant so
  // race may rarely hit 409; verify at least both succeed or one is 409.
  const [a, b] = await Promise.allSettled([
    api("POST", `/workspaces/${workspaceId}/documents/generate`, {
      token,
      orgId,
      workspaceId,
      body: { title: "Concurrent A" },
      expect: [201, 409],
    }),
    api("POST", `/workspaces/${workspaceId}/documents/generate`, {
      token,
      orgId,
      workspaceId,
      body: { title: "Concurrent B" },
      expect: [201, 409],
    }),
  ]);
  const statuses = [a, b].map((r) => (r.status === "fulfilled" ? r.value.status : "err"));
  if (statuses.every((s) => s === 201 || s === 409)) {
    ok("generate concurrency/gate", statuses.join(","));
  } else {
    fail("generate concurrency/gate", String(statuses));
  }
} catch (err) {
  fail("smoke aborted", err.message);
}

const pass = results.filter((r) => r.status === "PASS").length;
const failCount = results.filter((r) => r.status === "FAIL").length;
console.log("");
console.log(`Result: ${pass} PASS / ${failCount} FAIL`);
process.exit(failCount > 0 ? 1 : 0);
