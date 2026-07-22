package usecase

import (
	"context"
	"time"

	"github.com/google/uuid"
	tenantEvent "github.com/masterfabric-go/masterfabric/internal/domain/tenant/event"
	"github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/events"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
)

// DeleteWorkspaceUseCase handles soft-deleting (archiving) a workspace.
type DeleteWorkspaceUseCase struct {
	workspaceRepo repository.WorkspaceRepository
	eventBus      events.EventBus
}

// NewDeleteWorkspaceUseCase creates a new DeleteWorkspaceUseCase.
func NewDeleteWorkspaceUseCase(
	workspaceRepo repository.WorkspaceRepository,
	eventBus events.EventBus,
) *DeleteWorkspaceUseCase {
	return &DeleteWorkspaceUseCase{
		workspaceRepo: workspaceRepo,
		eventBus:      eventBus,
	}
}

// Execute archives a workspace owned by the active organization.
func (uc *DeleteWorkspaceUseCase) Execute(ctx context.Context, workspaceID uuid.UUID) error {
	orgID, ok := middleware.ResolveOrganizationID(ctx)
	if !ok {
		return domainErr.New(domainErr.ErrUnauthorized, "organization context required", nil)
	}

	workspace, err := uc.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return err
	}

	if workspace.OrganizationID != orgID {
		return domainErr.New(domainErr.ErrForbidden, "workspace does not belong to your organization", nil)
	}

	if err := uc.workspaceRepo.Delete(ctx, workspaceID); err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to delete workspace", err)
	}

	deletedBy, _ := middleware.UserIDFromContext(ctx)
	_ = uc.eventBus.Publish(ctx, events.TopicTenant, tenantEvent.WorkspaceDeleted{
		WorkspaceID:    workspaceID,
		OrganizationID: orgID,
		DeletedBy:      deletedBy,
		Timestamp:      time.Now().UTC(),
	})

	return nil
}
