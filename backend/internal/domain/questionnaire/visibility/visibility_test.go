package visibility_test

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/visibility"
	"github.com/stretchr/testify/assert"
)

func TestIsVisible_EmptyRulesAreVisible(t *testing.T) {
	t.Parallel()
	assert.True(t, visibility.IsVisible(nil, nil))
	assert.True(t, visibility.IsVisible(json.RawMessage(`{}`), nil))
	assert.True(t, visibility.IsVisible(json.RawMessage(`null`), nil))
}

func TestIsVisible_EqualsBoolean(t *testing.T) {
	t.Parallel()
	rules := json.RawMessage(`{"show_if":{"question_key":"uses_ai","op":"equals","value":true}}`)
	answers := visibility.AnswerLookup{"uses_ai": json.RawMessage(`true`)}
	assert.True(t, visibility.IsVisible(rules, answers))

	answers["uses_ai"] = json.RawMessage(`false`)
	assert.False(t, visibility.IsVisible(rules, answers))
}

func TestIsVisible_EqAlias(t *testing.T) {
	t.Parallel()
	rules := json.RawMessage(`{"show_if":{"question_key":"uses_ai","op":"eq","value":true}}`)
	answers := visibility.AnswerLookup{"uses_ai": json.RawMessage(`true`)}
	assert.True(t, visibility.IsVisible(rules, answers))
}

func TestIsVisible_NotEquals(t *testing.T) {
	t.Parallel()
	rules := json.RawMessage(`{"show_if":{"question_key":"hosting_model","op":"not_equals","value":"none"}}`)
	answers := visibility.AnswerLookup{"hosting_model": json.RawMessage(`"aws"`)}
	assert.True(t, visibility.IsVisible(rules, answers))
	answers["hosting_model"] = json.RawMessage(`"none"`)
	assert.False(t, visibility.IsVisible(rules, answers))
}

func TestIsVisible_ContainsMultiSelect(t *testing.T) {
	t.Parallel()
	rules := json.RawMessage(`{"show_if":{"question_key":"user_roles","op":"contains","value":"custom"}}`)
	answers := visibility.AnswerLookup{"user_roles": json.RawMessage(`["admin","custom"]`)}
	assert.True(t, visibility.IsVisible(rules, answers))
	answers["user_roles"] = json.RawMessage(`["admin"]`)
	assert.False(t, visibility.IsVisible(rules, answers))
}

func TestIsVisible_NotEmpty(t *testing.T) {
	t.Parallel()
	rules := json.RawMessage(`{"show_if":{"question_key":"notes","op":"not_empty"}}`)
	answers := visibility.AnswerLookup{"notes": json.RawMessage(`"hello"`)}
	assert.True(t, visibility.IsVisible(rules, answers))
	answers["notes"] = json.RawMessage(`""`)
	assert.False(t, visibility.IsVisible(rules, answers))
	assert.False(t, visibility.IsVisible(rules, visibility.AnswerLookup{}))
}

func TestIsVisible_NotIn(t *testing.T) {
	t.Parallel()
	rules := json.RawMessage(`{"show_if":{"question_key":"external_integrations","op":"not_in","value":["none"]}}`)
	answers := visibility.AnswerLookup{"external_integrations": json.RawMessage(`["github"]`)}
	assert.True(t, visibility.IsVisible(rules, answers))
	answers["external_integrations"] = json.RawMessage(`["none"]`)
	assert.False(t, visibility.IsVisible(rules, answers))
}

func TestIsVisible_InvalidRuleFailsOpen(t *testing.T) {
	t.Parallel()
	assert.True(t, visibility.IsVisible(json.RawMessage(`{not-json`), nil))
	assert.True(t, visibility.IsVisible(json.RawMessage(`{"show_if":{"question_key":"x","op":"unknown_op","value":1}}`), nil))
}

func TestBuildAnswerLookup(t *testing.T) {
	t.Parallel()
	qID := uuid.New()
	questions := []*model.Question{{ID: qID, Key: "uses_ai"}}
	answers := map[uuid.UUID]*model.Answer{
		qID: {QuestionID: qID, Value: json.RawMessage(`true`)},
	}
	lookup := visibility.BuildAnswerLookup(questions, answers)
	assert.Equal(t, json.RawMessage(`true`), lookup["uses_ai"])
}
