package dto

import (
	"time"

	"github.com/google/uuid"
)

// QuestionnaireSetInfo is the public representation of a questionnaire set.
type QuestionnaireSetInfo struct {
	ID             uuid.UUID  `json:"id"`
	OrganizationID *uuid.UUID `json:"organization_id,omitempty"`
	Key            string     `json:"key"`
	Title          string     `json:"title"`
	Description    string     `json:"description"`
	IsDefault      bool       `json:"is_default"`
	Active         bool       `json:"active"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// QuestionnaireSetDetail is a set together with its ordered questions.
type QuestionnaireSetDetail struct {
	QuestionnaireSetInfo
	Questions []QuestionInfo `json:"questions"`
}
