/**
 * Phase D — PEFT export Postgres integration smoke (read-only pre-checks + CLI).
 *
 * Prerequisites:
 *   - Docker: masterfabric-postgres (or set PEFT_SMOKE_PSQL)
 *   - Migration 00018 applied
 *   - backend/.env or DATABASE_URL for Go CLI
 *
 * Flow:
 *   1. SQL pre-checks (SELECT only — no production mutations)
 *   2. Pick org with approved product_spec candidates (if any)
 *   3. --dry-run export
 *   4. Full JSONL export ONLY when dry-run reports exported > 0
 *
 * Usage:
 *   node ./scripts/smoke_peft_export.mjs
 *   node ./scripts/smoke_peft_export.mjs --org-id=<uuid>
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");

const OUT_BASE =
  process.env.PEFT_SMOKE_OUT_DIR ||
  path.join(os.tmpdir(), "peft-smoke-export");

function log(step, detail = "") {
  console.log(`${step}${detail ? ` — ${detail}` : ""}`);
}

function fail(step, detail = "") {
  console.error(`FAIL  ${step}${detail ? ` — ${detail}` : ""}`);
  process.exitCode = 1;
}

function pass(step, detail = "") {
  console.log(`PASS  ${step}${detail ? ` — ${detail}` : ""}`);
}

const USE_DOCKER_PSQL = process.env.PEFT_SMOKE_PSQL ? false : true;

function psqlQuery(sql) {
  let res;
  if (USE_DOCKER_PSQL) {
    res = spawnSync(
      "docker",
      [
        "exec",
        "masterfabric-postgres",
        "psql",
        "-U",
        "masterfabric",
        "-d",
        "masterfabric",
        "-t",
        "-A",
        "-F|",
        "-c",
        sql,
      ],
      { encoding: "utf8", cwd: backendRoot },
    );
  } else {
    res = spawnSync(process.env.PEFT_SMOKE_PSQL, ["-c", sql], {
      encoding: "utf8",
      shell: true,
      cwd: backendRoot,
    });
  }
  if (res.status !== 0) {
    throw new Error(res.stderr || res.stdout || "psql failed");
  }
  return res.stdout.trim();
}

function psqlRows(sql) {
  const out = psqlQuery(sql);
  if (!out) return [];
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("|"));
}

function runExport(args, outDir) {
  const res = spawnSync("go", ["run", "./cmd/export-peft-dataset", ...args], {
    encoding: "utf8",
    cwd: backendRoot,
    env: { ...process.env },
  });
  return {
    code: res.status ?? 1,
    stdout: res.stdout || "",
    stderr: res.stderr || "",
    outDir,
  };
}

function parseManifest(outDir) {
  const p = path.join(outDir, "manifest.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const argOrgId = process.argv.find((a) => a.startsWith("--org-id="))?.slice(9);

try {
  log("=== PEFT Export Smoke (Phase D) ===");

  // 1. Migration 00018
  const migRows = psqlRows(
    "SELECT version_id, is_applied FROM goose_db_version WHERE version_id = 18;",
  );
  if (!migRows.length || migRows[0][1] !== "t") {
    fail("migration 00018", "not applied — run: goose ... up");
    process.exit(1);
  }
  pass("migration 00018", "applied");

  const idxRows = psqlRows(
    "SELECT indexname FROM pg_indexes WHERE indexname = 'idx_generated_documents_peft_export';",
  );
  if (!idxRows.length) {
    fail("index idx_generated_documents_peft_export", "missing");
    process.exit(1);
  }
  pass("peft export index", "exists");

  // 2. Organizations
  const orgCount = psqlQuery("SELECT COUNT(*) FROM organizations;");
  if (Number(orgCount) < 1) {
    fail("organizations", "none found");
    process.exit(1);
  }
  pass("organizations", `count=${orgCount}`);

  // 3. Workspaces
  const wsCount = psqlQuery("SELECT COUNT(*) FROM workspaces;");
  pass("workspaces", `count=${wsCount}`);

  // 4. Approved product_spec candidates (repository filter)
  const candidateSQL = `
SELECT d.organization_id, o.name, COUNT(*)::text
FROM generated_documents d
JOIN organizations o ON o.id = d.organization_id
WHERE d.document_type = 'product_spec'
  AND d.status = 'succeeded'
  AND d.approval_status = 'approved'
  AND d.markdown_body <> ''
GROUP BY d.organization_id, o.name
ORDER BY COUNT(*) DESC;`;

  const candidateOrgs = psqlRows(candidateSQL);
  if (!candidateOrgs.length) {
    fail(
      "approved product_spec documents",
      "0 candidates — generate + approve a product_spec via UI/API first (read-only smoke stops here)",
    );
    log("");
    log("Existing document summary:");
    const summary = psqlRows(`
SELECT document_type, status, approval_status, COUNT(*)::text
FROM generated_documents
GROUP BY document_type, status, approval_status
ORDER BY COUNT(*) DESC;`);
    for (const row of summary) {
      log(`  ${row[0]} / ${row[1]} / ${row[2]} → ${row[3]}`);
    }
    process.exitCode = 2;
    process.exit(2);
  }

  const [orgId, orgName, candidateCount] = candidateOrgs[0];
  pass("approved product_spec", `${orgName} (${orgId}) candidates=${candidateCount}`);

  // 5. Fingerprint / body length pre-check on candidates
  const detailRows = psqlRows(`
SELECT d.id::text,
       LENGTH(COALESCE(d.source_fingerprint, ''))::text,
       LENGTH(d.markdown_body)::text,
       d.language
FROM generated_documents d
WHERE d.organization_id = '${orgId}'
  AND d.document_type = 'product_spec'
  AND d.status = 'succeeded'
  AND d.approval_status = 'approved'
  AND d.markdown_body <> ''
ORDER BY d.approved_at DESC NULLS LAST
LIMIT 5;`);

  for (const [docId, fpLen, bodyLen, lang] of detailRows) {
    const fpOk = Number(fpLen) > 0;
    const bodyOk = Number(bodyLen) >= 200;
    log(
      `  doc ${docId.slice(0, 8)}… fp_len=${fpLen}${fpOk ? "" : " (WARN: empty fingerprint — use --include-legacy-no-fingerprint)"} body_len=${bodyLen}${bodyOk ? "" : " (WARN: may fail min-quality)"} lang=${lang}`,
    );
  }

  const targetOrgId = argOrgId || orgId;
  if (argOrgId && argOrgId !== orgId) {
    log("note", `using --org-id=${argOrgId} override (best candidate org was ${orgId})`);
  }

  // 6. Dry-run
  const dryDir = path.join(OUT_BASE, "dry-run");
  fs.rmSync(dryDir, { recursive: true, force: true });
  const dry = runExport(
    [
      `--org-id=${targetOrgId}`,
      `--out-dir=${dryDir}`,
      "--dry-run",
      "--verbose",
      "--force",
    ],
    dryDir,
  );
  log(dry.stdout.trim());
  if (dry.stderr.trim()) log(dry.stderr.trim());

  const dryManifest = parseManifest(dryDir);
  if (!dryManifest) {
    fail("dry-run", "manifest.json missing");
    process.exit(1);
  }
  if (dry.code !== 0 && dry.code !== 2) {
    fail("dry-run", `exit code ${dry.code}`);
    process.exit(dry.code);
  }

  const exported = dryManifest.counts?.exported ?? 0;
  if (exported < 1) {
    fail("dry-run", `exported=${exported} — check skip_reasons in ${dryDir}/manifest.json`);
    process.exit(2);
  }
  pass("dry-run", `exported=${exported} candidates=${dryManifest.counts.candidates}`);

  // 7. Full export (only after successful dry-run)
  const fullDir = path.join(OUT_BASE, "full");
  fs.rmSync(fullDir, { recursive: true, force: true });
  const full = runExport(
    [
      `--org-id=${targetOrgId}`,
      `--out-dir=${fullDir}`,
      "--write-skipped",
      "--verbose",
      "--force",
    ],
    fullDir,
  );
  log(full.stdout.trim());
  if (full.stderr.trim()) log(full.stderr.trim());

  if (full.code !== 0) {
    fail("full export", `exit code ${full.code}`);
    process.exit(full.code);
  }

  const trainPath = path.join(fullDir, "train.jsonl");
  const valPath = path.join(fullDir, "val.jsonl");
  if (!fs.existsSync(trainPath)) {
    fail("full export", "train.jsonl missing");
    process.exit(1);
  }
  const trainLines = fs.readFileSync(trainPath, "utf8").trim().split("\n").filter(Boolean);
  pass("full export", `train lines=${trainLines.length} val=${fs.existsSync(valPath) ? fs.readFileSync(valPath, "utf8").trim().split("\n").filter(Boolean).length : 0}`);
  pass("artifacts", fullDir);

  console.log("\n=== PEFT Export Smoke PASSED ===");
} catch (err) {
  fail("smoke", err.message);
  process.exit(1);
}
