package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/model"
)

// AnswerRepository defines the interface for answer persistence.
type AnswerRepository interface {
	// GetByWorkspaceAndQuestion retrieves a single answer.
	GetByWorkspaceAndQuestion(ctx context.Context, workspaceID, questionID uuid.UUID) (*model.Answer, error)

	// ListByWorkspace lists all answers recorded for a workspace.
	ListByWorkspace(ctx context.Context, workspaceID uuid.UUID) ([]*model.Answer, error)

	// Upsert creates or updates a single answer, keyed on (workspace_id, question_id).
	Upsert(ctx context.Context, answer *model.Answer) error

	// BulkUpsert creates or updates multiple answers in a single operation.
	BulkUpsert(ctx context.Context, answers []*model.Answer) error
}
