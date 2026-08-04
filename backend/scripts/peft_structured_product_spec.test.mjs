import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  STRUCTURED_MARKDOWN_PREFIX,
  countStructuredHeadings,
  isStructuredMarkdown,
  runQualityGate,
  shouldApproveDocument,
} from "./lib/peft_quality_gate.mjs";
import { assessDocumentQuality, redactSecrets } from "./lib/peft_dataset_utils.mjs";

const SAMPLE_MD = `# Product Spec: Demo

## 1. Proje Özeti

- **Proje adı:** Demo

## 2. Problem, Hedefler ve Başarı Ölçütleri

- **Problem:** Dağınık süreçler

## 3. Kullanıcılar ve Roller

### Operasyon Uzmanı

## 4. Fonksiyonel Gereksinimler

### FR-001: Liste

## 5. Fonksiyonel Olmayan Gereksinimler

**Performans:**

- p95 400 ms

## 6. Teknik Mimari

- **Mimari stil:** Monolith

## 7. Veri Modeli

### Incident

## 8. Güvenlik ve Gizlilik

- **Kimlik doğrulama:** JWT

## 9. Yol Haritası ve Kabul Kriterleri

### MVP

**Çıkış kriterleri:**

- 10 pilot kullanıcı ile test tamamlanmalı.
`;

describe("structured product spec quality", () => {
  it("structured markdown prefix tanınır", () => {
    assert.equal(isStructuredMarkdown(SAMPLE_MD), true);
  });

  it("dokuz structured başlık sayılır", () => {
    assert.equal(countStructuredHeadings(SAMPLE_MD), 9);
  });

  it("structured validation PASS olmadan gate PASS olmaz", () => {
    const gate = runQualityGate(SAMPLE_MD.repeat(3), {
      structuredMeta: { structured_output_valid: false, markdown_render_succeeded: false },
    });
    assert.equal(gate.quality_gate_passed, false);
  });

  it("structured meta ile gate structured alanları döner", () => {
    const gate = runQualityGate(SAMPLE_MD.repeat(3), {
      structuredMeta: {
        structured_output_valid: true,
        structured_repair_attempts: 1,
        markdown_render_succeeded: true,
        required_field_coverage: 1,
      },
    });
    assert.equal(gate.structured_output_valid, true);
    assert.equal(gate.structured_repair_attempts, 1);
    assert.equal(gate.markdown_render_succeeded, true);
  });

  it("structured_output_valid false iken approve verilmez", () => {
    const doc = {
      status: "succeeded",
      document_type: "product_spec",
      markdown_body: SAMPLE_MD.repeat(3),
      quality: { quality_score: 100 },
      structured_generation: { structured_output_valid: false },
    };
    const q = assessDocumentQuality(doc);
    assert.equal(q.approve_eligible, false);
  });

  it("structured geçerli ve gate geçerse approve mümkün", () => {
    const body = SAMPLE_MD.repeat(6);
    const doc = {
      status: "succeeded",
      document_type: "product_spec",
      markdown_body: body,
      quality: { quality_score: 100, section_coverage_ok: true },
      structured_generation: {
        structured_output_valid: true,
        markdown_render_succeeded: true,
        json_parse_succeeded: true,
      },
    };
    const q = assessDocumentQuality(doc);
    assert.equal(q.approve_eligible, true, JSON.stringify(q.errors));
    assert.equal(shouldApproveDocument(doc, q.quality_gate), true);
  });

  it("secret loglanmaz", () => {
    const redacted = redactSecrets("Bearer sk-test hf_abc");
    assert.match(redacted, /REDACTED/);
  });
});

describe("structured markdown contract", () => {
  it("prefix sabit kalır", () => {
    assert.equal(STRUCTURED_MARKDOWN_PREFIX, "# Product Spec:");
  });
});
