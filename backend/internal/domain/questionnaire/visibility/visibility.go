package visibility

import (
	"encoding/json"
	"strings"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/model"
)

// Rule is the supported visibility_rules payload shape:
//
//	{"show_if":{"question_key":"uses_ai","op":"equals","value":true}}
//
// Empty / missing / invalid rules are treated as visible (safe fallback).
type Rule struct {
	ShowIf *Condition `json:"show_if"`
}

// Condition describes a single dependency on another question's answer.
type Condition struct {
	QuestionKey string          `json:"question_key"`
	Op          string          `json:"op"`
	Value       json.RawMessage `json:"value"`
}

// AnswerLookup resolves a question key to its raw answer value.
type AnswerLookup map[string]json.RawMessage

// IsVisible reports whether a question should be shown given current answers.
// Unknown operators, malformed JSON, or missing dependency keys fail open
// (return true) so the questionnaire never breaks on bad seed data.
func IsVisible(rules json.RawMessage, answers AnswerLookup) bool {
	cond, ok := parseShowIf(rules)
	if !ok {
		return true
	}
	if cond == nil {
		return true
	}
	if strings.TrimSpace(cond.QuestionKey) == "" {
		return true
	}

	raw, has := answers[cond.QuestionKey]
	return evaluate(cond.Op, raw, has, cond.Value)
}

// IsVisibleQuestion is a convenience wrapper around IsVisible.
func IsVisibleQuestion(q *model.Question, answers AnswerLookup) bool {
	if q == nil {
		return true
	}
	return IsVisible(q.VisibilityRules, answers)
}

func parseShowIf(rules json.RawMessage) (*Condition, bool) {
	trimmed := strings.TrimSpace(string(rules))
	if trimmed == "" || trimmed == "null" || trimmed == "{}" {
		return nil, true
	}

	var rule Rule
	if err := json.Unmarshal(rules, &rule); err != nil {
		return nil, false
	}
	if rule.ShowIf == nil {
		return nil, true
	}
	return rule.ShowIf, true
}

func evaluate(op string, answer json.RawMessage, hasAnswer bool, expected json.RawMessage) bool {
	op = normalizeOp(op)
	switch op {
	case "equals":
		return equals(answer, expected)
	case "not_equals":
		return !equals(answer, expected)
	case "contains":
		return contains(answer, expected)
	case "not_contains":
		return !contains(answer, expected)
	case "not_empty":
		return hasAnswer && !model.IsEmptyValue(answer)
	case "empty":
		return !hasAnswer || model.IsEmptyValue(answer)
	case "in":
		return valueInExpectedList(answer, expected)
	case "not_in":
		return !valueInExpectedList(answer, expected)
	default:
		// Unknown operator → fail open.
		return true
	}
}

func normalizeOp(op string) string {
	switch strings.ToLower(strings.TrimSpace(op)) {
	case "eq", "equals", "==":
		return "equals"
	case "neq", "ne", "not_equals", "not_eq", "!=":
		return "not_equals"
	case "contains", "includes":
		return "contains"
	case "not_contains", "excludes":
		return "not_contains"
	case "not_empty", "truthy":
		return "not_empty"
	case "empty", "falsy":
		return "empty"
	case "in":
		return "in"
	case "not_in":
		return "not_in"
	default:
		return strings.ToLower(strings.TrimSpace(op))
	}
}

func equals(answer, expected json.RawMessage) bool {
	if model.IsEmptyValue(answer) && model.IsEmptyValue(expected) {
		return true
	}
	av, aOK := decodeJSON(answer)
	ev, eOK := decodeJSON(expected)
	if !aOK || !eOK {
		return strings.TrimSpace(string(answer)) == strings.TrimSpace(string(expected))
	}
	return valuesEqual(av, ev)
}

func contains(answer, expected json.RawMessage) bool {
	av, aOK := decodeJSON(answer)
	ev, eOK := decodeJSON(expected)
	if !aOK || !eOK {
		return false
	}

	switch actual := av.(type) {
	case []any:
		for _, item := range actual {
			if valuesEqual(item, ev) {
				return true
			}
		}
		return false
	case string:
		switch exp := ev.(type) {
		case string:
			return strings.Contains(actual, exp)
		default:
			return false
		}
	default:
		return valuesEqual(av, ev)
	}
}

func valueInExpectedList(answer, expectedList json.RawMessage) bool {
	av, aOK := decodeJSON(answer)
	ev, eOK := decodeJSON(expectedList)
	if !aOK || !eOK {
		return false
	}
	list, ok := ev.([]any)
	if !ok {
		return valuesEqual(av, ev)
	}

	// Multi-select answers: visible if any selected value is in the expected list.
	if actualList, ok := av.([]any); ok {
		for _, item := range actualList {
			for _, exp := range list {
				if valuesEqual(item, exp) {
					return true
				}
			}
		}
		return false
	}

	for _, exp := range list {
		if valuesEqual(av, exp) {
			return true
		}
	}
	return false
}

func decodeJSON(raw json.RawMessage) (any, bool) {
	if len(raw) == 0 {
		return nil, false
	}
	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
		return nil, false
	}
	return v, true
}

func valuesEqual(a, b any) bool {
	switch av := a.(type) {
	case bool:
		bv, ok := b.(bool)
		return ok && av == bv
	case float64:
		bv, ok := b.(float64)
		return ok && av == bv
	case string:
		bv, ok := b.(string)
		return ok && av == bv
	case nil:
		return b == nil
	default:
		ab, err1 := json.Marshal(a)
		bb, err2 := json.Marshal(b)
		if err1 != nil || err2 != nil {
			return false
		}
		return string(ab) == string(bb)
	}
}

// BuildAnswerLookup maps each question's key to its current answer value.
func BuildAnswerLookup(questions []*model.Question, answersByQuestionID map[uuid.UUID]*model.Answer) AnswerLookup {
	lookup := make(AnswerLookup, len(questions))
	for _, q := range questions {
		if q == nil || strings.TrimSpace(q.Key) == "" {
			continue
		}
		if answer, ok := answersByQuestionID[q.ID]; ok && answer != nil {
			lookup[q.Key] = answer.Value
		}
	}
	return lookup
}
