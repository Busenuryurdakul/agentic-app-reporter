/**
 * Sentetik PEFT dataset üretici — harici paket gerektirmez.
 *
 * Usage:
 *   node scripts/generate_dataset.mjs --force
 *   node scripts/generate_dataset.mjs --input=data/raw_examples.json --output=data/output --val-ratio=0.20 --seed=42 --force
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const SYSTEM_PROMPT =
  "Sen Türkçe yanıt veren deneyimli bir ürün ve yazılım gereksinimleri uzmanısın.";

const VALID_CATEGORIES = new Set([
  "product_spec",
  "project_planning",
  "requirement_analysis",
  "technical_documentation",
  "risk_analysis",
  "user_story",
]);

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

const NEAR_DUP_THRESHOLD = 0.85;

function parseArgs(argv) {
  const opts = {
    input: path.join("data", "raw_examples.json"),
    output: path.join("data", "output"),
    valRatio: 0.2,
    seed: 42,
    force: false,
  };

  for (const arg of argv) {
    if (arg === "--force") {
      opts.force = true;
      continue;
    }
    if (arg.startsWith("--input=")) {
      opts.input = arg.slice(8);
      continue;
    }
    if (arg.startsWith("--output=")) {
      opts.output = arg.slice(9);
      continue;
    }
    if (arg.startsWith("--val-ratio=")) {
      opts.valRatio = Number(arg.slice(12));
      continue;
    }
    if (arg.startsWith("--seed=")) {
      opts.seed = Number(arg.slice(7));
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    console.error(`Bilinmeyen argüman: ${arg}`);
    printHelp();
    process.exit(1);
  }

  if (!Number.isFinite(opts.valRatio) || opts.valRatio <= 0 || opts.valRatio >= 1) {
    console.error("Hata: --val-ratio 0 ile 1 arasında olmalıdır (ör. 0.20).");
    process.exit(1);
  }
  if (!Number.isFinite(opts.seed)) {
    console.error("Hata: --seed geçerli bir tam sayı olmalıdır.");
    process.exit(1);
  }

  opts.input = path.resolve(projectRoot, opts.input);
  opts.output = path.resolve(projectRoot, opts.output);
  return opts;
}

function printHelp() {
  console.log(`Kullanım: node scripts/generate_dataset.mjs [seçenekler]

Seçenekler:
  --input=<yol>       Ham örnek JSON dosyası (varsayılan: data/raw_examples.json)
  --output=<yol>      Çıktı dizini (varsayılan: data/output)
  --val-ratio=<0-1>   Validation oranı (varsayılan: 0.20)
  --seed=<sayı>       Deterministik karıştırma tohumu (varsayılan: 42)
  --force             Mevcut train.jsonl / val.jsonl üzerine yaz
  --help              Bu yardım metnini göster
`);
}

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

function normalizeText(value) {
  return String(value ?? "").trim();
}

function recordKey(record) {
  return JSON.stringify({
    instruction: normalizeText(record.instruction),
    input: normalizeText(record.input),
    output: normalizeText(record.output),
    category: normalizeText(record.category),
  });
}

function promptKey(record) {
  const instruction = normalizeText(record.instruction);
  const input = normalizeText(record.input);
  return input ? `${instruction}\n\n${input}` : instruction;
}

function normalizeForNearDup(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
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

function trLower(text) {
  return String(text).toLocaleLowerCase("tr");
}

function countProductSpecSections(text) {
  const lowered = trLower(text);
  return PRODUCT_SPEC_SECTIONS.filter((hint) => lowered.includes(hint)).length;
}

function validateRecord(record, index) {
  const errors = [];
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return [`Kayıt ${index}: geçerli bir nesne değil`];
  }

  const instruction = normalizeText(record.instruction);
  const output = normalizeText(record.output);
  const category = normalizeText(record.category);

  if (!instruction) errors.push(`Kayıt ${index}: instruction boş`);
  if (!output) errors.push(`Kayıt ${index}: output boş`);
  if (!category) errors.push(`Kayıt ${index}: category boş`);
  else if (!VALID_CATEGORIES.has(category)) {
    errors.push(`Kayıt ${index}: geçersiz category "${category}"`);
  }

  if (record.input !== undefined && record.input !== null && typeof record.input !== "string") {
    errors.push(`Kayıt ${index}: input metin olmalıdır`);
  }

  if (output.length < 120) {
    errors.push(`Kayıt ${index}: output çok kısa (${output.length} karakter)`);
  }

  if (category === "product_spec" && countProductSpecSections(output) < 9) {
    errors.push(`Kayıt ${index}: product_spec 9/9 bölüm içermiyor`);
  }

  return errors;
}

function buildUserContent(record) {
  const instruction = normalizeText(record.instruction);
  const input = normalizeText(record.input);
  return input ? `${instruction}\n\n${input}` : instruction;
}

function toJsonlRow(record) {
  const metadata = {
    category: normalizeText(record.category),
    source: "synthetic",
    language: "tr",
  };
  if (record.domain) metadata.domain = normalizeText(record.domain);

  return {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserContent(record) },
      { role: "assistant", content: normalizeText(record.output) },
    ],
    metadata,
  };
}

function stratifiedSplit(records, valRatio, seed) {
  const byCategory = new Map();
  for (const record of records) {
    const cat = normalizeText(record.category);
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(record);
  }

  const train = [];
  const val = [];

  for (const [category, items] of [...byCategory.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const catSeed = seed + hashString(category);
    const rng = createRng(catSeed);
    const shuffled = shuffle(items, rng);
    const valCount =
      shuffled.length <= 1 ? 0 : Math.max(1, Math.round(shuffled.length * valRatio));
    const trainCount = shuffled.length - valCount;

    train.push(...shuffled.slice(0, trainCount));
    val.push(...shuffled.slice(trainCount));
  }

  const rng = createRng(seed);
  return {
    train: shuffle(train, rng),
    val: shuffle(val, createRng(seed + 1)),
  };
}

function hashString(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function countCategories(records) {
  const counts = {};
  for (const record of records) {
    const cat = normalizeText(record.category);
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return counts;
}

function countDomains(records) {
  const counts = {};
  for (const record of records) {
    const domain = normalizeText(record.domain) || "unknown";
    counts[domain] = (counts[domain] || 0) + 1;
  }
  return counts;
}

function computeLeakage(trainRows, valRows) {
  const trainFingerprints = new Set(
    trainRows.map((r) => `${buildUserContent(r)}|||${normalizeText(r.output)}`),
  );
  let leakage = 0;
  for (const row of valRows) {
    const fp = `${buildUserContent(row)}|||${normalizeText(row.output)}`;
    if (trainFingerprints.has(fp)) leakage += 1;
  }
  return leakage;
}

function computeNearDuplicates(records) {
  let pairs = 0;
  for (let i = 0; i < records.length; i += 1) {
    for (let j = i + 1; j < records.length; j += 1) {
      if (jaccardSimilarity(records[i].output, records[j].output) >= NEAR_DUP_THRESHOLD) {
        pairs += 1;
      }
    }
  }
  return pairs;
}

function sha256Files(...paths) {
  const hash = crypto.createHash("sha256");
  for (const p of paths) {
    hash.update(fs.readFileSync(p));
  }
  return hash.digest("hex");
}

function writeJsonl(filePath, rows) {
  const lines = rows.map((row) => JSON.stringify(row));
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(opts.input)) {
    console.error(`Hata: Girdi dosyası bulunamadı: ${opts.input}`);
    process.exit(1);
  }

  const trainPath = path.join(opts.output, "train.jsonl");
  const valPath = path.join(opts.output, "val.jsonl");

  if (!opts.force) {
    for (const existing of [trainPath, valPath]) {
      if (fs.existsSync(existing)) {
        console.error(
          `Hata: ${path.relative(projectRoot, existing)} zaten var. Üzerine yazmak için --force kullanın.`,
        );
        process.exit(1);
      }
    }
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(opts.input, "utf8"));
  } catch (err) {
    console.error(`Hata: JSON okunamadı (${opts.input}): ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(raw)) {
    console.error("Hata: raw_examples.json bir dizi (array) olmalıdır.");
    process.exit(1);
  }

  const sourceCount = raw.length;
  let rejectedCount = 0;
  let duplicateCount = 0;
  const rejectionReasons = [];
  const accepted = [];
  const seenRecords = new Set();
  const seenPrompts = new Set();

  raw.forEach((record, index) => {
    const errors = validateRecord(record, index + 1);
    if (errors.length > 0) {
      rejectedCount += 1;
      rejectionReasons.push(...errors);
      return;
    }

    const fullKey = recordKey(record);
    if (seenRecords.has(fullKey)) {
      duplicateCount += 1;
      return;
    }
    seenRecords.add(fullKey);

    const pKey = promptKey(record);
    if (seenPrompts.has(pKey)) {
      duplicateCount += 1;
      return;
    }
    seenPrompts.add(pKey);

    accepted.push({
      instruction: normalizeText(record.instruction),
      input: normalizeText(record.input),
      output: normalizeText(record.output),
      category: normalizeText(record.category),
      domain: normalizeText(record.domain) || undefined,
    });
  });

  if (rejectionReasons.length > 0) {
    console.error("Reddedilen kayıtlar:");
    for (const reason of rejectionReasons.slice(0, 20)) {
      console.error(`  - ${reason}`);
    }
    if (rejectionReasons.length > 20) {
      console.error(`  ... ve ${rejectionReasons.length - 20} hata daha`);
    }
  }

  if (accepted.length === 0) {
    console.error("Hata: Export edilecek geçerli kayıt kalmadı.");
    process.exit(1);
  }

  const nearDuplicateCount = computeNearDuplicates(accepted);
  if (nearDuplicateCount > 0) {
    console.error(`Hata: ${nearDuplicateCount} near-duplicate output çifti tespit edildi.`);
    process.exit(1);
  }

  const { train, val } = stratifiedSplit(accepted, opts.valRatio, opts.seed);
  const leakageCount = computeLeakage(train, val);
  if (leakageCount > 0) {
    console.error(`Hata: Train/val leakage ${leakageCount} kayıt.`);
    process.exit(1);
  }

  const trainRows = train.map(toJsonlRow);
  const valRows = val.map(toJsonlRow);

  fs.mkdirSync(opts.output, { recursive: true });
  writeJsonl(trainPath, trainRows);
  writeJsonl(valPath, valRows);

  const promptLengths = accepted.map((r) => buildUserContent(r).length);
  const responseLengths = accepted.map((r) => r.output.length);
  const avgPrompt =
    promptLengths.reduce((a, b) => a + b, 0) / Math.max(promptLengths.length, 1);
  const avgResponse =
    responseLengths.reduce((a, b) => a + b, 0) / Math.max(responseLengths.length, 1);

  const productSpecRows = accepted.filter((r) => r.category === "product_spec");
  const sectionCoverage = {
    product_spec: {
      expected_sections: PRODUCT_SPEC_SECTIONS.length,
      average_matched:
        productSpecRows.length > 0
          ? Number(
              (
                productSpecRows.reduce((s, r) => s + countProductSpecSections(r.output), 0) /
                productSpecRows.length
              ).toFixed(2),
            )
          : 0,
      full_coverage_count: productSpecRows.filter((r) => countProductSpecSections(r.output) >= 9)
        .length,
    },
  };

  const datasetSha256 = sha256Files(trainPath, valPath);

  const manifest = {
    dataset_version: "2",
    generated_at: new Date().toISOString(),
    source_count: sourceCount,
    accepted_count: accepted.length,
    rejected_count: rejectedCount,
    duplicate_count: duplicateCount,
    near_duplicate_count: nearDuplicateCount,
    leakage_count: leakageCount,
    train_count: trainRows.length,
    validation_count: valRows.length,
    split_ratio: {
      train: Number((1 - opts.valRatio).toFixed(4)),
      validation: Number(opts.valRatio.toFixed(4)),
    },
    category_distribution: {
      all: countCategories(accepted),
      train: countCategories(train),
      validation: countCategories(val),
    },
    domain_distribution: {
      all: countDomains(accepted),
      train: countDomains(train),
      validation: countDomains(val),
    },
    section_coverage: sectionCoverage,
    average_prompt_length: Math.round(avgPrompt),
    average_response_length: Math.round(avgResponse),
    dataset_sha256: datasetSha256,
    output_format: "messages+jsonl",
    system_prompt: SYSTEM_PROMPT,
    seed: opts.seed,
    input_file: path.relative(projectRoot, opts.input),
  };

  fs.writeFileSync(
    path.join(opts.output, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  console.log("Dataset üretimi tamamlandı.");
  console.log(`  Kaynak       : ${sourceCount}`);
  console.log(`  Kabul edilen : ${accepted.length}`);
  console.log(`  Reddedilen   : ${rejectedCount}`);
  console.log(`  Yinelenen    : ${duplicateCount}`);
  console.log(`  Near-dup     : ${nearDuplicateCount}`);
  console.log(`  Leakage      : ${leakageCount}`);
  console.log(`  Train        : ${trainRows.length}`);
  console.log(`  Validation   : ${valRows.length}`);
  console.log(`  SHA256       : ${datasetSha256.slice(0, 16)}…`);
  console.log(`  Çıktı        : ${path.relative(projectRoot, opts.output)}`);
}

main();
