package usecase

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/tenant/dto"
	iamModel "github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	iamRepo "github.com/masterfabric-go/masterfabric/internal/domain/iam/repository"
	tenantEvent "github.com/masterfabric-go/masterfabric/internal/domain/tenant/event"
	"github.com/masterfabric-go/masterfabric/internal/domain/tenant/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/events"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
)

// SystemRoleScopeID is the fixed scope used for seeded global role templates.
var SystemRoleScopeID = uuid.Nil

// CreateOrgUseCase handles organization creation.
type CreateOrgUseCase struct {
	orgRepo     repository.OrgRepository
	orgUserRepo iamRepo.OrgUserRepository
	roleRepo    iamRepo.RoleRepository
	eventBus    events.EventBus
}

// NewCreateOrgUseCase creates a new CreateOrgUseCase.
func NewCreateOrgUseCase(
	orgRepo repository.OrgRepository,
	orgUserRepo iamRepo.OrgUserRepository,
	roleRepo iamRepo.RoleRepository,
	eventBus events.EventBus,
) *CreateOrgUseCase {
	return &CreateOrgUseCase{
		orgRepo:     orgRepo,
		orgUserRepo: orgUserRepo,
		roleRepo:    roleRepo,
		eventBus:    eventBus,
	}
}

// Execute creates a new organization and assigns the creator as org_admin.
func (uc *CreateOrgUseCase) Execute(ctx context.Context, req dto.CreateOrgRequest) (*dto.OrgInfo, error) {
	createdBy, ok := middleware.UserIDFromContext(ctx)
	if !ok {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "authentication required", nil)
	}

	existing, _ := uc.orgRepo.GetBySlug(ctx, req.Slug)
	if existing != nil {
		return nil, domainErr.New(domainErr.ErrAlreadyExists, "organization slug already taken", nil)
	}

	org := &model.Organization{
		Name:   req.Name,
		Slug:   req.Slug,
		Status: model.OrgStatusActive,
	}

	if err := uc.orgRepo.Create(ctx, org); err != nil {
		return nil, err
	}

	if err := uc.orgUserRepo.Add(ctx, &iamModel.OrganizationUser{
		OrganizationID: org.ID,
		UserID:         createdBy,
		Status:         iamModel.OrgUserStatusActive,
	}); err != nil {
		return nil, err
	}

	role, err := uc.roleRepo.GetByName(ctx, iamModel.ScopeTypeOrganization, SystemRoleScopeID, "org_admin")
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "org_admin role is not seeded", err)
	}

	if err := uc.roleRepo.AssignRoleToUser(ctx, &iamModel.UserRole{
		ID:             uuid.New(),
		UserID:         createdBy,
		RoleID:         role.ID,
		OrganizationID: org.ID,
	}); err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to assign organization admin role", err)
	}

	_ = uc.eventBus.Publish(ctx, events.TopicTenant, tenantEvent.OrganizationCreated{
		OrganizationID: org.ID,
		Name:           org.Name,
		CreatedBy:      createdBy,
		Timestamp:      time.Now().UTC(),
	})

	return &dto.OrgInfo{
		ID:        org.ID,
		Name:      org.Name,
		Slug:      org.Slug,
		Status:    string(org.Status),
		CreatedAt: org.CreatedAt,
	}, nil
}
