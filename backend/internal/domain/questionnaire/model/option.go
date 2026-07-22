package model

import (
	"time"

	"github.com/google/uuid"
)

// QuestionOption is a selectable choice for single_select/multi_select questions.
type QuestionOption struct {
	ID           uuid.UUID `json:"id"`
	QuestionID   uuid.UUID `json:"question_id"`
	Value        string    `json:"value"`
	Label        string    `json:"label"`
	DisplayOrder int       `json:"display_order"`
	CreatedAt    time.Time `json:"created_at"`
}
