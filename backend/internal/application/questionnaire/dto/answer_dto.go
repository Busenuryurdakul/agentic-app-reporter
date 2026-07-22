package dto

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// UpsertAnswerRequest is the input for saving a single answer.
type UpsertAnswerRequest struct {
	Value json.RawMessage `json:"value"`
}

// BulkAnswerItem is a single answer within a bulk-upsert request.
type BulkAnswerItem struct {
	QuestionID uuid.UUID       `json:"question_id" validate:"required"`
	Value      json.RawMessage `json:"value"`
}

// BulkUpsertAnswersRequest is the input for saving multiple answers at once.
type BulkUpsertAnswersRequest struct {
	Answers []BulkAnswerItem `json:"answers" validate:"required,min=1,dive"`
}

// AnswerInfo is the public representation of an answer.
type AnswerInfo struct {
	ID             uuid.UUID       `json:"id"`
	OrganizationID uuid.UUID       `json:"organization_id"`
	WorkspaceID    uuid.UUID       `json:"workspace_id"`
	QuestionID     uuid.UUID       `json:"question_id"`
	Value          json.RawMessage `json:"value"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}
