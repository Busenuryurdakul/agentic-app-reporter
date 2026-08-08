/** Shared helpers for PEFT smoke seed scripts. */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Must stay in sync with deployments/finetune/analysis.py and dto/smoke_marker.go */
export const SMOKE_DATASET_MARKER = "[[PEFT_SMOKE_TEST]]";

export const backendRoot = path.resolve(__dirname, "..");
export const API = process.env.API_BASE || "http://localhost:8080/api/v1";

export async function api(method, pathSuffix, { token, orgId, workspaceId, body, expect } = {}) {
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

export function psqlExec(sql) {
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

export function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function buildProductSpecBody(projectName, runTag = "") {
  const tagLine = runTag ? `\nRun: ${runTag}\n` : "";
  return `# Ürün Spesifikasyonu: ${projectName}
${SMOKE_DATASET_MARKER}${tagLine}

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

export async function seedOneWorkspace({
  token,
  orgId,
  ts,
  index,
  noSqlPatch,
}) {
  const suffix = `${ts}${index}`;
  const workspaceSlug = `peftsmoke${suffix}`;
  const projectName = `PEFT Smoke Test ${suffix}`;
  const documentTitle = `PEFT Smoke Product Spec [TEST-${suffix}]`;

  const ws = await api("POST", `/organizations/${orgId}/workspaces`, {
    token,
    orgId,
    body: {
      name: `PEFT Smoke WS ${suffix}`,
      slug: workspaceSlug,
      description: `${SMOKE_DATASET_MARKER} isolated PEFT export smoke — not for production fine-tuning`,
    },
  });
  const workspaceId = ws.data.id;

  await api("PUT", `/workspaces/${workspaceId}/profile`, {
    token,
    orgId,
    workspaceId,
    body: {
      project_name: projectName,
      project_description: `${SMOKE_DATASET_MARKER} isolated smoke workspace — not production training data`,
      product_type: "web",
      preferred_document_language: "tr",
      project_status: "planned",
    },
  });

  const gen = await api("POST", `/workspaces/${workspaceId}/documents/generate`, {
    token,
    orgId,
    workspaceId,
    body: {
      title: documentTitle,
      language: "tr",
      document_type: "product_spec",
    },
    expect: [201],
  });
  const docId = gen.data.id;
  if (!docId || gen.data.status !== "succeeded") {
    throw new Error(`unexpected generate response: ${JSON.stringify(gen.data)}`);
  }

  const body = buildProductSpecBody(projectName, suffix);
  const docType = gen.data.document_type || "studio_markdown";
  const needsPatch =
    docType !== "product_spec" ||
    (gen.data.markdown_body || "").length < 200 ||
    !gen.data.quality?.section_coverage_ok;

  if (needsPatch) {
    if (noSqlPatch) {
      throw new Error(
        `workspace ${index}: generate output not export-eligible without SQL patch`,
      );
    }
    psqlExec(
      `UPDATE generated_documents SET document_type = 'product_spec', markdown_body = ${sqlLiteral(body)} WHERE id = '${docId}'::uuid;`,
    );
  }

  await api("POST", `/workspaces/${workspaceId}/documents/${docId}/approve`, {
    token,
    orgId,
    workspaceId,
  });

  return { workspaceId, docId, projectName };
}
