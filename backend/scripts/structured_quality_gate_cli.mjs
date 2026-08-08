#!/usr/bin/env node
/** CLI wrapper for structured quality gate evaluation. */
import fs from "node:fs";
import { runQualityGate } from "./lib/peft_quality_gate.mjs";

const args = process.argv.slice(2);
let markdownPath = "";
let metaPath = "";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--markdown") markdownPath = args[++i];
  if (args[i] === "--meta") metaPath = args[++i];
}
if (!markdownPath) {
  console.error("usage: structured_quality_gate_cli.mjs --markdown path [--meta json]");
  process.exit(2);
}
const body = fs.readFileSync(markdownPath, "utf8");
const structuredMeta = metaPath ? JSON.parse(fs.readFileSync(metaPath, "utf8")) : null;
const gate = runQualityGate(body, { lang: "tr", structuredMeta });
console.log(JSON.stringify(gate, null, 2));
