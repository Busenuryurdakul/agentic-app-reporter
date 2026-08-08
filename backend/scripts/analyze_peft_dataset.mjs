/**
 * Run PEFT dataset analysis (Python locally, Docker fallback on Windows/no-Python hosts).
 *
 * Usage:
 *   node ./scripts/analyze_peft_dataset.mjs
 *   node ./scripts/analyze_peft_dataset.mjs --dataset-dir=./peft-export
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");

const datasetArg = process.argv.find((a) => a.startsWith("--dataset-dir="));
const datasetDir = path.resolve(
  backendRoot,
  datasetArg?.slice(14) || process.env.DATASET_DIR || "peft-export",
);

if (!fs.existsSync(path.join(datasetDir, "train.jsonl"))) {
  console.error(`FAIL  train.jsonl not found in ${datasetDir}`);
  process.exit(1);
}

function run(cmd, args, options = {}) {
  return spawnSync(cmd, args, {
    stdio: "inherit",
    cwd: backendRoot,
    ...options,
  });
}

function tryLocalPython() {
  const scriptArgs = [
    "deployments/finetune/analyze_dataset.py",
    "--dataset-dir",
    datasetDir,
  ];
  for (const spec of [
    { cmd: "python3", args: scriptArgs },
    { cmd: "python", args: scriptArgs },
    { cmd: "py", args: ["-3", ...scriptArgs] },
  ]) {
    const res = run(spec.cmd, spec.args, { shell: spec.cmd === "py" });
    if (res.error?.code === "ENOENT") continue;
    if (res.status === 0) return true;
    // Windows App Execution Alias stub (python not installed)
    if (res.status === 9009) continue;
  }
  return false;
}

function runDocker() {
  const mount = backendRoot.replace(/\\/g, "/");
  const rel = path.relative(backendRoot, datasetDir).replace(/\\/g, "/");
  const containerDataset = `/work/${rel}`;
  console.log("NOTE  Local Python not found — using Docker python:3.11-slim");
  const res = run("docker", [
    "run",
    "--rm",
    "-v",
    `${mount}:/work`,
    "-w",
    "/work/deployments/finetune",
    "python:3.11-slim",
    "python",
    "analyze_dataset.py",
    "--dataset-dir",
    containerDataset,
  ]);
  if (res.error?.code === "ENOENT") {
    console.error("FAIL  Neither Python nor Docker is available.");
    process.exit(1);
  }
  process.exit(res.status ?? 1);
}

if (!tryLocalPython()) {
  runDocker();
}
