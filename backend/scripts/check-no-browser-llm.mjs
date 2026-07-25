/**
 * Cross-platform guard: no browser-side LLM in frontend.
 * Usage: node ./scripts/check-no-browser-llm.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.join(__dirname, "..", "..", "frontend");
const pattern =
  /@mlc-ai|web-llm|@mlc-ai\/web-llm|CreateMLCEngine|webgpu.*llm/i;

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "node_modules" || name.name === ".next") continue;
      walk(full, acc);
    } else if (/\.(tsx?|jsx?|json)$/.test(name.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const targets = [
  path.join(frontend, "package.json"),
  ...walk(path.join(frontend, "src")),
];

const hits = [];
for (const file of targets) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, "utf8");
  if (pattern.test(content)) hits.push(file);
}

if (hits.length > 0) {
  console.error("Browser LLM dependency detected — frontend must stay API-only:");
  for (const h of hits) console.error(`  ${h}`);
  process.exit(1);
}

console.log("OK: no browser LLM imports in frontend");
