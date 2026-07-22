package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/generation/dto"
	docRepo "github.com/masterfabric-go/masterfabric/internal/domain/document/repository"
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// RegenerateDocumentUseCase creates a new document from current workspace context,
// using an existing document only for ownership checks and default title.
// The source document is never modified or deleted.
type RegenerateDocumentUseCase struct {
	generate      *GenerateDocumentUseCase
	docRepo       docRepo.DocumentRepository
	workspaceRepo tenantRepo.WorkspaceRepository
}

// NewRegenerateDocumentUseCase creates a RegenerateDocumentUseCase.
func NewRegenerateDocumentUseCase(
	generate *GenerateDocumentUseCase,
	docRepo docRepo.DocumentRepository,
	workspaceRepo tenantRepo.WorkspaceRepository,
) *RegenerateDocumentUseCase {
	return &RegenerateDocumentUseCase{
		generate:      generate,
		docRepo:       docRepo,
		workspaceRepo: workspaceRepo,
	}
}

// Execute regenerates a Markdown document for the workspace.
func (uc *RegenerateDocumentUseCase) Execute(
	ctx context.Context,
	workspaceID, documentID uuid.UUID,
) (*dto.DocumentInfo, error) {
	if uc.generate == nil {
		return nil, domainErr.New(domainErr.ErrServiceUnavailable, "document generation unavailable", nil)
	}

	_, orgID, err := resolveWorkspace(ctx, uc.workspaceRepo, workspaceID)
	if err != nil {
		return nil, err
	}

	source, err := uc.docRepo.GetByID(ctx, documentID)
	if err != nil {
		return nil, err
	}
	if source.WorkspaceID != workspaceID || source.OrganizationID != orgID {
		return nil, domainErr.New(domainErr.ErrForbidden, "document does not belong to your organization workspace", nil)
	}

	// Current context/language from workspace; keep source title for continuity.
	return uc.generate.Execute(ctx, workspaceID, dto.GenerateDocumentRequest{
		Title: source.Title,
	})
}
