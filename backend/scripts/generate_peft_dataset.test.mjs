import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildAnswersForQuestions, buildProfilePayload } from "./lib/peft_dataset_answers.mjs";
import { SCENARIOS, selectScenarios } from "./lib/peft_dataset_scenarios.mjs";
import {
  assertMockAllowed,
  assessDocumentQuality,
  buildWorkspaceDescription,
  buildWorkspaceSlug,
  containsForbiddenMarker,
  findExistingScenarioWorkspace,
  isAlphanumericSlug,
  parseArgs,
  parseScenarioKeyFromDescription,
  parseScenarioKeys,
  validateArgs,
} from "./lib/peft_dataset_utils.mjs";

describe("generate_peft_dataset", () => {
  it("requires org-id", () => {
    assert.throws(() => validateArgs(parseArgs([])), /--org-id is required/);
  });

  it("dry-run args defaults", () => {
    const args = parseArgs(["--org-id=abc", "--dry-run"]);
    assert.equal(args.dryRun, true);
    assert.equal(args.approve, false);
    assert.equal(args.count, 30);
  });

  it("slug is alphanumeric", () => {
    const slug = buildWorkspaceSlug(1785438552347, 3);
    assert.equal(isAlphanumericSlug(slug), true);
    assert.match(slug, /^peftdata/);
  });

  it("rejects mock without allow flag", () => {
    assert.throws(() => assertMockAllowed("mock", false), /--allow-mock/);
  });

  it("allows mock with flag", () => {
    assert.doesNotThrow(() => assertMockAllowed("mock", true));
  });

  it("scenario key idempotency parse", () => {
    const desc = buildWorkspaceDescription("rural-producer-platform");
    assert.equal(parseScenarioKeyFromDescription(desc), "rural-producer-platform");
    const workspaces = [{ id: "1", description: desc }];
    assert.ok(findExistingScenarioWorkspace(workspaces, "rural-producer-platform"));
  });

  it("count beyond pool throws", () => {
    assert.throws(
      () => selectScenarios(SCENARIOS, { count: SCENARIOS.length + 1, startIndex: 1 }),
      /exceeds available scenarios/,
    );
  });

  it("forbidden markers detected", () => {
    assert.equal(containsForbiddenMarker("hello [[PEFT_SMOKE_TEST]]"), true);
    assert.equal(containsForbiddenMarker("Kırsal kalkınma"), false);
  });

  it("quality assessment fails short body", () => {
    const q = assessDocumentQuality({
      status: "succeeded",
      document_type: "product_spec",
      markdown_body: "short",
      quality: { quality_score: 50, section_coverage_ok: false },
    });
    assert.equal(q.passed, false);
  });

  it("profile payload has no smoke markers", () => {
    const p = buildProfilePayload(SCENARIOS[0], "tr");
    assert.equal(containsForbiddenMarker(JSON.stringify(p)), false);
  });

  it("supports api-key auth via env without logging secrets", () => {
    const prev = process.env.PEFT_DATASET_API_KEY;
    process.env.PEFT_DATASET_API_KEY = "adcs_test_secret_value";
    const args = parseArgs(["--org-id=abc"]);
    assert.equal(args.apiKey, "adcs_test_secret_value");
    process.env.PEFT_DATASET_API_KEY = prev || "";
  });

  it("parseScenarioKeys splits comma list", () => {
    assert.deepEqual(parseScenarioKeys("a,b,c"), ["a", "b", "c"]);
  });

  it("validateArgs accepts scenario-keys without count", () => {
    const args = parseArgs(["--org-id=abc", "--scenario-keys=meal-plan-mobile"]);
    validateArgs(args);
    assert.deepEqual(args.scenarioKeyList, ["meal-plan-mobile"]);
  });

  it("answer builder produces items for sample questions", () => {
    const scenario = SCENARIOS[0];
    const questions = [
      {
        id: "q1",
        key: "project_name",
        title: "Proje adı",
        input_type: "short_text",
        required: true,
        active: true,
        options: [],
      },
      {
        id: "q2",
        key: "product_type",
        title: "Ürün tipi",
        input_type: "single_select",
        required: true,
        active: true,
        options: [{ value: "web_app", label: "Web" }],
      },
    ];
    const { answers } = buildAnswersForQuestions(questions, scenario, "tr");
    assert.equal(answers.length, 2);
  });
});
