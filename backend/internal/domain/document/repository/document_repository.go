package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/model"
)

// DocumentRepository persists generated documents.
type DocumentRepository interface {
	Create(ctx context.Context, doc *model.GeneratedDocument) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.GeneratedDocument, error)
	ListByWorkspace(ctx context.Context, workspaceID uuid.UUID, limit int) ([]*model.GeneratedDocument, error)
}
