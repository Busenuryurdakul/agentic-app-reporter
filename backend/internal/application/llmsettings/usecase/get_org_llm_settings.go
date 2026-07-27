package usecase

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/llmsettings/dto"
	llmModel "github.com/masterfabric-go/masterfabric/internal/domain/llm/model"
	llmRepo "github.com/masterfabric-go/masterfabric/internal/domain/llm/repository"
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
)

// GetOrgLLMSettingsUseCase returns effective LLM settings for an organization.
type GetOrgLLMSettingsUseCase struct {
	settingsRepo llmRepo.OrgLLMSettingsRepository
	orgRepo      tenantRepo.OrgRepository
	merger       *EffectiveLLMConfigMerger
}

// NewGetOrgLLMSettingsUseCase creates a GetOrgLLMSettingsUseCase.
func NewGetOrgLLMSettingsUseCase(
	settingsRepo llmRepo.OrgLLMSettingsRepository,
	orgRepo tenantRepo.OrgRepository,
	merger *EffectiveLLMConfigMerger,
) *GetOrgLLMSettingsUseCase {
	return &GetOrgLLMSettingsUseCase{settingsRepo: settingsRepo, orgRepo: orgRepo, merger: merger}
}

// Execute returns merged effective settings for the organization.
func (uc *GetOrgLLMSettingsUseCase) Execute(ctx context.Context, orgID uuid.UUID) (*dto.OrgLLMSettingsResponse, error) {
	if err := uc.ensureOrgAccess(ctx, orgID); err != nil {
		return nil, err
	}

	orgSettings, err := uc.settingsRepo.GetByOrganizationID(ctx, orgID)
	if err != nil && !errors.Is(err, domainErr.ErrNotFound) {
		return nil, err
	}

	effective, source, hasOrgKey := uc.merger.Merge(orgSettings)
	return toSettingsResponse(orgID, orgSettings, effective, source, hasOrgKey), nil
}

func (uc *GetOrgLLMSettingsUseCase) ensureOrgAccess(ctx context.Context, orgID uuid.UUID) error {
	ctxOrgID, ok := middleware.ResolveOrganizationID(ctx)
	if !ok {
		return domainErr.New(domainErr.ErrUnauthorized, "organization context required", nil)
	}
	if ctxOrgID != orgID {
		return domainErr.New(domainErr.ErrForbidden, "organization mismatch", nil)
	}
	if _, err := uc.orgRepo.GetByID(ctx, orgID); err != nil {
		return err
	}
	return nil
}

func toSettingsResponse(
	orgID uuid.UUID,
	orgSettings *llmModel.OrgLLMSettings,
	effective EffectiveLLMConfig,
	source string,
	hasOrgKey bool,
) *dto.OrgLLMSettingsResponse {
	resp := &dto.OrgLLMSettingsResponse{
		OrganizationID:    orgID,
		Configured:        orgSettings != nil,
		Source:            source,
		Provider:          effective.Provider,
		BaseURL:           effective.BaseURL,
		Model:             effective.Model,
		TimeoutSeconds:    effective.TimeoutSeconds,
		MaxRetries:        effective.MaxRetries,
		Enabled:           effective.Enabled,
		HasProviderAPIKey: hasOrgKey,
	}
	if orgSettings != nil {
		t := orgSettings.UpdatedAt
		resp.UpdatedAt = &t
	}
	return resp
}
