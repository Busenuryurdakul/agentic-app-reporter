package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/generation/dto"
	docRepo "github.com/masterfabric-go/masterfabric/internal/domain/document/repository"
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// GetDocumentUseCase returns a single generated document.
type GetDocumentUseCase struct {
	docRepo       docRepo.DocumentRepository
	workspaceRepo tenantRepo.WorkspaceRepository
}

// NewGetDocumentUseCase creates a GetDocumentUseCase.
func NewGetDocumentUseCase(docRepo docRepo.DocumentRepository, workspaceRepo tenantRepo.WorkspaceRepository) *GetDocumentUseCase {
	return &GetDocumentUseCase{docRepo: docRepo, workspaceRepo: workspaceRepo}
}

// Execute loads the document and ensures it belongs to the active org workspace.
func (uc *GetDocumentUseCase) Execute(ctx context.Context, workspaceID, documentID uuid.UUID) (*dto.DocumentInfo, error) {
	_, orgID, err := resolveWorkspace(ctx, uc.workspaceRepo, workspaceID)
	if err != nil {
		return nil, err
	}

	doc, err := uc.docRepo.GetByID(ctx, documentID)
	if err != nil {
		return nil, err
	}
	if doc.WorkspaceID != workspaceID || doc.OrganizationID != orgID {
		return nil, domainErr.New(domainErr.ErrForbidden, "document does not belong to your organization workspace", nil)
	}
	return toDocumentInfo(doc), nil
}
