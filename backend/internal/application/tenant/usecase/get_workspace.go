package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/tenant/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/tenant/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
)

// GetWorkspaceUseCase handles fetching a single workspace.
type GetWorkspaceUseCase struct {
	workspaceRepo repository.WorkspaceRepository
}

// NewGetWorkspaceUseCase creates a new GetWorkspaceUseCase.
func NewGetWorkspaceUseCase(workspaceRepo repository.WorkspaceRepository) *GetWorkspaceUseCase {
	return &GetWorkspaceUseCase{workspaceRepo: workspaceRepo}
}

// Execute returns a workspace owned by the active organization.
func (uc *GetWorkspaceUseCase) Execute(ctx context.Context, workspaceID uuid.UUID) (*dto.WorkspaceInfo, error) {
	orgID, ok := middleware.ResolveOrganizationID(ctx)
	if !ok {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "organization context required", nil)
	}

	workspace, err := uc.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return nil, err
	}

	if workspace.OrganizationID != orgID {
		return nil, domainErr.New(domainErr.ErrForbidden, "workspace does not belong to your organization", nil)
	}

	return toWorkspaceInfo(workspace), nil
}

func toWorkspaceInfo(workspace *model.Workspace) *dto.WorkspaceInfo {
	return &dto.WorkspaceInfo{
		ID:                        workspace.ID,
		OrganizationID:            workspace.OrganizationID,
		Name:                      workspace.Name,
		Slug:                      workspace.Slug,
		Description:               workspace.Description,
		Status:                    string(workspace.Status),
		PreferredDocumentLanguage: workspace.PreferredDocumentLanguage,
		CreatedAt:                 workspace.CreatedAt,
		UpdatedAt:                 workspace.UpdatedAt,
	}
}
