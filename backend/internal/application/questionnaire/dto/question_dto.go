package dto

import (
	"encoding/json"

	"github.com/google/uuid"
)

// QuestionOptionInfo is the public representation of a question option.
type QuestionOptionInfo struct {
	ID           uuid.UUID `json:"id"`
	Value        string    `json:"value"`
	Label        string    `json:"label"`
	DisplayOrder int       `json:"display_order"`
}

// QuestionInfo is the public representation of a question.
type QuestionInfo struct {
	ID              uuid.UUID            `json:"id"`
	SetID           uuid.UUID            `json:"set_id"`
	Key             string               `json:"key"`
	Category        string               `json:"category"`
	Title           string               `json:"title"`
	Description     string               `json:"description"`
	InputType       string               `json:"input_type"`
	Required        bool                 `json:"required"`
	DisplayOrder    int                  `json:"display_order"`
	ValidationRules json.RawMessage      `json:"validation_rules,omitempty"`
	VisibilityRules json.RawMessage      `json:"visibility_rules,omitempty"`
	HelpText        string               `json:"help_text,omitempty"`
	ExampleAnswer   string               `json:"example_answer,omitempty"`
	Active          bool                 `json:"active"`
	Options         []QuestionOptionInfo `json:"options,omitempty"`
}

// WorkspaceQuestionInfo is a question merged with the workspace's current
// answer (if any), used to render the questionnaire form.
type WorkspaceQuestionInfo struct {
	QuestionInfo
	Answer   json.RawMessage `json:"answer,omitempty"`
	Answered bool            `json:"answered"`
	// Visible is set by list-workspace-questions after evaluating visibility_rules.
	// Nil means the server did not evaluate visibility (treat as visible).
	Visible *bool `json:"visible,omitempty"`
}

// WorkspaceQuestionsResult bundles the resolved set with its merged questions.
type WorkspaceQuestionsResult struct {
	SetID     uuid.UUID               `json:"set_id"`
	SetKey    string                  `json:"set_key"`
	Questions []WorkspaceQuestionInfo `json:"questions"`
}

// MissingQuestionInfo describes a required question that has not been answered.
type MissingQuestionInfo struct {
	QuestionID uuid.UUID `json:"question_id"`
	Category   string    `json:"category"`
	Title      string    `json:"title"`
}

// MissingInformationResult lists required questions still missing an answer.
type MissingInformationResult struct {
	SetID    uuid.UUID             `json:"set_id"`
	Missing  []MissingQuestionInfo `json:"missing"`
	Total    int                   `json:"total_required"`
	Answered int                   `json:"total_answered"`
}
