/**
 * PEFT JSONL dataset analiz aracı — Training v2 kalite kapıları.
 *
 * Usage:
 *   node scripts/analyze_dataset.mjs --dataset-dir=data/output
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const REQUIRED_ROLES = ["system", "user", "assistant"];
const SHORT_ASSISTANT_THRESHOLD = 120;
const LONG_RECORD_THRESHOLD = 8000;
const EXPECTED_TOTAL = 300;
const EXPECTED_TRAIN = 240;
const EXPECTED_VAL = 60;
const MIN_CATEGORY_COUNT = 50;
const NEAR_DUP_THRESHOLD = 0.85;
const TEMPLATE_NGRAM_SIZE = 6;
const TEMPLATE_REPEAT_MIN = 6;

const BOILERPLATE_PATTERNS = [
  /client\s*→\s*api gateway\s*→/i,
  /fr-\d+-01:\s*kayıt oluşturma ve durum/i,
  /given\s+\w+\s+\w+\s+portalına giriş yaptığında when/i,
  /operasyonel verimlilik,\s*hata oranında azalma,\s*denetlenebilirlik/i,
  /legacy kayıttan taşınan/i,
];

const TEMPLATE_STOPWORDS = new Set([
  "fonksiyonel", "gereksinimler", "gereksinim", "olmayan", "varsayımlar", "kısıtlar",
  "açık", "sorular", "başarı", "ölçütleri", "hedef", "kullanıcılar", "riskler",
  "kapsam", "amaçlar", "problem", "ürün", "özeti", "teslimatlar", "bağımlılıklar",
  "sorumlular", "fazlar", "kabul", "kriterleri", "rol", "ihtiyaç", "fayda",
]);

function extractNgrams(text, n = TEMPLATE_NGRAM_SIZE) {
  const words = trLower(text).match(/\p{L}+/gu) ?? [];
  const grams = [];
  for (let i = 0; i <= words.length - n; i += 1) {
    grams.push(words.slice(i, i + n).join(" "));
  }
  return grams;
}

function isStructuralNgram(gram) {
  const words = gram.split(" ");
  if (words.length < TEMPLATE_NGRAM_SIZE) return true;
  const stopCount = words.filter((w) => TEMPLATE_STOPWORDS.has(w)).length;
  return stopCount >= Math.ceil(words.length * 0.5);
}

function checkTemplateSimilarity(allRows) {
  const issues = [];
  const v2Rows = allRows.filter((row) => row.data.metadata?.domain !== "legacy");

  function normalizeParagraph(p) {
    return trLower(p)
      .replace(/\b(saas|finans|sağlık|eğitim|tarım|lojistik|e-ticaret|kamu|sigorta|turizm|üretim|enerji|mobil uygulamalar|insan kaynakları|siber güvenlik)\b/g, "@domain@")
      .replace(/\s+/g, " ")
      .trim();
  }

  const byCategory = new Map();
  for (const row of v2Rows) {
    const cat = row.data.metadata?.category ?? "unknown";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(row);
  }

  for (const [category, rows] of byCategory) {
    const paraIndex = new Map();
    for (const row of rows) {
      const assistant = getRoleContent(row.data.messages, "assistant");
      const paragraphs = assistant.split(/\n## /).map((p) => p.trim()).filter((p) => p.length > 100);
      for (const para of paragraphs) {
        const norm = normalizeParagraph(para);
        if (norm.length < 80) continue;
        if (!paraIndex.has(norm)) paraIndex.set(norm, new Set());
        paraIndex.get(norm).add(row.lineNo);
      }
    }
    for (const [para, lineSet] of paraIndex) {
      if (lineSet.size >= TEMPLATE_REPEAT_MIN) {
        issues.push({ category, gram: para.slice(0, 60), count: lineSet.size });
      }
    }
  }

  let boilerplateHits = 0;
  for (const row of allRows) {
    const isLegacy = row.data.metadata?.domain === "legacy";
    const assistant = getRoleContent(row.data.messages, "assistant");
    for (const pat of BOILERPLATE_PATTERNS) {
      if (pat.test(assistant)) {
        if (isLegacy && /program yönetimi koordinasyonu|legacy kayıttan/i.test(assistant)) break;
        boilerplateHits += 1;
        break;
      }
    }
  }

  return { issues, boilerplateHits };
}

const EXPECTED_CATEGORIES = [
  "product_spec",
  "project_planning",
  "requirement_analysis",
  "technical_documentation",
  "risk_analysis",
  "user_story",
];

const PRODUCT_SPEC_SECTIONS = [
  "ürün özeti",
  "problem",
  "hedef kullanıcı",
  "amaçlar",
  "kapsam",
  "fonksiyonel gereksinim",
  "fonksiyonel olmayan",
  "riskler",
  "başarı ölçüt",
];

const USER_STORY_SECTIONS = ["rol", "ihtiyaç", "fayda", "kabul kriter"];
const REQ_ANALYSIS_SECTIONS = [
  "fonksiyonel gereksinim",
  "fonksiyonel olmayan",
  "varsayım",
  "kısıt",
  "açık soru",
];
const PROJECT_PLAN_SECTIONS = [
  "faz",
  "teslimat",
  "bağımlılık",
  "sorumlu",
  "süre tahmini",
  "çıkış kriter",
];
const TECH_DOC_SECTIONS = [
  "amaç",
  "mimari",
  "veri yap",
  "hata yönetimi",
  "güvenlik",
  "gözlemlenebilirlik",
  "test yaklaşım",
];

function parseArgs(argv) {
  let datasetDir = path.join("data", "output");

  for (const arg of argv) {
    if (arg.startsWith("--dataset-dir=")) {
      datasetDir = arg.slice(14);
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log("Kullanım: node scripts/analyze_dataset.mjs --dataset-dir=data/output");
      process.exit(0);
    }
    console.error(`Bilinmeyen argüman: ${arg}`);
    process.exit(1);
  }

  return path.resolve(projectRoot, datasetDir);
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) {
    return { error: `Dosya bulunamadı: ${filePath}` };
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const rows = [];

  for (let i = 0; i < lines.length; i += 1) {
    const lineNo = i + 1;
    try {
      rows.push({ lineNo, data: JSON.parse(lines[i]), raw: lines[i] });
    } catch (err) {
      return { error: `${path.basename(filePath)} satır ${lineNo}: geçersiz JSON — ${err.message}` };
    }
  }

  return { rows, filePath };
}

function getRoleContent(messages, role) {
  const msg = messages.find((m) => m.role === role);
  return msg?.content ?? "";
}

function extractFingerprint(row) {
  const user = getRoleContent(row.messages, "user").trim();
  const assistant = getRoleContent(row.messages, "assistant").trim();
  return `${user}|||${assistant}`;
}

function normalizeUser(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

function normalizeForNearDup(text) {
  return normalizeUser(text);
}

function tokenSet(text) {
  return new Set(normalizeForNearDup(text).split(/\s+/).filter(Boolean));
}

function jaccardSimilarity(a, b) {
  const sa = tokenSet(a);
  const sb = tokenSet(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter += 1;
  return inter / (sa.size + sb.size - inter);
}

function openingSentence(text) {
  const first = text.split(/[.!?]\s+/)[0]?.trim() ?? "";
  return first.slice(0, 60).toLowerCase();
}

function estimateTokens(text) {
  return Math.ceil(String(text).length / 4);
}

function statusLine(status, message) {
  console.log(`${status.padEnd(4)}  ${message}`);
}

function percentile(values, pct) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((pct / 100) * sorted.length));
  return sorted[index];
}

function trLower(text) {
  return String(text).toLocaleLowerCase("tr");
}

function countSections(text, hints) {
  const lowered = trLower(text);
  return hints.filter((hint) => lowered.includes(hint)).length;
}

function countProductSpecSections(text) {
  return countSections(text, PRODUCT_SPEC_SECTIONS);
}

function looksTurkish(text) {
  const lowered = text.toLowerCase();
  const turkishChars = (lowered.match(/[ğüşıöç]/g) ?? []).length;
  const common = ["ve", "için", "bir", "ile", "olarak", "gereksinim", "risk", "kullanıcı"].filter(
    (w) => lowered.includes(w),
  ).length;
  return turkishChars >= 2 || common >= 2;
}

function hasNonTurkishContent(text) {
  if (/[\u4e00-\u9fff]/.test(text)) return true;
  if (/[\u0400-\u04ff]{4,}/.test(text)) return true;
  return !looksTurkish(text);
}

function repeatedNgramRatio(text, n = 3) {
  const words = trLower(text).match(/\p{L}+/gu) ?? [];
  if (words.length < n * 2) return 0;
  const ngrams = [];
  for (let i = 0; i <= words.length - n; i += 1) {
    ngrams.push(words.slice(i, i + n).join(" "));
  }
  const counts = new Map();
  for (const g of ngrams) counts.set(g, (counts.get(g) ?? 0) + 1);
  let repeated = 0;
  for (const c of counts.values()) if (c > 1) repeated += c - 1;
  return repeated / ngrams.length;
}

function hasValidRiskTable(text) {
  const lowered = text.toLowerCase();
  return (
    lowered.includes("| risk") &&
    lowered.includes("olasılık") &&
    lowered.includes("etki") &&
    lowered.includes("öncelik") &&
    lowered.includes("azaltma")
  );
}

function main() {
  const datasetDir = parseArgs(process.argv.slice(2));
  const trainPath = path.join(datasetDir, "train.jsonl");
  const valPath = path.join(datasetDir, "val.jsonl");
  const manifestPath = path.join(datasetDir, "manifest.json");

  const fails = [];
  const warns = [];
  const passes = [];

  console.log(`Dataset analizi: ${path.relative(projectRoot, datasetDir)}\n`);

  const trainResult = readJsonl(trainPath);
  const valResult = readJsonl(valPath);

  if (trainResult.error) fails.push(trainResult.error);
  if (valResult.error) fails.push(valResult.error);

  if (fails.length > 0) {
    for (const fail of fails) statusLine("FAIL", fail);
    process.exit(1);
  }

  const trainRows = trainResult.rows;
  const valRows = valResult.rows;
  const allRows = [
    ...trainRows.map((r) => ({ ...r, split: "train" })),
    ...valRows.map((r) => ({ ...r, split: "val" })),
  ];

  if (allRows.length === 0) {
    statusLine("FAIL", "Dataset boş — train.jsonl ve val.jsonl satır içermiyor.");
    process.exit(1);
  }

  if (allRows.length !== EXPECTED_TOTAL) {
    fails.push(`Toplam kayıt ${allRows.length}, beklenen ${EXPECTED_TOTAL}`);
  } else {
    passes.push(`Toplam kayıt ${EXPECTED_TOTAL}`);
  }

  if (trainRows.length !== EXPECTED_TRAIN) {
    fails.push(`Train ${trainRows.length}, beklenen ${EXPECTED_TRAIN}`);
  } else {
    passes.push(`Train ${EXPECTED_TRAIN} kayıt`);
  }

  if (valRows.length !== EXPECTED_VAL) {
    fails.push(`Validation ${valRows.length}, beklenen ${EXPECTED_VAL}`);
  } else {
    passes.push(`Validation ${EXPECTED_VAL} kayıt`);
  }

  let roleErrors = 0;
  let emptyAssistant = 0;
  let emptyUser = 0;
  let nonTurkishCount = 0;
  let excessiveRepetitionCount = 0;
  let missingMetadata = 0;
  const categoryCounts = {};
  const domainCounts = {};
  const userLengths = [];
  const assistantLengths = [];
  const shortAssistants = [];
  const longRecords = [];
  let totalChars = 0;

  for (const row of allRows) {
    const { lineNo, data, split } = row;
    const prefix = `${split}.jsonl satır ${lineNo}`;

    if (!data || typeof data !== "object") {
      fails.push(`${prefix}: kayıt bir nesne değil`);
      continue;
    }

    if (!Array.isArray(data.messages)) {
      fails.push(`${prefix}: messages dizisi eksik`);
      continue;
    }

    const roles = data.messages.map((m) => m?.role);
    for (const required of REQUIRED_ROLES) {
      if (!roles.includes(required)) {
        roleErrors += 1;
        fails.push(`${prefix}: "${required}" rolü eksik`);
      }
    }

    const system = getRoleContent(data.messages, "system");
    const user = getRoleContent(data.messages, "user");
    const assistant = getRoleContent(data.messages, "assistant");

    if (!assistant.trim()) {
      emptyAssistant += 1;
      fails.push(`${prefix}: assistant cevabı boş`);
    }

    if (!user.trim()) {
      emptyUser += 1;
      fails.push(`${prefix}: user içeriği boş`);
    }

    if (hasNonTurkishContent(assistant)) {
      nonTurkishCount += 1;
      fails.push(`${prefix}: assistant Türkçe dışı veya yetersiz Türkçe sinyal`);
    }

    const repRatio = repeatedNgramRatio(assistant);
    if (repRatio >= 0.25) {
      excessiveRepetitionCount += 1;
      fails.push(`${prefix}: aşırı tekrar (ngram ratio ${repRatio.toFixed(3)})`);
    }

    const category = data.metadata?.category ?? "unknown";
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;

    const domain = data.metadata?.domain ?? "unknown";
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;

    if (!data.metadata?.source || !data.metadata?.language || !data.metadata?.category) {
      missingMetadata += 1;
    }

    userLengths.push(user.length);
    assistantLengths.push(assistant.length);
    totalChars += system.length + user.length + assistant.length;

    if (assistant.trim().length > 0 && assistant.trim().length < SHORT_ASSISTANT_THRESHOLD) {
      shortAssistants.push({ split, lineNo, length: assistant.trim().length });
    }

    const recordLen = system.length + user.length + assistant.length;
    if (recordLen > LONG_RECORD_THRESHOLD) {
      longRecords.push({ split, lineNo, length: recordLen });
    }

    if (category === "product_spec" && countProductSpecSections(assistant) < 9) {
      fails.push(`${prefix}: product_spec 9/9 bölüm değil (${countProductSpecSections(assistant)}/9)`);
    }

    if (category === "user_story" && countSections(assistant, USER_STORY_SECTIONS) < 4) {
      fails.push(`${prefix}: user_story zorunlu bölümler eksik`);
    }

    if (category === "requirement_analysis" && countSections(assistant, REQ_ANALYSIS_SECTIONS) < 5) {
      fails.push(`${prefix}: requirement_analysis bölümleri eksik`);
    }

    if (category === "project_planning" && countSections(assistant, PROJECT_PLAN_SECTIONS) < 6) {
      fails.push(`${prefix}: project_planning bölümleri eksik`);
    }

    if (category === "technical_documentation" && countSections(assistant, TECH_DOC_SECTIONS) < 7) {
      fails.push(`${prefix}: technical_documentation bölümleri eksik`);
    }

    if (category === "risk_analysis" && !hasValidRiskTable(assistant)) {
      fails.push(`${prefix}: risk_analysis tablo formatı geçersiz`);
    }
  }

  if (roleErrors === 0) passes.push("Tüm satırlarda system / user / assistant rolleri mevcut");
  if (emptyAssistant === 0) passes.push("Boş assistant cevabı yok");
  if (emptyUser === 0) passes.push("Boş user prompt yok");
  if (nonTurkishCount === 0) passes.push("Türkçe dışı assistant içeriği yok");
  if (excessiveRepetitionCount === 0) passes.push("Aşırı tekrar yok");
  if (missingMetadata === 0) passes.push("Metadata alanları eksiksiz");

  const trainFingerprints = new Set(trainRows.map((r) => extractFingerprint(r.data)));
  const valFingerprints = new Set(valRows.map((r) => extractFingerprint(r.data)));
  let leakageCount = 0;
  for (const fp of valFingerprints) {
    if (trainFingerprints.has(fp)) leakageCount += 1;
  }

  if (leakageCount > 0) {
    fails.push(`Train ve validation arasında ${leakageCount} birebir aynı kayıt var`);
  } else {
    passes.push("Train / validation leakage yok");
  }

  const userPromptCounts = new Map();
  const normalizedUserCounts = new Map();
  const assistantCounts = new Map();
  const openingCounts = new Map();

  for (const row of allRows) {
    const user = getRoleContent(row.data.messages, "user").trim();
    const assistant = getRoleContent(row.data.messages, "assistant").trim();

    if (user) {
      userPromptCounts.set(user, (userPromptCounts.get(user) || 0) + 1);
      const normalized = normalizeUser(user);
      normalizedUserCounts.set(normalized, (normalizedUserCounts.get(normalized) || 0) + 1);
      const opening = openingSentence(user);
      if (opening.length >= 20) {
        openingCounts.set(opening, (openingCounts.get(opening) || 0) + 1);
      }
    }
    if (assistant) {
      assistantCounts.set(assistant, (assistantCounts.get(assistant) || 0) + 1);
    }
  }

  const duplicatePrompts = [...userPromptCounts.entries()].filter(([, count]) => count > 1);
  const duplicateNormalizedUsers = [...normalizedUserCounts.entries()].filter(([, count]) => count > 1);
  const duplicateAssistants = [...assistantCounts.entries()].filter(([, count]) => count > 1);
  const similarOpenings = [...openingCounts.entries()].filter(([, count]) => count > 1);

  if (duplicatePrompts.length > 0) {
    fails.push(`${duplicatePrompts.length} tekrarlayan user/instruction metni bulundu`);
  } else {
    passes.push("Duplicate prompt yok");
  }

  if (duplicateNormalizedUsers.length > 0) {
    fails.push(`${duplicateNormalizedUsers.length} tekrarlayan normalize user mesajı bulundu`);
  } else {
    passes.push("Near-duplicate normalize prompt yok");
  }

  if (duplicateAssistants.length > 0) {
    fails.push(`${duplicateAssistants.length} birebir aynı assistant cevabı bulundu`);
  } else {
    passes.push("Duplicate assistant yok");
  }

  let nearDuplicateCount = 0;
  for (let i = 0; i < allRows.length; i += 1) {
    const a = getRoleContent(allRows[i].data.messages, "assistant");
    for (let j = i + 1; j < allRows.length; j += 1) {
      const b = getRoleContent(allRows[j].data.messages, "assistant");
      if (jaccardSimilarity(a, b) >= NEAR_DUP_THRESHOLD) nearDuplicateCount += 1;
    }
  }

  if (nearDuplicateCount > 0) {
    fails.push(`${nearDuplicateCount} near-duplicate assistant çifti bulundu`);
  } else {
    passes.push("Near-duplicate assistant yok");
  }

  if (similarOpenings.length > 0) {
    warns.push(`${similarOpenings.length} benzer user başlangıç cümlesi grubu bulundu`);
  }

  const templateCheck = checkTemplateSimilarity(allRows);
  if (templateCheck.boilerplateHits > 0) {
    fails.push(`${templateCheck.boilerplateHits} kayıtta bilinen şablon kalıbı (boilerplate) tespit edildi`);
  } else {
    passes.push("Bilinen şablon kalıpları yok");
  }

  const highTemplateNgrams = templateCheck.issues.filter((i) => i.count >= TEMPLATE_REPEAT_MIN);
  if (highTemplateNgrams.length > 0) {
    fails.push(
      `Template similarity: ${highTemplateNgrams.length} tekrarlayan ${TEMPLATE_NGRAM_SIZE}-gram grubu (>=${TEMPLATE_REPEAT_MIN} kayıt)`,
    );
    for (const issue of highTemplateNgrams.slice(0, 3)) {
      warns.push(`  [${issue.category}] "${issue.gram}..." → ${issue.count} kayıt`);
    }
  } else {
    passes.push("Template similarity kontrolü geçti");
  }

  const total = allRows.length;
  const categoryEntries = Object.entries(categoryCounts).sort(([a], [b]) => a.localeCompare(b));

  const missingCategories = EXPECTED_CATEGORIES.filter((cat) => !categoryCounts[cat]);
  const lowCategories = EXPECTED_CATEGORIES.filter(
    (cat) => (categoryCounts[cat] || 0) < MIN_CATEGORY_COUNT,
  );

  if (missingCategories.length > 0) {
    fails.push(`Eksik kategoriler: ${missingCategories.join(", ")}`);
  }

  if (lowCategories.length > 0) {
    fails.push(
      `Kategori minimumu (<${MIN_CATEGORY_COUNT}): ${lowCategories.map((c) => `${c}=${categoryCounts[c] || 0}`).join(", ")}`,
    );
  } else {
    passes.push(`Her kategori tam ${MIN_CATEGORY_COUNT} kayıt`);
  }

  const avgUser =
    userLengths.length > 0 ? Math.round(userLengths.reduce((a, b) => a + b, 0) / userLengths.length) : 0;
  const avgAssistant =
    assistantLengths.length > 0
      ? Math.round(assistantLengths.reduce((a, b) => a + b, 0) / assistantLengths.length)
      : 0;
  const estTokens = estimateTokens("x".repeat(totalChars));

  if (shortAssistants.length > 0) {
    fails.push(`${shortAssistants.length} kısa assistant cevabı (<${SHORT_ASSISTANT_THRESHOLD} karakter)`);
  } else {
    passes.push("Aşırı kısa assistant cevabı yok");
  }

  if (longRecords.length > 0) {
    warns.push(`${longRecords.length} uzun kayıt (>${LONG_RECORD_THRESHOLD} karakter)`);
  }

  const productSpecRows = allRows.filter((row) => row.data.metadata?.category === "product_spec");
  if (productSpecRows.length > 0) {
    const avgSections =
      productSpecRows.reduce(
        (sum, row) => sum + countProductSpecSections(getRoleContent(row.data.messages, "assistant")),
        0,
      ) / productSpecRows.length;
    const fullCount = productSpecRows.filter(
      (row) => countProductSpecSections(getRoleContent(row.data.messages, "assistant")) >= 9,
    ).length;

    if (fullCount === productSpecRows.length) {
      passes.push(`Product spec 9/9 bölüm: ${fullCount}/${productSpecRows.length}`);
    } else {
      fails.push(
        `Product spec 9/9 bölüm: ${fullCount}/${productSpecRows.length} (ort ${avgSections.toFixed(1)})`,
      );
    }
  }

  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const requiredManifest = [
        "source_count",
        "train_count",
        "validation_count",
        "category_distribution",
        "domain_distribution",
        "duplicate_count",
        "near_duplicate_count",
        "leakage_count",
        "section_coverage",
        "average_prompt_length",
        "average_response_length",
        "dataset_sha256",
        "generated_at",
      ];
      const missing = requiredManifest.filter((k) => manifest[k] === undefined);
      if (missing.length > 0) {
        fails.push(`manifest.json eksik alanlar: ${missing.join(", ")}`);
      } else {
        passes.push("manifest.json v2 alanları eksiksiz");
      }
    } catch {
      fails.push("manifest.json okunamadı");
    }
  } else {
    fails.push("manifest.json bulunamadı");
  }

  console.log("--- Kontroller ---");
  for (const msg of passes) statusLine("PASS", msg);
  for (const msg of warns) statusLine("WARN", msg);
  for (const msg of fails) statusLine("FAIL", msg);

  console.log("\n--- İstatistikler ---");
  console.log(`Toplam kayıt          : ${total}`);
  console.log(`Train                 : ${trainRows.length}`);
  console.log(`Validation            : ${valRows.length}`);
  console.log(`Ort. user uzunluğu    : ${avgUser} karakter`);
  console.log(`Ort. assistant uzun. : ${avgAssistant} karakter`);
  console.log(`Tahmini token (~char/4): ${estTokens}`);
  console.log(`Near-duplicate çift  : ${nearDuplicateCount}`);
  console.log(`Template n-gram issue : ${highTemplateNgrams.length}`);
  console.log(`Boilerplate hits      : ${templateCheck.boilerplateHits}`);
  console.log(`Leakage               : ${leakageCount}`);

  console.log("\n--- Kategori dağılımı ---");
  for (const [category, count] of categoryEntries) {
    const pct = ((count / total) * 100).toFixed(1);
    console.log(`  ${category.padEnd(26)} ${String(count).padStart(3)} (${pct}%)`);
  }

  console.log("\n--- Domain dağılımı (ilk 15) ---");
  const domainEntries = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]);
  for (const [domain, count] of domainEntries.slice(0, 15)) {
    console.log(`  ${domain.padEnd(26)} ${String(count).padStart(3)}`);
  }

  console.log("");
  if (fails.length > 0) {
    console.log(`Sonuç: FAIL (${fails.length} ciddi hata)`);
    process.exit(1);
  }

  if (warns.length > 0) {
    console.log(`Sonuç: PASS with ${warns.length} uyarı`);
  } else {
    console.log("Sonuç: PASS");
  }
  process.exit(0);
}

main();
