import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildAnswersForQuestions, getDevOpsPreferences } from "./lib/peft_dataset_answers.mjs";
import { SCENARIOS } from "./lib/peft_dataset_scenarios.mjs";
import {
  countForeignScript,
  countPlaceholders,
  countRawKeys,
  isTruncatedOutput,
  runQualityGate,
  shouldApproveDocument,
} from "./lib/peft_quality_gate.mjs";
import { assessDocumentQuality, redactSecrets } from "./lib/peft_dataset_utils.mjs";

const VALID_SPEC = `# Ürün Spesifikasyonu

## 1. Özet ve hedef kullanıcı
Bu platform, kırsal üreticilerin dijital pazara erişimini kolaylaştırır. Hedef kullanıcılar küçük ölçekli çiftçiler ve kooperatif yöneticileridir.

## 2. Problem tanımı
Üreticiler fiyat şeffaflığı ve lojistik planlama konusunda zorluk yaşar.

## 3. Fonksiyonel gereksinimler
- Ürün listeleme ve stok takibi
- Sipariş yönetimi ve bildirimler

## 4. Mimari ve teknoloji
REST API ve PostgreSQL kullanılır. Docker ile konteynerize edilir.

## 5. Güvenlik
JWT tabanlı kimlik doğrulama, RBAC ve KVKK uyumu zorunludur.

## 6. Entegrasyonlar
GitHub Actions ile CI/CD, merkezi log toplama.

## 7. Kabul kriterleri
- API yanıt süresi %95 istekte 500 ms altında olmalıdır.
- Kritik iş akışlarında hata oranı %0,5 altında kalmalıdır.

## 8. Açık sorular
Mobil offline senkronizasyon kapsamı netleştirilecektir.

## 9. Sonraki adımlar
Pilot bölgede 30 gün içinde canlıya alınacaktır.
`;

describe("peft_quality_gate", () => {
  it("CJK karakter içeren belge kalite gate'inden geçmez", () => {
    const gate = runQualityGate(`${VALID_SPEC}\n한글 metin`);
    assert.equal(gate.quality_gate_passed, false);
    assert.ok(gate.foreign_script_count > 0);
  });

  it("-önlem- placeholder içeren belge geçmez", () => {
    const gate = runQualityGate(`${VALID_SPEC}\n-önlem- alanı doldurulacak.`);
    assert.equal(gate.quality_gate_passed, false);
    assert.ok(gate.placeholder_count > 0);
  });

  it("yoğun snake_case anahtar içeren belge geçmez", () => {
    const body = `${VALID_SPEC}\nnew_user_onboarding_checklist structured_json_centralized internal_user_role_map audit_log_retention_days deployment_pipeline_config extra_feature_flag_matrix kullanılacak.`;
    assert.ok(countRawKeys(body) >= 5);
    const gate = runQualityGate(body + "\n" + VALID_SPEC);
    assert.equal(gate.quality_gate_passed, false);
  });

  it("tam Türkçe ve teknik terimler içeren belge geçer", () => {
    const body = VALID_SPEC + "\n" + VALID_SPEC;
    const gate = runQualityGate(body);
    assert.equal(gate.quality_gate_passed, true, gate.quality_gate_reasons.join(","));
    assert.equal(gate.foreign_script_count, 0);
  });

  it("API REST JWT PostgreSQL yanlış pozitif oluşturmaz", () => {
    assert.equal(countForeignScript("REST API ve JWT ile PostgreSQL"), 0);
    assert.equal(countRawKeys("REST API JWT PostgreSQL Docker Grafana GitHub JSON KVKK"), 0);
  });

  it("sonu yarım kalan belge geçmez", () => {
    const truncated = `## 1. Özet\nTam cümle.\n## 9. Açık sorular\nDevam edecek,`;
    assert.equal(isTruncatedOutput(truncated), true);
    const gate = runQualityGate(truncated.repeat(30), { minLength: 100 });
    assert.equal(gate.truncated_output, true);
    assert.equal(gate.quality_gate_passed, false);
  });

  it("dokuz başlığı olan ancak boş bölümlü belge geçmez", () => {
    const sparse = `
## 1. Özet
kısa
## 2. Problem

## 3. Gereksinim

## 4. Mimari

## 5. Güvenlik

## 6. Entegrasyon

## 7. Kabul

## 8. Açık

## 9. Sonraki
`.repeat(5);
    const gate = runQualityGate(sparse);
    assert.equal(gate.quality_gate_passed, false);
  });

  it("senaryo bazlı environments eşlemesi yalnızca local döndürmez", () => {
    const questions = [
      {
        id: "env",
        key: "environments",
        title: "Ortamlar",
        input_type: "multi_select",
        required: true,
        active: true,
        options: [
          { value: "local", label: "Local" },
          { value: "dev", label: "Dev" },
          { value: "staging", label: "Staging" },
          { value: "prod", label: "Production" },
        ],
      },
    ];
    const scenario = SCENARIOS.find((s) => s.key === "finops-cost-dashboard");
    const { answers } = buildAnswersForQuestions(questions, scenario, "tr");
    assert.ok(Array.isArray(answers[0].value));
    assert.equal(answers[0].value.includes("local"), false);
    assert.ok(answers[0].value.length >= 2);
  });

  it("finops senaryosu için logging ve branching tercihleri anlamlıdır", () => {
    const scenario = SCENARIOS.find((s) => s.key === "finops-cost-dashboard");
    const prefs = getDevOpsPreferences(scenario);
    assert.ok(prefs.logging_approach.includes("centralized"));
    assert.ok(prefs.branching_strategy.includes("github_flow"));
    assert.equal(prefs.ci_tests_required, true);
  });

  it("quality score yüksek olsa da kalite gate başarısızsa onay verilmez", () => {
    const doc = {
      status: "succeeded",
      document_type: "product_spec",
      markdown_body: `${VALID_SPEC}\n한글`,
      quality: { quality_score: 100, section_coverage_ok: true },
    };
    const quality = assessDocumentQuality(doc);
    assert.equal(quality.approve_eligible, false);
    assert.equal(shouldApproveDocument(doc, quality.quality_gate), false);
  });

  it("regenerate akışında yeni belge oluşturulur, eski belge değişmez", () => {
    const oldId = "3849a120-8e27-49f8-bd5c-9a4cf0da688b";
    const newId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    assert.notEqual(oldId, newId);
  });

  it("secret veya credential loglanmaz", () => {
    const msg = "Authorization: Bearer sk-live-secret123 hf_abc123";
    const redacted = redactSecrets(msg);
    assert.equal(redacted.includes("sk-live-secret123"), false);
    assert.equal(redacted.includes("hf_abc123"), false);
    assert.match(redacted, /REDACTED/);
  });
});
