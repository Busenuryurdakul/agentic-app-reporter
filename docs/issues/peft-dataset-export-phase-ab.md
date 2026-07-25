# Issue: PEFT Dataset Export — Faz A & B

**Labels:** `enhancement`, `peft`, `dataset-export`, `phase-ab`  
**Epic:** Product Specs → PEFT pipeline  
**Blocked by:** Product Spec schema + `product_spec` document type (done)  
**Blocks:** Faz C (CLI), Faz D (integration smoke)

---

## Summary

Onaylı `product_spec` belgelerinden PEFT eğitimi için **system / user / assistant** mesajlı JSONL export.  
Faz A–B: repository sorgusu + application use case + serializer iskeleti (CLI Faz C'de).

**Güvenlik:** HTTP endpoint yok; prompt persist edilmez, export anında reconstruct edilir.

---

## Acceptance criteria (Faz A–B)

- [ ] `ListForPEFTExport` yalnızca `approved` + `succeeded` + `product_spec` döner
- [ ] `ExportPEFTDatasetUseCase` fingerprint gate + quality gate iskeleti tanımlı
- [ ] JSONL serializer 3 mesajlı satır şemasını doğrular
- [ ] Tüm yeni paketler `go test ./...` ile derlenir
- [ ] Test case listesi `t.Run` + `t.Skip` ile kayıtlı (implementasyon Faz B devam)

---

## Faz A — Domain + Repository

### Dosya iskeleti

```
backend/internal/domain/document/repository/
  peft_export.go              # PEFTExportFilter, Validate()
  document_repository.go      # + ListForPEFTExport(...)

backend/internal/infrastructure/postgres/document/
  peft_export.go              # SQL implementasyonu
  peft_export_test.go         # filter + SQL unit testleri

backend/internal/infrastructure/postgres/migrations/
  00018_peft_export_index.sql # composite partial index (opsiyonel)
```

### Checklist — implementasyon

- [ ] **A1** `PEFTExportFilter` struct (`OrganizationID`, `WorkspaceID`, `Since`, `Limit`)
- [ ] **A2** `PEFTExportFilter.Validate()` — `organization_id` zorunlu
- [ ] **A3** `DocumentRepository.ListForPEFTExport(ctx, filter)` interface
- [ ] **A4** Postgres SQL:
  - `status = 'succeeded'`
  - `approval_status = 'approved'`
  - `document_type = 'product_spec'`
  - `markdown_body <> ''`
  - org / workspace / since filtreleri
  - `ORDER BY approved_at ASC, created_at ASC`
- [ ] **A5** Migration `00018_peft_export_index` (partial index)
- [ ] **A6** Mevcut test mock'larına `ListForPEFTExport` stub eklendi

### Test case listesi — Faz A

| ID | Test | Dosya | Durum |
|----|------|-------|-------|
| A-T1 | `Validate_RequiresOrganizationID` | `peft_export_test.go` (domain) | [ ] |
| A-T2 | `Validate_AcceptsOptionalWorkspaceAndSince` | `peft_export_test.go` (domain) | [ ] |
| A-T3 | `ListForPEFTExport_RejectsNilOrganization` | `peft_export_test.go` (postgres) | [ ] |
| A-T4 | `ListForPEFTExport_FiltersApprovedProductSpecOnly` | `peft_export_test.go` (postgres, integration) | [ ] |
| A-T5 | `ListForPEFTExport_RespectsSinceAndWorkspace` | integration | [ ] |
| A-T6 | `ListForPEFTExport_OrdersByApprovedAt` | integration | [ ] |
| A-T7 | `ListForPEFTExport_ExcludesEmptyMarkdownBody` | integration | [ ] |

---

## Faz B — Application (use case + serializer)

### Dosya iskeleti

```
backend/internal/application/datasetexport/
  dto/
    export_options.go     # CLI/use case options (Dedupe, Split, MinQuality, …)
    dataset_row.go        # DatasetRow, Message, Metadata
    manifest.go           # ExportManifest, SkipReason counts
  serializer/
    jsonl.go              # EncodeLine, ValidateRow
    jsonl_test.go
  usecase/
    deps.go               # ContextRebuilder, PromptAssembler ports
    export_peft_dataset.go
    export_peft_dataset_test.go
```

### Checklist — implementasyon

- [x] **B1** `ContextRebuilder` port — `Rebuild(ctx, workspaceID, language) → WorkspaceLLMContext`
- [x] **B2** `PromptAssembler` port — `Build(ctx, documentType) → GenerateRequest` (+ `GenerationContextRebuilder` / `GenerationPromptAssembler` adapters)
- [x] **B3** `ExportPEFTDatasetUseCase.Execute` orchestration
- [x] **B4** `serializer.EncodeLine(row)` — UTF-8 JSON + trailing `\n`
- [x] **B5** `serializer.ValidateRow(row)` — 3 message, roles, non-empty content
- [x] **B6** `ExportManifest` — counts, skip_reasons, split stats
- [x] **B7** Assistant body secret scan (`ScanAssistantSecrets`)

### Test case listesi — Faz B (use case)

| ID | Test | Durum |
|----|------|-------|
| B-T1 | `Export_IncludesOnlyApprovedProductSpec` | [x] |
| B-T2 | `Export_SkipsDraftAndFailed` | [ ] (SQL — A-T4) |
| B-T3 | `Export_SkipsStudioMarkdown` | [ ] (SQL — A-T4) |
| B-T4 | `Export_SkipsFingerprintMismatch` | [x] |
| B-T5 | `Export_SkipsEmptySourceFingerprintWhenStrict` | [x] |
| B-T6 | `Export_IncludesLegacyNoFingerprintWhenFlagSet` | [x] |
| B-T7 | `Export_BuildsThreeMessageRow` | [x] |
| B-T8 | `Export_AssistantContentEqualsMarkdownBody` | [x] |
| B-T9 | `Export_SkipsEmptyAssistantBody` | [x] |
| B-T10 | `Export_SkipsBelowMinQualityScore` | [x] |
| B-T11 | `Export_SkipsWhenSectionCoverageFails` | [x] |
| B-T12 | `Export_AllowLowQualityFlagBypassesSectionCoverage` | [x] |
| B-T13 | `Export_DedupeFingerprintKeepsLatestApproved` | [x] |
| B-T14 | `Export_DedupeWorkspaceLatest` | [x] |
| B-T15 | `Export_SplitByWorkspaceNoLeakage` | [x] |
| B-T16 | `Export_RedactsSecretsInUserPrompt` | [x] |
| B-T17 | `Export_SkipsWhenWorkspaceNotFound` | [x] |
| B-T18 | `Export_DryRunReturnsManifestOnly` | [x] |
| B-T19 | `Export_EmptyCandidatesReturnsErrNoRows` | [x] |

### Test case listesi — Faz B (serializer)

| ID | Test | Dosya | Durum |
|----|------|-------|-------|
| B-S1 | `ValidateRow_RequiresThreeMessages` | `jsonl_test.go` | [ ] |
| B-S2 | `ValidateRow_RequiresSystemUserAssistantOrder` | `jsonl_test.go` | [ ] |
| B-S3 | `ValidateRow_RejectsEmptyContent` | `jsonl_test.go` | [ ] |
| B-S4 | `EncodeLine_ProducesSingleLineUTF8` | `jsonl_test.go` | [ ] |
| B-S5 | `EncodeLine_PreservesTurkishCharacters` | `jsonl_test.go` | [ ] |
| B-S6 | `GoldenRow_MatchesFixture` | `testdata/product_spec_row.jsonl` | [ ] |

---

## JSONL satır sözleşmesi (referans)

```json
{
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "metadata": {
    "document_id": "uuid",
    "workspace_id": "uuid",
    "organization_id": "uuid",
    "document_type": "product_spec",
    "language": "tr",
    "source_fingerprint": "sha256hex",
    "rebuilt_fingerprint": "sha256hex",
    "export_version": "1"
  }
}
```

---

## Bağımlılıklar (reuse, kopyalama yok)

| Bileşen | Kaynak |
|---------|--------|
| Context rebuild | `generation/usecase.WorkspaceContextBuilder` |
| Prompt build | `generation/usecase.PromptBuilder` |
| Sanitize | `generation/usecase.sanitizeJSONValue` (context builder içinde) |
| Quality | `document/quality.EvaluateForType` |
| Fingerprint | `WorkspaceLLMContext.Fingerprint()` |

---

## Faz C — CLI (Done)

```
backend/cmd/export-peft-dataset/main.go
Makefile: export-peft-dataset
```

### Checklist

- [x] Flags → `ExportOptions`
- [x] Postgres wiring (context builder + document repo)
- [x] `WriteExportArtifacts` (train/val/manifest/skipped)
- [x] Exit codes 0 / 1 / 2 / 3
- [x] `make export-peft-dataset ORG_ID=...`
- [x] `.gitignore` → `peft-export/`

### Usage

```bash
go run ./cmd/export-peft-dataset --org-id=<ORG_UUID> --dry-run --verbose
make export-peft-dataset ORG_ID=<ORG_UUID> OUT_DIR=./peft-export
node ./scripts/smoke_peft_export.mjs
```

---

## Faz D — Postgres integration smoke

**Durum:** Kısmi — altyapı OK, onaylı `product_spec` adayı yok

| Kontrol | Sonuç |
|---------|--------|
| Migration 00018 | Uygulandı |
| Index `idx_generated_documents_peft_export` | Var |
| PostgreSQL | `masterfabric-postgres` healthy |
| Organizations | 21 |
| Workspaces | 9 |
| Approved `product_spec` | **0** |
| CLI dry-run (DB pipeline) | OK (`candidates=0`, exit 2) |
| Full JSONL export | **Atlandı** (dry-run exported=0) |

Smoke: `backend/scripts/smoke_peft_export.mjs`

---

## PR checklist

- [ ] `go test ./internal/domain/document/... ./internal/application/datasetexport/...`
- [ ] `go vet ./...`
- [ ] Mock'lar güncellendi (generation, export, observe test paketleri)
- [ ] `docs/product-spec-schema.md` → JSONL bölümüne link
- [ ] `.gitignore` → `peft-export/` (Faz C)

---

## İlgili dokümanlar

- [Product Spec şeması](../product-spec-schema.md)
- [Architecture decisions](../architecture-decisions.md)
