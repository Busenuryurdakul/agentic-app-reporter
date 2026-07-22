package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/generation/dto"
	docRepo "github.com/masterfabric-go/masterfabric/internal/domain/document/repository"
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
)

// ListDocumentsUseCase lists generated documents for a workspace.
type ListDocumentsUseCase struct {
	docRepo       docRepo.DocumentRepository
	workspaceRepo tenantRepo.WorkspaceRepository
}

// NewListDocumentsUseCase creates a ListDocumentsUseCase.
func NewListDocumentsUseCase(docRepo docRepo.DocumentRepository, workspaceRepo tenantRepo.WorkspaceRepository) *ListDocumentsUseCase {
	return &ListDocumentsUseCase{docRepo: docRepo, workspaceRepo: workspaceRepo}
}

// Execute returns document summaries (no markdown bodies).
func (uc *ListDocumentsUseCase) Execute(ctx context.Context, workspaceID uuid.UUID, limit int) (*dto.DocumentListResult, error) {
	if _, _, err := resolveWorkspace(ctx, uc.workspaceRepo, workspaceID); err != nil {
		return nil, err
	}

	docs, err := uc.docRepo.ListByWorkspace(ctx, workspaceID, limit)
	if err != nil {
		return nil, err
	}

	out := &dto.DocumentListResult{Documents: make([]dto.DocumentSummary, 0, len(docs))}
	for _, d := range docs {
		out.Documents = append(out.Documents, toDocumentSummary(d))
	}
	return out, nil
}
