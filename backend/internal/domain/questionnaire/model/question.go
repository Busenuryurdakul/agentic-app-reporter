package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Question represents a single questionnaire question belonging to a set.
type Question struct {
	ID              uuid.UUID       `json:"id"`
	SetID           uuid.UUID       `json:"set_id"`
	Key             string          `json:"key"`
	Category        string          `json:"category"`
	Title           string          `json:"title"`
	Description     string          `json:"description"`
	InputType       string          `json:"input_type"`
	Required        bool            `json:"required"`
	DisplayOrder    int             `json:"display_order"`
	ValidationRules json.RawMessage `json:"validation_rules"`
	VisibilityRules json.RawMessage `json:"visibility_rules"`
	HelpText        string          `json:"help_text"`
	ExampleAnswer   string          `json:"example_answer"`
	Active          bool            `json:"active"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`

	// Options is populated for select-type questions (single_select/multi_select).
	Options []*QuestionOption `json:"options,omitempty"`
}

// HasChoices reports whether the question's input type expects predefined options.
func (q *Question) HasChoices() bool {
	switch InputType(q.InputType) {
	case InputTypeSingleSelect, InputTypeMultiSelect:
		return true
	default:
		return false
	}
}
