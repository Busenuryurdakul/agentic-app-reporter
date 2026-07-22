package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/model"
)

// QuestionRepository defines the interface for question persistence.
type QuestionRepository interface {
	// GetByID retrieves a single question (with its options) by ID.
	GetByID(ctx context.Context, id uuid.UUID) (*model.Question, error)

	// ListBySetID lists all active questions (with their options) for a set,
	// ordered by category and display order.
	ListBySetID(ctx context.Context, setID uuid.UUID) ([]*model.Question, error)

	// ListRequiredActiveBySetID lists only the required, active questions for
	// a set. Used by the missing-information calculation.
	ListRequiredActiveBySetID(ctx context.Context, setID uuid.UUID) ([]*model.Question, error)
}
