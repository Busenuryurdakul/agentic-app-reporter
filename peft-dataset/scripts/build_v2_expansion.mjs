/**

 * Training v2 Aşama 1: 120 → 300 kayıt genişletme.

 * Run: node scripts/build_v2_expansion.mjs

 */



import fs from "node:fs";

import path from "node:path";

import { fileURLToPath } from "node:url";

import { migrateLegacyRecord } from "./lib/v2_generators.mjs";
import { generateScenarioV2Expansion } from "./lib/scenario_engine.mjs";



const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const rawPath = path.join(root, "data", "raw_examples.json");



const CATEGORIES = [

  "product_spec",

  "project_planning",

  "requirement_analysis",

  "technical_documentation",

  "risk_analysis",

  "user_story",

];



function promptKey(record) {

  const instruction = String(record.instruction ?? "").trim();

  const input = String(record.input ?? "").trim();

  return input ? `${instruction}\n\n${input}` : instruction;

}



function normalizeForNearDup(text) {

  return text

    .toLocaleLowerCase("tr")

    .replace(/\s+/g, " ")

    .replace(/[^\p{L}\p{N}\s]/gu, "")

    .trim();

}



function tokenSet(text) {

  return new Set(normalizeForNearDup(text).split(/\s+/).filter(Boolean));

}



function jaccard(a, b) {

  const sa = tokenSet(a);

  const sb = tokenSet(b);

  if (sa.size === 0 || sb.size === 0) return 0;

  let inter = 0;

  for (const t of sa) if (sb.has(t)) inter += 1;

  return inter / (sa.size + sb.size - inter);

}



function loadLegacyRows(existing) {

  if (existing.length === 120) {

    return existing;

  }

  if (existing.length === 300) {

    const legacy = existing.filter((r) => (r.domain ?? "legacy") === "legacy");

    if (legacy.length === 120) return legacy;

    return existing.slice(0, 120);

  }

  return null;

}



function main() {

  const existing = JSON.parse(fs.readFileSync(rawPath, "utf8"));

  const legacyRows = loadLegacyRows(existing);



  if (!legacyRows) {

    console.error(`Beklenen 120 veya 300 mevcut kayıt, bulunan: ${existing.length}`);

    process.exit(1);

  }



  const migratedExisting = legacyRows.map((row) => migrateLegacyRecord(row));

  const expansion = generateScenarioV2Expansion();



  if (expansion.length !== 180) {

    console.error(`Beklenen 180 yeni kayıt, üretilen: ${expansion.length}`);

    process.exit(1);

  }



  const merged = [...migratedExisting, ...expansion];



  const counts = {};

  for (const row of merged) {

    counts[row.category] = (counts[row.category] || 0) + 1;

  }

  for (const cat of CATEGORIES) {

    if (counts[cat] !== 50) {

      console.error(`Kategori ${cat}: beklenen 50, bulunan ${counts[cat] ?? 0}`);

      process.exit(1);

    }

  }



  const promptSet = new Set();

  const outputSet = new Set();



  for (let i = 0; i < merged.length; i += 1) {

    const row = merged[i];

    const pKey = promptKey(row);

    if (promptSet.has(pKey)) {

      console.error("Duplicate prompt:", row.instruction.slice(0, 60));

      process.exit(1);

    }

    promptSet.add(pKey);



    const out = String(row.output).trim();

    if (outputSet.has(out)) {

      console.error("Duplicate output:", row.instruction.slice(0, 60));

      process.exit(1);

    }

    outputSet.add(out);



    for (let j = 0; j < i; j += 1) {

      const sim = jaccard(out, merged[j].output);

      if (sim >= 0.85) {

        console.error(

          `Near-duplicate output (jaccard=${sim.toFixed(3)}): #${j + 1} vs #${i + 1}`,

        );

        process.exit(1);

      }

    }

  }



  const domainCounts = {};

  for (const row of merged) {

    const d = row.domain ?? "unknown";

    domainCounts[d] = (domainCounts[d] || 0) + 1;

  }



  if (merged.length !== 300) {

    console.error(`Beklenen 300 toplam, bulunan: ${merged.length}`);

    process.exit(1);

  }



  fs.writeFileSync(rawPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");

  console.log("OK — v2 genişletme tamamlandı");

  console.log("  Toplam kayıt:", merged.length);

  console.log("  Eklenen     :", expansion.length);

  console.log("  Kategoriler :", counts);

  console.log("  Domain sayısı:", Object.keys(domainCounts).length);

}



main();


