package usecase

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestFormatAnswerForPrompt_ReadableEnums(t *testing.T) {
	val := formatAnswerForPrompt("tr", "ci_cd_platform", json.RawMessage(`"github_actions"`))
	assert.Contains(t, val, "GitHub Actions")
	assert.NotContains(t, val, "github_actions")

	val = formatAnswerForPrompt("tr", "branching_strategy", json.RawMessage(`"trunk_based"`))
	assert.Contains(t, val, "trunk-based")
	assert.NotContains(t, val, "trunk_based")

	val = formatAnswerForPrompt("tr", "environments", json.RawMessage(`["dev","staging","prod"]`))
	assert.Contains(t, val, "Geliştirme")
	assert.Contains(t, val, "Staging")
	assert.Contains(t, val, "Production")
	assert.NotContains(t, val, "staging")
}

func TestFormatAnswerForPrompt_AllowsTechnicalTerms(t *testing.T) {
	val := formatAnswerForPrompt("tr", "api_styles", json.RawMessage(`["rest"]`))
	assert.Equal(t, "REST API", val)
}

func TestFormatAnswerForPrompt_Boolean(t *testing.T) {
	assert.Equal(t, "Evet", formatAnswerForPrompt("tr", "code_review_required", json.RawMessage(`true`)))
	assert.Equal(t, "Hayır", formatAnswerForPrompt("tr", "code_review_required", json.RawMessage(`false`)))
}
