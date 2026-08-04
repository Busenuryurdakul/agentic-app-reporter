/**
 * Seed isolated PEFT export test data (new org/workspace only — no existing row mutations).
 *
 * Safety:
 *   - Creates a brand-new org + workspace each run (never mutates other tenants).
 *   - SQL patch (if used) updates only the document created in this run (WHERE id = docId).
 *   - Rows are tagged with SMOKE_DATASET_MARKER — not suitable for production fine-tuning.
 *   - Export is org-scoped; use --exclude-smoke-markers for production exports.
 *
 * Usage:
 *   node ./scripts/smoke_peft_seed.mjs
 *   node ./scripts/smoke_peft_seed.mjs --no-sql-patch
 */

import {
  SMOKE_DATASET_MARKER,
  api,
  seedOneWorkspace,
} from "./lib/peft_seed_common.mjs";

const noSqlPatch =
  process.argv.includes("--no-sql-patch") ||
  process.env.PEFT_SEED_NO_SQL_PATCH === "1";

const ts = Date.now();
const email = `smoke_peft_${ts}@example.com`;
const password = "SmokeTest123!";
const orgSlug = `smokepeft${String(ts).slice(-6)}`;

try {
  await api("POST", "/auth/register", {
    body: { email, password, first_name: "PEFT", last_name: "Smoke" },
  });
  const login = await api("POST", "/auth/login", { body: { email, password } });
  const token = login.data.token;
  console.log(`PASS  auth — ${email}`);

  const org = await api("POST", "/organizations", {
    token,
    body: { name: `PEFT Smoke Org ${ts}`, slug: orgSlug },
  });
  const orgId = org.data.id;

  const { workspaceId, docId } = await seedOneWorkspace({
    token,
    orgId,
    ts,
    index: 1,
    noSqlPatch,
  });
  console.log(`PASS  org+workspace — org=${orgId} ws=${workspaceId}`);
  console.log(`PASS  document — id=${docId}`);

  console.log("");
  console.log("=== PEFT seed complete ===");
  console.log(`ORG_ID=${orgId}`);
  console.log(`WORKSPACE_ID=${workspaceId}`);
  console.log(`DOCUMENT_ID=${docId}`);
  console.log("");
  console.log(`Next: node ./scripts/smoke_peft_export.mjs --org-id=${orgId}`);
  console.log("");
  console.log(
    "NOTE  Smoke org — export only for pipeline validation; use --exclude-smoke-markers in production.",
  );
  console.log(`NOTE  Marker: ${SMOKE_DATASET_MARKER}`);
} catch (err) {
  console.error(`FAIL  ${err.message}`);
  process.exit(1);
}
