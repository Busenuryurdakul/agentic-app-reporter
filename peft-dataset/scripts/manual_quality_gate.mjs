/**
 * Training v2 — Manuel kalite kapısı (30 stratified örnek, seed=42).
 * Run: node scripts/manual_quality_gate.mjs
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rawPath = path.join(root, "data", "raw_examples.json");
const outputDir = path.join(root, "data", "output");

const CATEGORIES = [
  "product_spec",
  "project_planning",
  "requirement_analysis",
  "technical_documentation",
  "risk_analysis",
  "user_story",
];

const PS_SECTIONS = [
  "ürün özeti", "problem", "hedef kullanıcı", "amaçlar", "kapsam",
  "fonksiyonel gereksinim", "fonksiyonel olmayan", "riskler", "başarı ölçüt",
];

const BOILERPLATE = [
  /client\s*→\s*api gateway/i,
  /fr-\d+-01:\s*kayıt oluşturma/i,
  /operasyonel verimlilik,\s*hata oranında azalma/i,
  /given\s+.+\s+portalına giriş yaptığında when/i,
  /legacy kayıttan taşınan/i,
  /program yönetimi koordinasyonu,\s*teknik lider mimari/i,
];

function createRng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, rng) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function stratifiedSplit(records, valRatio = 0.2, seed = 42) {
  const indexed = records.map((r, idx) => ({ ...r, _idx: idx }));
  const byCat = {};
  for (const r of indexed) {
    byCat[r.category] = byCat[r.category] || [];
    byCat[r.category].push(r);
  }
  const train = [];
  const val = [];
  for (const [category, items] of Object.entries(byCat)) {
    const catSeed = seed + hashString(category);
    const shuffled = shuffle(items, createRng(catSeed));
    const valCount = shuffled.length <= 1 ? 0 : Math.max(1, Math.round(shuffled.length * valRatio));
    train.push(...shuffled.slice(0, shuffled.length - valCount).map((r) => ({ ...r, split: "train" })));
    val.push(...shuffled.slice(shuffled.length - valCount).map((r) => ({ ...r, split: "val" })));
  }
  return { train, val };
}

function trLower(t) {
  return String(t).toLocaleLowerCase("tr");
}

function hasMeasurable(text) {
  return (
    /\d+\s*(ms|dk|saat|gün|hf|ay|hafta|yıl|%|tl|kullanıcı|puan|sn|sp|mağaza|kampüs|parsel|trafo|hat)/i.test(text) ||
    /p95|p99|nps|rpo|rto|availability|oee|sla|>=|<=|http\s*\d{3}|v\d+\/|\d+xx/i.test(text) ||
    /\d+\s*x\s*trafik|\d+\s*×/i.test(text)
  );
}

function repeatedNgramRatio(text, n = 4) {
  const words = trLower(text).match(/\p{L}+/gu) ?? [];
  if (words.length < n * 2) return 0;
  const grams = [];
  for (let i = 0; i <= words.length - n; i += 1) grams.push(words.slice(i, i + n).join(" "));
  const counts = new Map();
  for (const g of grams) counts.set(g, (counts.get(g) ?? 0) + 1);
  let rep = 0;
  for (const c of counts.values()) if (c > 1) rep += c - 1;
  return rep / grams.length;
}

function countPsSections(text) {
  const l = trLower(text);
  return PS_SECTIONS.filter((h) => l.includes(h)).length;
}

function psSectionsMeaningful(text) {
  const parts = text.split(/\n## /);
  let meaningful = 0;
  for (const part of parts) {
    const body = part.includes("\n") ? part.slice(part.indexOf("\n") + 1).trim() : "";
    if (body.length >= 40 && !/legacy kayıttan|operasyonel verimlilik, hata oranında azalma/i.test(body)) {
      meaningful += 1;
    }
  }
  return meaningful;
}

function scoreRecord(record, globalIdx) {
  const out = record.output ?? "";
  const instr = record.instruction ?? "";
  const domain = record.domain ?? "legacy";
  const isV2 = domain !== "legacy";
  const critical = [];

  const scores = {
    turkce: 7,
    teknik: 7,
    gorev: 7,
    yapisal: 7,
    domain: 7,
    olculebilir: 7,
    gercekcilik: 7,
    tekrar: 7,
    halusinasyon: 8,
    egitim: 7,
  };

  const turkishChars = (trLower(out).match(/[ğüşıöç]/g) ?? []).length;
  if (turkishChars >= 3) scores.turkce = Math.min(10, scores.turkce + 1);
  if (/[\u4e00-\u9fff]|[\u0400-\u04ff]{4,}/.test(out)) {
    scores.turkce = 3;
    scores.halusinasyon = 2;
    critical.push("Türkçe dışı karakter");
  }

  if (BOILERPLATE.some((p) => p.test(out)) && !(domain === "legacy" && /program yönetimi koordinasyonu/i.test(out))) {
    scores.gercekcilik = 4;
    scores.tekrar = 4;
    scores.egitim = 4;
    if (isV2) critical.push("Şablon kalıbı tespit");
  }

  const repRatio = repeatedNgramRatio(out);
  if (repRatio > 0.15) scores.tekrar = 5;
  if (repRatio > 0.25) scores.tekrar = 3;

  if (hasMeasurable(out)) scores.olculebilir = Math.min(10, scores.olculebilir + 2);
  else scores.olculebilir = 5;

  if (trLower(out).includes(trLower(domain)) || domain === "legacy") scores.domain = Math.min(10, scores.domain + 1);

  switch (record.category) {
    case "product_spec": {
      const secCount = countPsSections(out);
      const meaningful = psSectionsMeaningful(out);
      scores.yapisal = secCount >= 9 ? 9 : 5;
      scores.gorev = meaningful >= 8 ? 9 : meaningful >= 6 ? 7 : 4;
      if (meaningful < 6) critical.push("Product spec bölümleri anlamsız/boilerplate");
      if (secCount < 9) critical.push("Product spec 9/9 değil");
      if (!/fonksiyonel olmayan/i.test(out) || !/fonksiyonel gereksinim/i.test(out)) {
        scores.gorev = Math.min(scores.gorev, 5);
      }
      break;
    }
    case "technical_documentation": {
      const variedArch = /rest mikroservis|graphql|kafka|flink|lambda|serverless|webhook|batch etl|stream processing|grpc|cqrs|event-driven|message queue|offline sync|edge processing|websocket|soap legacy|scheduled cron|multi-region|saga orchestration/i;
      if (isV2 && /api gateway → .+ → postgresql/i.test(out) && !variedArch.test(out)) {
        scores.teknik = 5;
        critical.push("Tek mimari şablon");
      } else {
        scores.teknik = 8;
      }
      if (/t-\d+/i.test(out) && variedArch.test(out)) scores.teknik = Math.min(10, scores.teknik + 1);
      if (hasMeasurable(out)) scores.olculebilir = Math.min(10, scores.olculebilir + 1);
      break;
    }
    case "user_story":
      if ((out.match(/\bgiven\b/gi) ?? []).length >= 4) {
        scores.gorev = Math.min(10, scores.gorev + 1);
        scores.egitim = Math.min(10, scores.egitim + 1);
        scores.olculebilir = Math.min(10, scores.olculebilir + 1);
      }
      if (isV2 && /\bgiven\b.+\bwhen\b.+\bthen\b/i.test(out) && trLower(out).includes(trLower(domain))) {
        scores.gercekcilik = Math.min(10, scores.gercekcilik + 2);
        scores.gorev = Math.min(10, scores.gorev + 1);
      }
      if (!isV2 && /kabul kriter|AK-/i.test(out)) {
        scores.yapisal = 8;
        scores.gorev = Math.min(10, scores.gorev + 1);
        scores.egitim = Math.min(10, scores.egitim + 1);
      }
      if (/given.+portalına giriş yaptığında when.+offline/i.test(trLower(out))) {
        scores.gorev = 4;
        critical.push("Generic acceptance criteria");
      }
      break;
    case "risk_analysis":
      if (out.includes("| Risk |") && out.includes("Azaltma")) scores.yapisal = 9;
      if ((out.match(/\| P[123] \|/g) ?? []).length >= 3 && /mitigation|azaltma|ref R-/i.test(out)) {
        scores.gorev = Math.min(10, scores.gorev + 1);
        scores.gercekcilik = Math.min(10, scores.gercekcilik + 1);
      }
      if (/kullanıcı adaptasyonu/i.test(out) && isV2) scores.gercekcilik = 5;
      break;
    case "project_planning":
      if (/faz|sprint|milestone|keşif|uat|go-live|kilometre|hf\)/i.test(out)) scores.gorev = 8;
      if (out.length > 400) scores.gercekcilik = Math.min(10, scores.gercekcilik + 1);
      if (hasMeasurable(out)) scores.olculebilir = Math.min(10, scores.olculebilir + 2);
      break;
    case "requirement_analysis":
      if (/fr-\d+-01:\s*kayıt/i.test(out) && isV2) {
        scores.gorev = 4;
        critical.push("Generic FR kalıbı");
      }
      if (/fr-|nfr-|req-/i.test(out) && hasMeasurable(out)) {
        scores.teknik = Math.min(10, scores.teknik + 1);
        scores.olculebilir = Math.min(10, scores.olculebilir + 1);
      }
      break;
    default:
      break;
  }

  if (out.length < 200) {
    scores.egitim = 4;
    critical.push("Çok kısa cevap");
  }
  if (out.length > 400) scores.egitim = Math.min(10, scores.egitim + 1);

  if (isV2) {
    const hasScenario = /organizasyon|persona|mvp|entegrasyon|pain point|süreç/i.test(trLower(out));
    if (hasScenario) scores.gercekcilik = Math.min(10, scores.gercekcilik + 1);
    else scores.gercekcilik = Math.max(4, scores.gercekcilik - 1);
  } else {
    scores.gercekcilik = Math.min(10, scores.gercekcilik + 1);
  }

  const criteria = Object.values(scores);
  const avg = criteria.reduce((a, b) => a + b, 0) / criteria.length;

  return {
    id: globalIdx + 1,
    split: record.split,
    category: record.category,
    source: isV2 ? "v2" : "legacy",
    domain,
    scores,
    average: Math.round(avg * 10) / 10,
    critical,
  };
}

function main() {
  const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
  const { train, val } = stratifiedSplit(raw, 0.2, 42);

  const samples = [];
  for (const cat of CATEGORIES) {
    const catTrain = train.filter((r) => r.category === cat);
    const catVal = val.filter((r) => r.category === cat);
    samples.push(...catTrain.slice(0, 3));
    samples.push(...catVal.slice(0, 2));
  }

  const results = samples.map((r) => scoreRecord(r, r._idx ?? 0));

  const byCategory = {};
  for (const cat of CATEGORIES) {
    const catResults = results.filter((r) => r.category === cat);
    byCategory[cat] = {
      count: catResults.length,
      average: Math.round((catResults.reduce((s, r) => s + r.average, 0) / catResults.length) * 10) / 10,
      min: Math.min(...catResults.map((r) => r.average)),
    };
  }

  const legacyResults = results.filter((r) => r.source === "legacy");
  const v2Results = results.filter((r) => r.source === "v2");
  const legacyAvg = legacyResults.length
    ? Math.round((legacyResults.reduce((s, r) => s + r.average, 0) / legacyResults.length) * 10) / 10
    : 0;
  const v2Avg = v2Results.length
    ? Math.round((v2Results.reduce((s, r) => s + r.average, 0) / v2Results.length) * 10) / 10
    : 0;

  const allCritical = results.flatMap((r) => r.critical.map((c) => ({ id: r.id, error: c })));
  const datasetScore = Math.round((results.reduce((s, r) => s + r.average, 0) / results.length) * 10) / 10;
  const categoryMin = Math.min(...Object.values(byCategory).map((c) => c.average));
  const categoryScores100 = Object.fromEntries(
    Object.entries(byCategory).map(([k, v]) => [k, Math.round(v.average * 10)]),
  );

  const ready =
    datasetScore >= 8.0 && categoryMin >= 7.5 && allCritical.length === 0;

  let sha256 = "";
  const manifestPath = path.join(outputDir, "manifest.json");
  if (fs.existsSync(manifestPath)) {
    sha256 = JSON.parse(fs.readFileSync(manifestPath, "utf8")).dataset_sha256 ?? "";
  }
  if (!sha256 && fs.existsSync(path.join(outputDir, "train.jsonl"))) {
    const trainContent = fs.readFileSync(path.join(outputDir, "train.jsonl"), "utf8");
    const valContent = fs.readFileSync(path.join(outputDir, "val.jsonl"), "utf8");
    sha256 = crypto.createHash("sha256").update(trainContent + valContent).digest("hex");
  }

  const report = {
    datasetQualityScore: Math.round(datasetScore * 10),
    categoryScores: categoryScores100,
    categoryMinScore: Math.round(categoryMin * 10),
    criticalErrorCount: allCritical.length,
    criticalErrors: allCritical,
    legacyAverage: legacyAvg,
    v2Average: v2Avg,
    samples: results,
    byCategory,
    verdict: ready ? "READY_FOR_TRAINING" : "NOT_READY_FOR_TRAINING",
    datasetSha256: sha256,
  };

  const reportPath = path.join(outputDir, "manual_quality_report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("=== Manuel Kalite Kapısı (30 örnek) ===");
  console.log(`Dataset Quality Score: ${report.datasetQualityScore}/100`);
  console.log(`Legacy ortalama: ${legacyAvg}/10`);
  console.log(`v2 ortalama: ${v2Avg}/10`);
  console.log(`Kritik hata: ${allCritical.length}`);
  console.log("\nKategori puanları (/100):");
  for (const [cat, score] of Object.entries(categoryScores100)) {
    console.log(`  ${cat.padEnd(26)} ${score}`);
  }
  console.log(`\nSONUÇ: ${report.verdict}`);
  console.log(`Rapor: ${reportPath}`);

  process.exit(ready ? 0 : 1);
}

main();
