package usecase

import (
	"context"

	"github.com/google/uuid"
	tenantModel "github.com/masterfabric-go/masterfabric/internal/domain/tenant/model"
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
)

func resolveWorkspace(ctx context.Context, workspaceRepo tenantRepo.WorkspaceRepository, workspaceID uuid.UUID) (*tenantModel.Workspace, uuid.UUID, error) {
	orgID, ok := middleware.ResolveOrganizationID(ctx)
	if !ok {
		return nil, uuid.Nil, domainErr.New(domainErr.ErrUnauthorized, "organization context required", nil)
	}

	workspace, err := workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return nil, uuid.Nil, err
	}
	if workspace.OrganizationID != orgID {
		return nil, uuid.Nil, domainErr.New(domainErr.ErrForbidden, "workspace does not belong to your organization", nil)
	}
	return workspace, orgID, nil
}
