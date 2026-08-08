#!/usr/bin/env node
/**
 * Rollback PEFT Dataset Lab org LLM settings to saved snapshot or env defaults.
 *
 * Usage:
 *   node ./scripts/rollback_test_org_adapter.mjs
 *   node ./scripts/rollback_test_org_adapter.mjs --snapshot=./training-output/test-org-llm-settings.snapshot.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PeftDatasetClient } from "./lib/peft_dataset_client.mjs";
import { parseArgs, redactSecrets } from "./lib/peft_dataset_utils.mjs";

const ORG_ID = "4eda8bd6-7bd3-474c-8e06-267d4a9d0fe8";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SNAPSHOT = path.join(__dirname, "..", "training-output", "test-org-llm-settings.snapshot.json");

function sanitizeSnapshot(body) {
  const s = body?.settings ?? body ?? {};
  return {
    provider: s.provider ?? null,
    model: s.model ?? null,
    base_url: s.base_url ?? null,
    source: s.source ?? null,
    created_at: s.created_at ?? null,
    enabled: s.enabled ?? true,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args["dry-run"] === true || args.dryRun === true || args["dry-run"] === "true";
  const email = args.email || process.env.PEFT_DATASET_EMAIL;
  const password = args.password || process.env.PEFT_DATASET_PASSWORD;
  if (!email || !password) {
    throw new Error("PEFT_DATASET_EMAIL and PEFT_DATASET_PASSWORD required");
  }

  const snapshotPath = path.resolve(args.snapshot || DEFAULT_SNAPSHOT);
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`snapshot not found: ${snapshotPath}`);
  }

  const snap = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  const snapOrg = snap.org_id || ORG_ID;
  if (snapOrg !== ORG_ID) {
    throw new Error(`snapshot org_id mismatch: ${snapOrg} != ${ORG_ID}`);
  }
  const restoreBody = sanitizeSnapshot(snap);

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          action: "dry_run",
          org_id: ORG_ID,
          snapshot_path: snapshotPath,
          would_restore: restoreBody,
          parse_ok: true,
        },
        null,
        2,
      ),
    );
    return;
  }

  const client = new PeftDatasetClient({ orgId: ORG_ID });
  const login = await client.login(email, password);
  client.token = login.data.token;

  const res = await client.updateOrgLlmSettings(restoreBody);
  console.log(JSON.stringify({ action: "restored_snapshot", org_id: ORG_ID, settings: res.data }, null, 2));
}

main().catch((err) => {
  console.error(redactSecrets(err.message));
  process.exit(1);
});
