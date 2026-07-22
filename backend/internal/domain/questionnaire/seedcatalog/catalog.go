package seedcatalog

import (
	"encoding/json"
	"fmt"

	_ "embed"
)

//go:embed studio_default_questions.json
var studioDefaultQuestionsJSON []byte

// Option is a select-type choice in the studio-default catalog.
type Option struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

// Question is one entry in the studio-default questionnaire catalog.
type Question struct {
	Key             string          `json:"key"`
	Category        string          `json:"category"`
	Title           string          `json:"title"`
	Description     string          `json:"description"`
	Type            string          `json:"type"`
	Required        bool            `json:"required"`
	Order           int             `json:"order"`
	Options         []Option        `json:"options"`
	ConditionalRule json.RawMessage `json:"conditional_rule"`
}

// LoadStudioDefault returns the embedded 117-question studio-default catalog.
func LoadStudioDefault() ([]Question, error) {
	var questions []Question
	if err := json.Unmarshal(studioDefaultQuestionsJSON, &questions); err != nil {
		return nil, fmt.Errorf("parse studio_default_questions.json: %w", err)
	}
	if len(questions) == 0 {
		return nil, fmt.Errorf("studio_default_questions.json is empty")
	}
	seen := make(map[string]struct{}, len(questions))
	for _, q := range questions {
		if q.Key == "" {
			return nil, fmt.Errorf("question missing key: %q", q.Title)
		}
		if _, ok := seen[q.Key]; ok {
			return nil, fmt.Errorf("duplicate question key in seed catalog: %s", q.Key)
		}
		seen[q.Key] = struct{}{}
	}
	return questions, nil
}

// VisibilityRulesJSON normalizes a conditional_rule payload for DB storage.
func VisibilityRulesJSON(raw json.RawMessage) json.RawMessage {
	if len(raw) == 0 || string(raw) == "null" {
		return json.RawMessage(`{}`)
	}
	return raw
}
