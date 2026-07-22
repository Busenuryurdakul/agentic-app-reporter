/**
 * Phase 4 release smoke (API):
 * auth → workspace → profile → generate → readiness → observe summary (quality)
 * → approve → export (approved path) → export fallback note via second doc
 *
 * Prerequisites:
 *   - API on :8080 (or API_BASE)
 *   - migrations 16 + 17
 *   - LLM_PROVIDER=mock
 *   - roles seeded (document:approve, export:create)
 *
 * Usage: node ./scripts/smoke_phase4_release.mjs
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
  return { status: res.status, data, headers: res.headers, raw: text };
}

async function apiBinary(method, path, { token, orgId, workspaceId, body, expect } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (orgId) headers["X-Organization-ID"] = orgId;
  if (workspaceId) headers["X-Workspace-ID"] = workspaceId;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const expected = expect ?? [200];
  if (!expected.includes(res.status)) {
    const text = await res.text();
    throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    status: res.status,
    buf,
    contentType: res.headers.get("content-type") || "",
    disposition: res.headers.get("content-disposition") || "",
    documentCount: res.headers.get("x-document-count") || "",
  };
}

const ts = Date.now();
const email = `smoke_p4_${ts}@example.com`;
const password = "SmokeTest123!";
const orgSlug = `smokep4${String(ts).slice(-6)}`;

try {
  await api("POST", "/auth/register", {
    body: { email, password, first_name: "Phase", last_name: "Four" },
  });
  const login = await api("POST", "/auth/login", { body: { email, password } });
  const token = login.data.token;
  ok("auth", email);

  const org = await api("POST", "/organizations", {
    token,
    body: { name: "Smoke P4 Org", slug: orgSlug },
  });
  const orgId = org.data.id;

  const ws = await api("POST", `/organizations/${orgId}/workspaces`, {
    token,
    orgId,
    body: { name: "Smoke P4 WS", slug: "smokep4ws", description: "phase4" },
  });
  const workspaceId = ws.data.id;
  ok("workspace", workspaceId);

  await api("PUT", `/workspaces/${workspaceId}/profile`, {
    token,
    orgId,
    workspaceId,
    body: {
      project_name: "Phase4 Observer",
      project_description: "Readiness and export smoke",
      product_type: "web",
      preferred_document_language: "tr",
      project_status: "planned",
    },
  });
  ok("profile upsert");

  const gen = await api("POST", `/workspaces/${workspaceId}/documents/generate`, {
    token,
    orgId,
    workspaceId,
    body: { title: "Phase4 Doc", language: "tr" },
    expect: [201],
  });
  if (
    gen.data?.status === "succeeded" &&
    gen.data?.approval_status === "draft" &&
    typeof gen.data?.quality?.quality_score === "number"
  ) {
    ok("generate + quality", `score=${gen.data.quality.quality_score}`);
  } else {
    fail("generate + quality", JSON.stringify(gen.data));
  }
  const docId = gen.data.id;

  const readiness = await api("GET", `/workspaces/${workspaceId}/readiness`, {
    token,
    orgId,
    workspaceId,
  });
  if (
    typeof readiness.data?.overall === "number" &&
    readiness.data.components?.documents === 100 &&
    readiness.data.succeeded_document_count >= 1
  ) {
    ok(
      "readiness",
      `overall=${readiness.data.overall} profile=${readiness.data.components.profile}`,
    );
  } else {
    fail("readiness", JSON.stringify(readiness.data));
  }

  const summary = await api("GET", `/workspaces/${workspaceId}/observe/summary`, {
    token,
    orgId,
    workspaceId,
  });
  const recent = summary.data?.recent ?? [];
  const recentDoc = recent.find((d) => d.id === docId);
  if (
    summary.data?.totals?.succeeded >= 1 &&
    recentDoc &&
    recentDoc.markdown_body === undefined &&
    typeof recentDoc.quality?.quality_score === "number"
  ) {
    ok("observe summary", `recent=${recent.length} succeeded=${summary.data.totals.succeeded}`);
  } else {
    fail("observe summary", JSON.stringify(summary.data));
  }

  // Export before approve → succeeded fallback (draft approved_status)
  const exportFallback = await apiBinary("POST", `/workspaces/${workspaceId}/exports`, {
    token,
    orgId,
    workspaceId,
    body: { format: "markdown_zip" },
  });
  if (
    exportFallback.contentType.includes("text/markdown") &&
    exportFallback.buf.includes(Buffer.from("Phase4 Doc")) &&
    exportFallback.buf.includes(Buffer.from("approval_status:"))
  ) {
    ok("export fallback (succeeded)", `bytes=${exportFallback.buf.length}`);
  } else {
    fail(
      "export fallback (succeeded)",
      `${exportFallback.contentType} len=${exportFallback.buf.length}`,
    );
  }

  const approved = await api("POST", `/workspaces/${workspaceId}/documents/${docId}/approve`, {
    token,
    orgId,
    workspaceId,
  });
  if (approved.data?.approval_status === "approved" && approved.data?.approved_at) {
    ok("approve document", approved.data.approval_status);
  } else {
    fail("approve document", JSON.stringify(approved.data));
  }

  const approvedAgain = await api(
    "POST",
    `/workspaces/${workspaceId}/documents/${docId}/approve`,
    { token, orgId, workspaceId },
  );
  if (approvedAgain.data?.approval_status === "approved") {
    ok("approve idempotent");
  } else {
    fail("approve idempotent", JSON.stringify(approvedAgain.data));
  }

  const exportApproved = await apiBinary("POST", `/workspaces/${workspaceId}/exports`, {
    token,
    orgId,
    workspaceId,
    body: { format: "markdown_zip" },
  });
  if (
    exportApproved.contentType.includes("text/markdown") &&
    exportApproved.buf.includes(Buffer.from('approval_status: "approved"'))
  ) {
    ok("export approved path", exportApproved.disposition || "ok");
  } else {
    fail("export approved path", exportApproved.buf.toString("utf8").slice(0, 200));
  }

  const exportById = await apiBinary("POST", `/workspaces/${workspaceId}/exports`, {
    token,
    orgId,
    workspaceId,
    body: { document_ids: [docId], format: "markdown_zip" },
  });
  if (exportById.documentCount === "1" && exportById.buf.length > 0) {
    ok("export by document_ids", `count=${exportById.documentCount}`);
  } else {
    fail("export by document_ids", `count=${exportById.documentCount}`);
  }

  // Foreign org isolation
  const emailB = `smoke_p4b_${ts}@example.com`;
  await api("POST", "/auth/register", {
    body: { email: emailB, password, first_name: "Other", last_name: "Org" },
  });
  const loginB = await api("POST", "/auth/login", { body: { email: emailB, password } });
  const tokenB = loginB.data.token;
  const orgB = await api("POST", "/organizations", {
    token: tokenB,
    body: { name: "Smoke P4 Org B", slug: `${orgSlug}b` },
  });
  await api("GET", `/workspaces/${workspaceId}/readiness`, {
    token: tokenB,
    orgId: orgB.data.id,
    workspaceId,
    expect: [403],
  });
  ok("readiness foreign org 403");
} catch (err) {
  fail("smoke aborted", err.message);
}

const pass = results.filter((r) => r.status === "PASS").length;
const failCount = results.filter((r) => r.status === "FAIL").length;
console.log("");
console.log(`Result: ${pass} PASS / ${failCount} FAIL`);
process.exit(failCount > 0 ? 1 : 0);
