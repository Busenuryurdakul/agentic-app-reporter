package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/model"
)

// WorkspaceDocumentStats aggregates generation-run counts for a workspace.
type WorkspaceDocumentStats struct {
	Succeeded     int
	Failed        int
	Pending       int
	LastSuccessAt *time.Time
	LastFailureAt *time.Time
}

// ProviderCount is a provider_name aggregation for observe summaries.
type ProviderCount struct {
	Name  string
	Count int
}

// DocumentRepository persists generated documents.
type DocumentRepository interface {
	Create(ctx context.Context, doc *model.GeneratedDocument) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.GeneratedDocument, error)
	ListByWorkspace(ctx context.Context, workspaceID uuid.UUID, limit int) ([]*model.GeneratedDocument, error)
	CountByWorkspace(ctx context.Context, workspaceID uuid.UUID) (*WorkspaceDocumentStats, error)
	CountProvidersByWorkspace(ctx context.Context, workspaceID uuid.UUID) ([]ProviderCount, error)
	UpdateApproval(ctx context.Context, doc *model.GeneratedDocument) error
}
