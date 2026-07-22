package usecase

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/projectprofile/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/projectprofile/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/projectprofile/repository"
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
)

// GetProfileUseCase handles fetching a workspace's project profile.
type GetProfileUseCase struct {
	profileRepo   repository.ProfileRepository
	workspaceRepo tenantRepo.WorkspaceRepository
}

// NewGetProfileUseCase creates a new GetProfileUseCase.
func NewGetProfileUseCase(profileRepo repository.ProfileRepository, workspaceRepo tenantRepo.WorkspaceRepository) *GetProfileUseCase {
	return &GetProfileUseCase{profileRepo: profileRepo, workspaceRepo: workspaceRepo}
}

// Execute returns the project profile for a workspace. If no profile has
// been saved yet, a default (unsaved) empty profile is returned instead of
// an error so clients can render a blank form.
func (uc *GetProfileUseCase) Execute(ctx context.Context, workspaceID uuid.UUID) (*dto.ProfileInfo, error) {
	profile, err := resolveWorkspaceProfile(ctx, uc.workspaceRepo, uc.profileRepo, workspaceID)
	if err != nil {
		return nil, err
	}
	return toProfileInfo(profile), nil
}

// resolveWorkspaceProfile verifies the workspace belongs to the active
// organization and returns its profile, falling back to a default empty
// profile when none has been persisted yet.
func resolveWorkspaceProfile(
	ctx context.Context,
	workspaceRepo tenantRepo.WorkspaceRepository,
	profileRepo repository.ProfileRepository,
	workspaceID uuid.UUID,
) (*model.Profile, error) {
	orgID, ok := middleware.ResolveOrganizationID(ctx)
	if !ok {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "organization context required", nil)
	}

	workspace, err := workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	if workspace.OrganizationID != orgID {
		return nil, domainErr.New(domainErr.ErrForbidden, "workspace does not belong to your organization", nil)
	}

	profile, err := profileRepo.GetByWorkspaceID(ctx, workspaceID)
	if err != nil {
		if errors.Is(err, domainErr.ErrNotFound) {
			return model.NewEmpty(orgID, workspaceID), nil
		}
		return nil, err
	}
	return profile, nil
}

func toProfileInfo(p *model.Profile) *dto.ProfileInfo {
	return &dto.ProfileInfo{
		ID:                        p.ID,
		OrganizationID:            p.OrganizationID,
		WorkspaceID:               p.WorkspaceID,
		ProjectName:               p.ProjectName,
		ProjectDescription:        p.ProjectDescription,
		ProductType:               p.ProductType,
		TargetUsers:               p.TargetUsers,
		MainProblem:               p.MainProblem,
		MainUseCases:              p.MainUseCases,
		ProjectStatus:             p.ProjectStatus,
		PreferredDocumentLanguage: p.PreferredDocumentLanguage,
		Frontend:                  p.Frontend,
		Backend:                   p.Backend,
		Data:                      p.Data,
		Infrastructure:            p.Infrastructure,
		AI:                        p.AI,
		DevelopmentStandards:      p.DevelopmentStandards,
		CreatedAt:                 p.CreatedAt,
		UpdatedAt:                 p.UpdatedAt,
	}
}
