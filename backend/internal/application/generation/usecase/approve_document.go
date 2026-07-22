package usecase

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/generation/dto"
	docModel "github.com/masterfabric-go/masterfabric/internal/domain/document/model"
	docRepo "github.com/masterfabric-go/masterfabric/internal/domain/document/repository"
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
)

// ApproveDocumentUseCase marks a succeeded document as approved.
type ApproveDocumentUseCase struct {
	docRepo       docRepo.DocumentRepository
	workspaceRepo tenantRepo.WorkspaceRepository
}

// NewApproveDocumentUseCase creates an ApproveDocumentUseCase.
func NewApproveDocumentUseCase(docRepo docRepo.DocumentRepository, workspaceRepo tenantRepo.WorkspaceRepository) *ApproveDocumentUseCase {
	return &ApproveDocumentUseCase{docRepo: docRepo, workspaceRepo: workspaceRepo}
}

// Execute approves a document in the caller's organization workspace.
// Only succeeded documents may be approved. Already-approved documents are returned as-is.
func (uc *ApproveDocumentUseCase) Execute(ctx context.Context, workspaceID, documentID uuid.UUID) (*dto.DocumentInfo, error) {
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
	if doc.Status != docModel.StatusSucceeded {
		return nil, domainErr.New(domainErr.ErrBadRequest, "only succeeded documents can be approved", nil)
	}
	if doc.ApprovalStatus == docModel.ApprovalApproved {
		return toDocumentInfo(doc), nil
	}

	now := time.Now().UTC()
	doc.ApprovalStatus = docModel.ApprovalApproved
	doc.ApprovedAt = &now
	if uid, ok := middleware.UserIDFromContext(ctx); ok {
		doc.ApprovedBy = &uid
	} else {
		doc.ApprovedBy = nil
	}

	if err := uc.docRepo.UpdateApproval(ctx, doc); err != nil {
		return nil, err
	}
	return toDocumentInfo(doc), nil
}
