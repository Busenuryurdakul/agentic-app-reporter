package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/projectprofile/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/projectprofile/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/projectprofile/repository"
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
)

// UpsertProfileUseCase handles creating or updating a workspace's project profile.
type UpsertProfileUseCase struct {
	profileRepo   repository.ProfileRepository
	workspaceRepo tenantRepo.WorkspaceRepository
}

// NewUpsertProfileUseCase creates a new UpsertProfileUseCase.
func NewUpsertProfileUseCase(profileRepo repository.ProfileRepository, workspaceRepo tenantRepo.WorkspaceRepository) *UpsertProfileUseCase {
	return &UpsertProfileUseCase{profileRepo: profileRepo, workspaceRepo: workspaceRepo}
}

// Execute creates the project profile for a workspace if it does not exist
// yet, or applies a partial update to the existing one.
func (uc *UpsertProfileUseCase) Execute(ctx context.Context, workspaceID uuid.UUID, req dto.UpsertProfileRequest) (*dto.ProfileInfo, error) {
	orgID, ok := middleware.ResolveOrganizationID(ctx)
	if !ok {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "organization context required", nil)
	}

	if req.PreferredDocumentLanguage != "" && !model.IsValidDocumentLanguage(req.PreferredDocumentLanguage) {
		return nil, domainErr.New(domainErr.ErrValidation, "preferred_document_language must be 'tr' or 'en'", nil)
	}

	workspace, err := uc.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	if workspace.OrganizationID != orgID {
		return nil, domainErr.New(domainErr.ErrForbidden, "workspace does not belong to your organization", nil)
	}

	profile, err := uc.profileRepo.GetByWorkspaceID(ctx, workspaceID)
	if err != nil {
		if !errors.Is(err, domainErr.ErrNotFound) {
			return nil, err
		}
		profile = model.NewEmpty(orgID, workspaceID)
		profile.ID = uuid.New()
	}

	applyUpsertRequest(profile, req)

	if err := uc.profileRepo.Upsert(ctx, profile); err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to save project profile", err)
	}

	return toProfileInfo(profile), nil
}

func applyUpsertRequest(profile *model.Profile, req dto.UpsertProfileRequest) {
	if v := strings.TrimSpace(req.ProjectName); v != "" {
		profile.ProjectName = v
	}
	if v := strings.TrimSpace(req.ProjectDescription); v != "" {
		profile.ProjectDescription = v
	}
	if v := strings.TrimSpace(req.ProductType); v != "" {
		profile.ProductType = v
	}
	if v := strings.TrimSpace(req.TargetUsers); v != "" {
		profile.TargetUsers = v
	}
	if v := strings.TrimSpace(req.MainProblem); v != "" {
		profile.MainProblem = v
	}
	if v := strings.TrimSpace(req.MainUseCases); v != "" {
		profile.MainUseCases = v
	}
	if v := strings.TrimSpace(req.ProjectStatus); v != "" {
		profile.ProjectStatus = v
	}
	if v := strings.TrimSpace(req.PreferredDocumentLanguage); v != "" {
		profile.PreferredDocumentLanguage = v
	}
	if isNonEmptyJSONSection(req.Frontend) {
		profile.Frontend = req.Frontend
	}
	if isNonEmptyJSONSection(req.Backend) {
		profile.Backend = req.Backend
	}
	if isNonEmptyJSONSection(req.Data) {
		profile.Data = req.Data
	}
	if isNonEmptyJSONSection(req.Infrastructure) {
		profile.Infrastructure = req.Infrastructure
	}
	if isNonEmptyJSONSection(req.AI) {
		profile.AI = req.AI
	}
	if isNonEmptyJSONSection(req.DevelopmentStandards) {
		profile.DevelopmentStandards = req.DevelopmentStandards
	}
}

// isNonEmptyJSONSection reports whether raw carries a meaningful JSON payload
// (i.e. it was actually supplied in the request body), as opposed to being
// absent or an explicit null/empty object.
func isNonEmptyJSONSection(raw json.RawMessage) bool {
	if len(raw) == 0 {
		return false
	}
	trimmed := strings.TrimSpace(string(raw))
	return trimmed != "" && trimmed != "null"
}
