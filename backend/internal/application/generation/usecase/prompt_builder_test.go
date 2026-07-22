package usecase

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPromptBuilder_TurkishIncludesVisibleAnswersAndMissing(t *testing.T) {
	ctx := &WorkspaceLLMContext{
		WorkspaceID:      uuid.New(),
		WorkspaceName:    "Demo",
		WorkspaceSlug:    "demo",
		Language:         "tr",
		QuestionnaireSet: "studio-default",
		GeneratedAt:      time.Now().UTC(),
		Profile: ProfileSnapshot{
			ProjectName: "Reporter",
			Sections: map[string]json.RawMessage{
				"ai": json.RawMessage(`{"model":"x","api_key":"***"}`),
			},
		},
		Answers: []VisibleAnswer{
			{Key: "uses_ai", Category: "AI", Title: "AI?", Value: json.RawMessage(`false`), Required: true, Answered: true},
			{Key: "project_name", Category: "Genel", Title: "Ad", Value: json.RawMessage(`"Reporter"`), Required: true, Answered: true},
		},
		MissingRequired: []MissingRequiredItem{
			{Key: "target_users", Category: "Genel", Title: "Hedef"},
		},
	}

	req, err := NewPromptBuilder().Build(ctx)
	require.NoError(t, err)
	assert.Contains(t, req.SystemPrompt, "Markdown")
	assert.Contains(t, req.UserPrompt, "Çalışma alanı bağlamı")
	assert.Contains(t, req.UserPrompt, "`uses_ai`")
	assert.Contains(t, req.UserPrompt, "`project_name`")
	assert.NotContains(t, req.UserPrompt, "llm_providers")
	assert.Contains(t, req.UserPrompt, "Eksik zorunlu bilgiler")
	assert.Contains(t, req.UserPrompt, "target_users")
	assert.Contains(t, req.UserPrompt, `"api_key":"***"`)
	assert.NotContains(t, req.UserPrompt, "super-secret")
}

func TestPromptBuilder_English(t *testing.T) {
	req, err := NewPromptBuilder().Build(&WorkspaceLLMContext{
		WorkspaceName:    "Demo",
		WorkspaceSlug:    "demo",
		Language:         "en",
		QuestionnaireSet: "studio-default",
		Profile:          ProfileSnapshot{ProjectName: "X", Sections: map[string]json.RawMessage{}},
	})
	require.NoError(t, err)
	assert.Contains(t, req.SystemPrompt, "technical documentation")
	assert.Contains(t, req.UserPrompt, "Workspace context")
	assert.Contains(t, req.UserPrompt, "Project profile")
}

func TestPromptBuilder_NilContext(t *testing.T) {
	_, err := NewPromptBuilder().Build(nil)
	require.Error(t, err)
}

func TestSanitizeJSONValue_RedactsNestedSecrets(t *testing.T) {
	raw := json.RawMessage(`{"model":"g","token":"abc","nested":{"password":"x","ok":1}}`)
	out := sanitizeJSONValue(raw)
	s := string(out)
	assert.Contains(t, s, `"token":"***"`)
	assert.Contains(t, s, `"password":"***"`)
	assert.Contains(t, s, `"ok":1`)
	assert.NotContains(t, s, `"abc"`)
}
