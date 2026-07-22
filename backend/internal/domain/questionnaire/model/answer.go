package model

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Answer represents a workspace's answer to a single question.
type Answer struct {
	ID             uuid.UUID       `json:"id"`
	OrganizationID uuid.UUID       `json:"organization_id"`
	WorkspaceID    uuid.UUID       `json:"workspace_id"`
	QuestionID     uuid.UUID       `json:"question_id"`
	Value          json.RawMessage `json:"value"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

// IsEmptyValue reports whether a raw JSON answer value should be treated as
// "not answered" (absent, null, empty string, empty array, or empty object).
func IsEmptyValue(raw json.RawMessage) bool {
	trimmed := strings.TrimSpace(string(raw))
	switch trimmed {
	case "", "null", `""`, "[]", "{}":
		return true
	default:
		return false
	}
}
