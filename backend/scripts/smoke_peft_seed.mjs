/**
 * Seed isolated PEFT export test data (new org/workspace only — no existing row mutations).
 *
 * Flow: auth → org → workspace → profile → generate product_spec → approve
 *
 * Usage:
 *   node ./scripts/smoke_peft_seed.mjs
 *   node ./scripts/smoke_peft_seed.mjs --no-sql-patch   # fail if API/mock cannot produce eligible body
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");
const API = process.env.API_BASE || "http://localhost:8080/api/v1";

async function api(method, pathSuffix, { token, orgId, workspaceId, body, expect } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (orgId) headers["X-Organization-ID"] = orgId;
  if (workspaceId) headers["X-Workspace-ID"] = workspaceId;

  const res = await fetch(`${API}${pathSuffix}`, {
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
    throw new Error(`${method} ${pathSuffix} -> ${res.status} ${text}`);
  }
  return { status: res.status, data };
}

function psqlExec(sql) {
  const res = spawnSync(
    "docker",
    [
      "exec",
      "masterfabric-postgres",
      "psql",
      "-U",
      "masterfabric",
      "-d",
      "masterfabric",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ],
    { encoding: "utf8", cwd: backendRoot },
  );
  if (res.status !== 0) {
    throw new Error(res.stderr || res.stdout || "psql failed");
  }
  return res.stdout.trim();
}

function buildProductSpecBody(projectName) {
  return `# Ürün Spesifikasyonu: ${projectName}

## 1. Özet ve hedef kullanıcı
Bu belge yalnızca PEFT dataset export smoke testi için oluşturulmuş izole test verisidir.
Hedef kullanıcı, ürün spesifikasyonlarını onaylayan geliştirme ve ürün ekipleridir.

## 2. Problem tanımı ve kapsam
Onaylı product_spec belgelerinden offline JSONL export pipeline'ının uçtan uca doğrulanması gerekiyor.
Kapsam: fingerprint gate, kalite gate, train/val split ve manifest yazımı.

## 3. Ürün gereksinimleri
- CLI tabanlı export (HTTP API değil)
- Approved + succeeded + product_spec filtresi
- Prompt rebuild ile messages dizisi
- Minimum kalite skoru ve bölüm kapsamı kontrolü

## 4. Mimari kararlar
Clean/hexagonal mimari; Postgres repository; export use case orchestration.
PromptBuilder ve WorkspaceContextBuilder generate akışı ile paylaşılır.

## 5. AI / LLM kullanımı
Generate aşamasında mock LLM kullanılır; export sırasında assistant gövdesi DB'den okunur.
Sistem ve kullanıcı promptları export anında yeniden üretilir.

## 6. MCP ve otomasyon entegrasyonları
MCP katmanı agent erişimi için planlanmıştır; bu smoke verisi entegrasyon detayı içermez.

## 7. Güvenlik ve uyumluluk
Multi-tenant org izolasyonu; JWT auth; mevcut production kayıtları değiştirilmez.

## 8. Gözlemlenebilirlik ve operasyon
Export manifest skip_reasons içerir; dry-run modu aday sayısını raporlar.

## 9. Açık sorular ve eksikler
Gerçek LLM çıktısı ile tam entegrasyon testi ayrı fazda yapılacaktır.
`;
}

function psqlScalar(sql) {
  const out = psqlExec(sql);
  const line = out.split("\n").map((l) => l.trim()).find((l) => /^\d+$/.test(l));
  return line ? Number(line) : 0;
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const noSqlPatch =
  process.argv.includes("--no-sql-patch") ||
  process.env.PEFT_SEED_NO_SQL_PATCH === "1";

const ts = Date.now();
const email = `smoke_peft_${ts}@example.com`;
const password = "SmokeTest123!";
const orgSlug = `smokepeft${String(ts).slice(-6)}`;
const projectName = "PEFT Smoke Test";

try {
  await api("POST", "/auth/register", {
    body: { email, password, first_name: "PEFT", last_name: "Smoke" },
  });
  const login = await api("POST", "/auth/login", { body: { email, password } });
  const token = login.data.token;
  console.log(`PASS  auth — ${email}`);

  const org = await api("POST", "/organizations", {
    token,
    body: { name: "PEFT Smoke Org", slug: orgSlug },
  });
  const orgId = org.data.id;

  const ws = await api("POST", `/organizations/${orgId}/workspaces`, {
    token,
    orgId,
    body: {
      name: "PEFT Smoke WS",
      slug: "peftsmokews",
      description: "isolated PEFT export smoke",
    },
  });
  const workspaceId = ws.data.id;
  console.log(`PASS  org+workspace — org=${orgId} ws=${workspaceId}`);

  await api("PUT", `/workspaces/${workspaceId}/profile`, {
    token,
    orgId,
    workspaceId,
    body: {
      project_name: projectName,
      project_description: "Isolated PEFT export smoke workspace",
      product_type: "web",
      preferred_document_language: "tr",
      project_status: "planned",
    },
  });
  console.log("PASS  profile upsert");

  const gen = await api("POST", `/workspaces/${workspaceId}/documents/generate`, {
    token,
    orgId,
    workspaceId,
    body: {
      title: "PEFT Smoke Product Spec",
      language: "tr",
      document_type: "product_spec",
    },
    expect: [201],
  });
  const docId = gen.data.id;
  const fp = gen.data.source_fingerprint || "";
  if (!docId || gen.data.status !== "succeeded") {
    throw new Error(`unexpected generate response: ${JSON.stringify(gen.data)}`);
  }
  const docType = gen.data.document_type || "studio_markdown";
  console.log(
    `PASS  generate — id=${docId} type=${docType} fp_len=${fp.length} provider=${gen.data.provider_name}`,
  );

  const body = buildProductSpecBody(projectName);
  const needsPatch =
    docType !== "product_spec" ||
    (gen.data.markdown_body || "").length < 200 ||
    !gen.data.quality?.section_coverage_ok;
  if (needsPatch) {
    if (noSqlPatch) {
      throw new Error(
        `generate output not export-eligible without SQL patch (type=${docType} body_len=${(gen.data.markdown_body || "").length} section_coverage_ok=${gen.data.quality?.section_coverage_ok}) — rebuild API + mock-llm`,
      );
    }
    psqlExec(
      `UPDATE generated_documents SET document_type = 'product_spec', markdown_body = ${sqlLiteral(body)} WHERE id = '${docId}'::uuid;`,
    );
    console.log(
      `PASS  patch product_spec body${docType !== "product_spec" ? " (legacy API defaulted to studio_markdown)" : ""}`,
    );
  } else {
    console.log(
      `PASS  generate product_spec (no SQL patch) — quality=${gen.data.quality?.quality_score} section_coverage_ok=${gen.data.quality?.section_coverage_ok}`,
    );
  }

  const approved = await api("POST", `/workspaces/${workspaceId}/documents/${docId}/approve`, {
    token,
    orgId,
    workspaceId,
  });
  if (approved.data?.approval_status !== "approved") {
    throw new Error(`approve failed: ${JSON.stringify(approved.data)}`);
  }
  console.log("PASS  approve document");

  const verify = psqlScalar(`
SELECT COUNT(*)
FROM generated_documents
WHERE organization_id = '${orgId}'::uuid
  AND document_type = 'product_spec'
  AND status = 'succeeded'
  AND approval_status = 'approved'
  AND markdown_body <> ''
  AND COALESCE(source_fingerprint, '') <> '';`);
  if (verify < 1) {
    throw new Error("post-seed verification failed");
  }
  console.log(`PASS  verify candidate — count=${verify}`);

  console.log("");
  console.log("=== PEFT seed complete ===");
  console.log(`ORG_ID=${orgId}`);
  console.log(`WORKSPACE_ID=${workspaceId}`);
  console.log(`DOCUMENT_ID=${docId}`);
  console.log("");
  console.log(`Next: node ./scripts/smoke_peft_export.mjs --org-id=${orgId}`);
} catch (err) {
  console.error(`FAIL  ${err.message}`);
  process.exit(1);
}
