/**
 * Batch seed N isolated PEFT smoke workspaces under one org (split / analysis testing).
 *
 * Prerequisites: API on localhost:8080, LLM_PROVIDER=mock, Docker postgres.
 *
 * Usage:
 *   node ./scripts/smoke_peft_batch_seed.mjs
 *   node ./scripts/smoke_peft_batch_seed.mjs --count=12 --no-sql-patch
 */

import {
  SMOKE_DATASET_MARKER,
  api,
  seedOneWorkspace,
} from "./lib/peft_seed_common.mjs";

const countArg = process.argv.find((a) => a.startsWith("--count="));
const count = countArg ? Math.max(1, Number(countArg.slice(8)) || 1) : 12;
const noSqlPatch =
  process.argv.includes("--no-sql-patch") ||
  process.env.PEFT_SEED_NO_SQL_PATCH === "1";

const ts = Date.now();
const email = `smoke_peft_batch_${ts}@example.com`;
const password = "SmokeTest123!";
const orgSlug = `smokepeftbatch${String(ts).slice(-6)}`;

try {
  await api("POST", "/auth/register", {
    body: { email, password, first_name: "PEFT", last_name: "Batch" },
  });
  const login = await api("POST", "/auth/login", { body: { email, password } });
  const token = login.data.token;
  console.log(`PASS  auth — ${email}`);

  const org = await api("POST", "/organizations", {
    token,
    body: { name: `PEFT Smoke Batch Org ${ts}`, slug: orgSlug },
  });
  const orgId = org.data.id;
  console.log(`PASS  org — ${orgId}`);

  const seeded = [];
  for (let i = 1; i <= count; i++) {
    const row = await seedOneWorkspace({ token, orgId, ts, index: i, noSqlPatch });
    seeded.push(row);
    console.log(`PASS  workspace ${i}/${count} — ws=${row.workspaceId} doc=${row.docId}`);
  }

  console.log("");
  console.log("=== PEFT batch seed complete ===");
  console.log(`ORG_ID=${orgId}`);
  console.log(`WORKSPACES=${seeded.length}`);
  console.log("");
  console.log(`Export:  go run ./cmd/export-peft-dataset --org-id=${orgId} --out-dir=./peft-export-batch --force`);
  console.log(`Analyze: node ./scripts/analyze_peft_dataset.mjs --dataset-dir=./peft-export-batch`);
  console.log("");
  console.log(
    "NOTE  Smoke org — use --exclude-smoke-markers for production exports; this batch is for pipeline testing only.",
  );
  console.log(`NOTE  Marker: ${SMOKE_DATASET_MARKER}`);
} catch (err) {
  console.error(`FAIL  ${err.message}`);
  process.exit(1);
}
