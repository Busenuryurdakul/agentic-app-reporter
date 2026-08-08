import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildAnswersForQuestions,
  inferAiUseCases,
  inferLlmProviders,
  isQuestionVisible,
  scenarioUsesAI,
} from "./lib/peft_dataset_answers.mjs";
import { SCENARIOS } from "./lib/peft_dataset_scenarios.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.resolve(
  __dirname,
  "../internal/domain/questionnaire/seedcatalog/studio_default_questions.json",
);
const seedQuestions = JSON.parse(fs.readFileSync(seedPath, "utf8"));

const AI_KEYS = ["uses_ai", "ai_use_cases", "llm_providers"];

function seedQuestion(key) {
  const row = seedQuestions.find((q) => q.key === key);
  if (!row) throw new Error(`seed question missing: ${key}`);
  return {
    id: `id-${key}`,
    key: row.key,
    title: row.title,
    input_type: row.type,
    required: row.required,
    active: true,
    options: (row.options || []).map((o, i) => ({ value: o.value, label: o.label, display_order: i })),
    visibility_rules: row.conditional_rule,
  };
}

function aiQuestionBundle() {
  return AI_KEYS.map(seedQuestion);
}

function answerValueForKey(answers, questions, key) {
  const q = questions.find((x) => x.key === key);
  return answers.find((a) => a.question_id === q.id)?.value;
}

const FAILED_KEYS = [
  "meal-plan-mobile",
  "ai-customer-support-agent",
  "pr-code-review-agent",
  "doc-analysis-agent",
  "voice-banking-ivr-llm",
  "llm-observability-panel",
];

const VALID_AI_USE_CASES = new Set(
  seedQuestions.find((q) => q.key === "ai_use_cases").options.map((o) => o.value),
);
const VALID_LLM_PROVIDERS = new Set(
  seedQuestions.find((q) => q.key === "llm_providers").options.map((o) => o.value),
);

describe("peft_dataset_answers AI mapping", () => {
  for (const key of FAILED_KEYS) {
    it(`${key} fills required AI answers with valid enum values`, () => {
      const scenario = SCENARIOS.find((s) => s.key === key);
      assert.ok(scenario, `scenario ${key}`);
      const questions = aiQuestionBundle();
      const { answers, fallbackKeys } = buildAnswersForQuestions(questions, scenario, "tr");

      assert.equal(scenarioUsesAI(scenario), true, "expected AI scenario");
      assert.equal(answerValueForKey(answers, questions, "uses_ai"), true);

      const useCases = answerValueForKey(answers, questions, "ai_use_cases");
      const providers = answerValueForKey(answers, questions, "llm_providers");

      assert.ok(Array.isArray(useCases) && useCases.length > 0, "ai_use_cases required");
      assert.ok(Array.isArray(providers) && providers.length > 0, "llm_providers required");
      for (const v of useCases) assert.ok(VALID_AI_USE_CASES.has(v), `invalid ai_use_cases value: ${v}`);
      for (const v of providers) assert.ok(VALID_LLM_PROVIDERS.has(v), `invalid llm_providers value: ${v}`);
      assert.equal(fallbackKeys.includes("ai_use_cases"), false);
      assert.equal(fallbackKeys.includes("llm_providers"), false);
    });
  }

  it("non-AI finops scenario does not send AI child answers when uses_ai is false", () => {
    const scenario = SCENARIOS.find((s) => s.key === "finops-cost-dashboard");
    const questions = aiQuestionBundle();
    const { answers } = buildAnswersForQuestions(questions, scenario, "tr");
    assert.equal(answerValueForKey(answers, questions, "uses_ai"), false);
    assert.equal(answerValueForKey(answers, questions, "ai_use_cases"), undefined);
    assert.equal(answerValueForKey(answers, questions, "llm_providers"), undefined);
  });

  it("API precomputed visible=false does not block local conditional answers", () => {
    const questions = aiQuestionBundle().map((q) =>
      q.key === "ai_use_cases" ? { ...q, visible: false } : q,
    );
    const scenario = SCENARIOS.find((s) => s.key === "ai-customer-support-agent");
    const { answers } = buildAnswersForQuestions(questions, scenario, "tr");
    assert.ok(answerValueForKey(answers, questions, "ai_use_cases")?.length);
  });

  it("meal-plan maps recipe LLM to other + local_oss", () => {
    const scenario = SCENARIOS.find((s) => s.key === "meal-plan-mobile");
    assert.deepEqual(inferAiUseCases(scenario), ["other"]);
    assert.ok(inferLlmProviders(scenario).includes("local_oss"));
  });

  it("customer support agent prefers rag and chat", () => {
    const scenario = SCENARIOS.find((s) => s.key === "ai-customer-support-agent");
    const cases = inferAiUseCases(scenario);
    assert.ok(cases.includes("rag"));
    assert.ok(cases.includes("chat"));
  });
});
