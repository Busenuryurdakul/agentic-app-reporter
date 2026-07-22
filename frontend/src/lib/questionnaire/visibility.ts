export type VisibilityCondition = {
  question_key?: string;
  op?: string;
  value?: unknown;
};

export type VisibilityRules = {
  show_if?: VisibilityCondition | null;
};

function normalizeOp(op: string | undefined): string {
  const value = (op ?? "").trim().toLowerCase();
  switch (value) {
    case "eq":
    case "equals":
    case "==":
      return "equals";
    case "neq":
    case "ne":
    case "not_equals":
    case "not_eq":
    case "!=":
      return "not_equals";
    case "contains":
    case "includes":
      return "contains";
    case "not_contains":
    case "excludes":
      return "not_contains";
    case "not_empty":
    case "truthy":
      return "not_empty";
    case "empty":
    case "falsy":
      return "empty";
    case "in":
      return "in";
    case "not_in":
      return "not_in";
    default:
      return value;
  }
}

function isEmptyValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (typeof a === "boolean" || typeof b === "boolean") return a === b;
  if (typeof a === "number" || typeof b === "number") return a === b;
  if (typeof a === "string" || typeof b === "string") return a === b;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function contains(answer: unknown, expected: unknown): boolean {
  if (Array.isArray(answer)) {
    return answer.some((item) => valuesEqual(item, expected));
  }
  if (typeof answer === "string" && typeof expected === "string") {
    return answer.includes(expected);
  }
  return valuesEqual(answer, expected);
}

function valueInList(answer: unknown, expected: unknown): boolean {
  const list = Array.isArray(expected) ? expected : [expected];
  if (Array.isArray(answer)) {
    return answer.some((item) => list.some((exp) => valuesEqual(item, exp)));
  }
  return list.some((exp) => valuesEqual(answer, exp));
}

function evaluate(op: string, answer: unknown, hasAnswer: boolean, expected: unknown): boolean {
  switch (normalizeOp(op)) {
    case "equals":
      return valuesEqual(answer, expected);
    case "not_equals":
      return !valuesEqual(answer, expected);
    case "contains":
      return contains(answer, expected);
    case "not_contains":
      return !contains(answer, expected);
    case "not_empty":
      return hasAnswer && !isEmptyValue(answer);
    case "empty":
      return !hasAnswer || isEmptyValue(answer);
    case "in":
      return valueInList(answer, expected);
    case "not_in":
      return !valueInList(answer, expected);
    default:
      return true;
  }
}

/** Safe visibility check — invalid rules fail open (visible). */
export function isQuestionVisible(
  rules: unknown,
  answersByKey: Record<string, unknown>,
): boolean {
  if (rules == null || rules === "" || (typeof rules === "object" && rules !== null && Object.keys(rules as object).length === 0)) {
    return true;
  }

  let parsed: VisibilityRules;
  try {
    parsed = typeof rules === "string" ? (JSON.parse(rules) as VisibilityRules) : (rules as VisibilityRules);
  } catch {
    return true;
  }

  const cond = parsed?.show_if;
  if (!cond || typeof cond !== "object") return true;
  const key = (cond.question_key ?? "").trim();
  if (!key) return true;

  const hasAnswer = Object.prototype.hasOwnProperty.call(answersByKey, key);
  return evaluate(cond.op ?? "", answersByKey[key], hasAnswer, cond.value);
}

export function buildAnswersByKey(
  questions: Array<{ id: string; key?: string }>,
  answersById: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const q of questions) {
    if (!q.key) continue;
    if (Object.prototype.hasOwnProperty.call(answersById, q.id)) {
      out[q.key] = answersById[q.id];
    }
  }
  return out;
}
