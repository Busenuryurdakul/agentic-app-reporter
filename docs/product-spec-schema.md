# Product Spec — Veri ve Format Şeması

**Ürün:** AI Development Configuration Studio  
**Belge tipi:** `product_spec`  
**Durum:** Phase 6 — Product Specs (ilk dilim)

---

## Amaç

Product Spec, workspace profili ve anket cevaplarından üretilen **yapılandırılmış ürün spesifikasyonu** Markdown belgesidir. Studio'nun genel `studio_markdown` belgesinden farkı:

| Özellik | `studio_markdown` | `product_spec` |
|---------|-------------------|----------------|
| Yapı | Serbest yapılandırma belgesi | 9 zorunlu numaralı bölüm |
| Hedef kitle | Mühendislik ekipleri (genel) | Ürün + mimari karar kaydı |
| MCP bölümü | Yok | Bölüm 6 (MCP/otomasyon) |
| Kalite metriği | Başlık + uzunluk | + bölüm kapsamı (`section_coverage_ok`) |

Bu şema, ileride PEFT eğitim verisi export'u ve onaylı spec'lerin dataset olarak kullanılması için temel formatı tanımlar.

---

## API

Üretim isteği (mevcut endpoint):

```http
POST /api/v1/workspaces/{workspaceId}/documents/generate
Authorization: Bearer …
X-Organization-ID: …

{
  "title": "Ürün Spesifikasyonu — Demo",
  "language": "tr",
  "document_type": "product_spec"
}
```

| Alan | Zorunlu | Değerler | Varsayılan |
|------|---------|----------|------------|
| `document_type` | Hayır | `studio_markdown`, `product_spec` | `studio_markdown` |
| `language` | Hayır | `tr`, `en` | Workspace tercihi |
| `title` | Hayır | Serbest metin | Tip + dile göre varsayılan başlık |

Regenerate, kaynak belgenin `document_type` değerini korur.

---

## Markdown yapısı

### H1 — Belge başlığı

```markdown
# Ürün Spesifikasyonu: {proje_adı}
```

İngilizce:

```markdown
# Product Specification: {project_name}
```

### H2 — Zorunlu bölümler (sıra sabit)

#### Türkçe (`language: tr`)

| # | Bölüm ID | Başlık |
|---|----------|--------|
| 1 | `summary` | Özet ve hedef kullanıcı |
| 2 | `problem_scope` | Problem tanımı ve kapsam |
| 3 | `requirements` | Ürün gereksinimleri |
| 4 | `architecture` | Mimari kararlar |
| 5 | `ai_usage` | AI / LLM kullanımı |
| 6 | `mcp_integrations` | MCP ve otomasyon entegrasyonları |
| 7 | `security` | Güvenlik ve uyumluluk |
| 8 | `observability` | Gözlemlenebilirlik ve operasyon |
| 9 | `open_questions` | Açık sorular ve eksikler |

Örnek başlık satırı:

```markdown
## 1. Özet ve hedef kullanıcı
```

#### English (`language: en`)

| # | Section ID | Heading |
|---|------------|---------|
| 1 | `summary` | Summary and target users |
| 2 | `problem_scope` | Problem statement and scope |
| 3 | `requirements` | Product requirements |
| 4 | `architecture` | Architecture decisions |
| 5 | `ai_usage` | AI / LLM usage |
| 6 | `mcp_integrations` | MCP and automation integrations |
| 7 | `security` | Security and compliance |
| 8 | `observability` | Observability and operations |
| 9 | `open_questions` | Open questions and gaps |

---

## Bölüm içerik rehberi

### 1. Özet ve hedef kullanıcı
- Profil: `project_name`, `project_description`, `target_users`, `product_type`
- 2–4 cümle executive özet

### 2. Problem tanımı ve kapsam
- `main_problem`, `main_use_cases`, `project_status`
- **Kapsam içi / dışı** maddeler (In scope / Out of scope)

### 3. Ürün gereksinimleri
- Fonksiyonel gereksinimler (test edilebilir madde işaretleri)
- Non-functional gereksinimler (performans, erişilebilirlik, dil)

### 4. Mimari kararlar
- Platform bağımsızlık ilkesi
- Monorepo / servis sınırları
- Veri katmanı (PostgreSQL, Redis, vb.)

### 5. AI / LLM kullanımı
- Anket: AI/LLM ile ilgili cevaplar
- **Backend-only inference** tercihi (tarayıcı LLM yok)
- Provider abstraction (`LLMProvider` portu)

### 6. MCP ve otomasyon entegrasyonları
- Anket anahtarları: `uses_mcp`, `mcp_servers_list`, `automation_workflows`
- Backend MCP vs WebMCP ayrımı — [`docs/mcp-webmcp-integration.md`](../../docs/mcp-webmcp-integration.md) · runtime Backend MCP: [`docs/mcp-backend-integration.md`](../../docs/mcp-backend-integration.md)
- Hangi iş akışlarının agent/tool ile destekleneceği

### 7. Güvenlik ve uyumluluk
- Kimlik doğrulama, RBAC, multi-tenancy (`organization_id`, `app_id`)
- Gizli bilgi redaksiyonu (prompt loglama yok)

### 8. Gözlemlenebilirlik ve operasyon
- Metrikler, loglama, deployment ortamları
- Export / onay akışı

### 9. Açık sorular ve eksikler
- Generate sırasında `MissingRequired` listesindeki alanlar
- Bilinçli ertelenen kararlar

---

## Kalite heuristikleri

Backend `quality.EvaluateForType(..., "product_spec")` şunları ölçer:

| Sinyal | Koşul | Puan |
|--------|-------|------|
| `has_heading` | En az bir ATX başlık | 30 |
| `min_length_ok` | ≥ 200 karakter (rune) | 30 |
| `language_declared` | `tr` veya `en` | 20 |
| `section_coverage_ok` | 9 bölümden ≥ 6'sı başlık metninde | 20 |

Maksimum skor: **100**

---

## Kod referansları

| Katman | Dosya |
|--------|-------|
| Domain — tip sabitleri | `backend/internal/domain/document/model/document_type.go` |
| Domain — bölüm şeması | `backend/internal/domain/document/productspec/schema.go` |
| Application — prompt | `backend/internal/application/generation/usecase/prompt_builder.go` |
| Application — generate | `backend/internal/application/generation/usecase/generate_document.go` |
| Kalite | `backend/internal/domain/document/quality/quality.go` |

---

## PEFT veri export (CLI — uygulandı)

Onaylı `product_spec` belgeleri offline JSONL export ile PEFT eğitim verisine dönüştürülür:

```bash
go run ./cmd/export-peft-dataset --org-id=<ORG_UUID> --dry-run --verbose
make export-peft-dataset ORG_ID=<ORG_UUID> OUT_DIR=./peft-export
node ./scripts/smoke_peft_seed.mjs --no-sql-patch
node ./scripts/smoke_peft_export.mjs --org-id=<ORG_UUID>
```

JSONL satır şeması (`messages`: system / user / assistant):

```json
{
  "messages": [
    { "role": "system", "content": "…" },
    { "role": "user", "content": "…" },
    { "role": "assistant", "content": "…" }
  ],
  "metadata": {
    "document_type": "product_spec",
    "language": "tr",
    "source_fingerprint": "…",
    "export_version": "1"
  }
}
```

Detay: [peft-dataset-export-phase-ab.md](./issues/peft-dataset-export-phase-ab.md), [backend/STUDIO.md](../backend/STUDIO.md).

Fine-tune (Unsloth LoRA, GPU host): [backend/deployments/finetune/README.md](../backend/deployments/finetune/README.md).

---

## Örnek iskelet (TR)

```markdown
# Ürün Spesifikasyonu: AI Development Configuration Studio

## 1. Özet ve hedef kullanıcı

…

## 2. Problem tanımı ve kapsam

**Kapsam içi**
- …

**Kapsam dışı**
- …

## 3. Ürün gereksinimleri

- …

## 4. Mimari kararlar

…

## 5. AI / LLM kullanımı

…

## 6. MCP ve otomasyon entegrasyonları

…

## 7. Güvenlik ve uyumluluk

…

## 8. Gözlemlenebilirlik ve operasyon

…

## 9. Açık sorular ve eksikler

- …
```
