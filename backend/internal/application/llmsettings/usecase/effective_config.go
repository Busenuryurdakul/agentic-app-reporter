package usecase

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/llmsettings/dto"
	llmModel "github.com/masterfabric-go/masterfabric/internal/domain/llm/model"
	llmRepo "github.com/masterfabric-go/masterfabric/internal/domain/llm/repository"
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
)

const (
	sourceEnvironment  = "environment"
	sourceOrganization = "organization"
)

// EffectiveLLMConfig is the resolved LLM configuration used for generation.
type EffectiveLLMConfig struct {
	Provider       string
	BaseURL        string
	Model          string
	ProviderAPIKey string
	TimeoutSeconds int
	MaxRetries     int
	Enabled        bool
}

// EffectiveLLMConfigMerger merges organization overrides with platform env defaults.
type EffectiveLLMConfigMerger struct {
	global     config.LLMConfig
	production bool
	decryptKey func(string) (string, error)
}

// NewEffectiveLLMConfigMerger creates a merger using global env config.
func NewEffectiveLLMConfigMerger(
	global config.LLMConfig,
	production bool,
	decryptKey func(string) (string, error),
) *EffectiveLLMConfigMerger {
	if decryptKey == nil {
		decryptKey = func(s string) (string, error) { return s, nil }
	}
	return &EffectiveLLMConfigMerger{
		global:     global,
		production: production,
		decryptKey: decryptKey,
	}
}

// Merge returns effective config, source label, and whether an org-specific provider key is set.
func (m *EffectiveLLMConfigMerger) Merge(orgSettings *llmModel.OrgLLMSettings) (EffectiveLLMConfig, string, bool) {
	cfg := EffectiveLLMConfig{
		Provider:       m.global.Provider,
		BaseURL:        m.global.BaseURL,
		Model:          m.global.Model,
		ProviderAPIKey: m.global.APIKey,
		TimeoutSeconds: m.global.TimeoutSeconds,
		MaxRetries:     m.global.MaxRetries,
		Enabled:        m.global.Enabled,
	}
	source := sourceEnvironment
	hasOrgKey := false

	if orgSettings == nil {
		return cfg, source, hasOrgKey
	}

	source = sourceOrganization
	if p := strings.TrimSpace(orgSettings.Provider); p != "" {
		cfg.Provider = p
	}
	if v := strings.TrimSpace(orgSettings.BaseURL); v != "" {
		cfg.BaseURL = v
	}
	if v := strings.TrimSpace(orgSettings.Model); v != "" {
		cfg.Model = v
	}
	if orgSettings.TimeoutSeconds > 0 {
		cfg.TimeoutSeconds = orgSettings.TimeoutSeconds
	}
	if orgSettings.MaxRetries > 0 || orgSettings.TimeoutSeconds > 0 {
		cfg.MaxRetries = orgSettings.MaxRetries
	}
	cfg.Enabled = orgSettings.Enabled

	if enc := strings.TrimSpace(orgSettings.ProviderAPIKeyEnc); enc != "" {
		if plain, err := m.decryptKey(enc); err == nil && plain != "" {
			cfg.ProviderAPIKey = plain
			hasOrgKey = true
		}
	}

	return cfg, source, hasOrgKey
}

// ToLLMConfig converts effective settings to config.LLMConfig for provider construction.
func (c EffectiveLLMConfig) ToLLMConfig(global config.LLMConfig) config.LLMConfig {
	return config.LLMConfig{
		Enabled:               c.Enabled,
		Provider:              c.Provider,
		BaseURL:               c.BaseURL,
		APIKey:                c.ProviderAPIKey,
		Model:                 c.Model,
		TimeoutSeconds:        c.TimeoutSeconds,
		MaxRetries:            c.MaxRetries,
		AllowMockInProduction: global.AllowMockInProduction,
	}
}

// ValidateEffective checks merged config for the current environment.
func (m *EffectiveLLMConfigMerger) ValidateEffective(cfg EffectiveLLMConfig) error {
	return config.ValidateLLMConfig(cfg.ToLLMConfig(m.global), m.production)
}

// UpdateOrgLLMSettingsUseCase persists organization LLM overrides (org_admin via llm:write).
type UpdateOrgLLMSettingsUseCase struct {
	settingsRepo llmRepo.OrgLLMSettingsRepository
	orgRepo      tenantRepo.OrgRepository
	merger       *EffectiveLLMConfigMerger
	encryptKey   func(string) (string, error)
	invalidate   func(orgID uuid.UUID)
}

// NewUpdateOrgLLMSettingsUseCase creates an UpdateOrgLLMSettingsUseCase.
func NewUpdateOrgLLMSettingsUseCase(
	settingsRepo llmRepo.OrgLLMSettingsRepository,
	orgRepo tenantRepo.OrgRepository,
	merger *EffectiveLLMConfigMerger,
	encryptKey func(string) (string, error),
	invalidate func(orgID uuid.UUID),
) *UpdateOrgLLMSettingsUseCase {
	return &UpdateOrgLLMSettingsUseCase{
		settingsRepo: settingsRepo,
		orgRepo:      orgRepo,
		merger:       merger,
		encryptKey:   encryptKey,
		invalidate:   invalidate,
	}
}

// Execute upserts or clears organization LLM settings.
func (uc *UpdateOrgLLMSettingsUseCase) Execute(
	ctx context.Context,
	orgID uuid.UUID,
	req dto.UpdateOrgLLMSettingsRequest,
) (*dto.OrgLLMSettingsResponse, error) {
	ctxOrgID, ok := middleware.ResolveOrganizationID(ctx)
	if !ok {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "organization context required", nil)
	}
	if ctxOrgID != orgID {
		return nil, domainErr.New(domainErr.ErrForbidden, "organization mismatch", nil)
	}
	if _, err := uc.orgRepo.GetByID(ctx, orgID); err != nil {
		return nil, err
	}

	if req.ResetToEnvDefaults {
		if err := uc.settingsRepo.Delete(ctx, orgID); err != nil {
			return nil, err
		}
		if uc.invalidate != nil {
			uc.invalidate(orgID)
		}
		effective, source, hasOrgKey := uc.merger.Merge(nil)
		return toSettingsResponse(orgID, nil, effective, source, hasOrgKey), nil
	}

	existing, err := uc.settingsRepo.GetByOrganizationID(ctx, orgID)
	if err != nil && !errors.Is(err, domainErr.ErrNotFound) {
		return nil, err
	}
	if errors.Is(err, domainErr.ErrNotFound) {
		existing = nil
	}

	settings := &llmModel.OrgLLMSettings{
		OrganizationID: orgID,
		Provider:       strings.TrimSpace(req.Provider),
		BaseURL:        strings.TrimSpace(req.BaseURL),
		Model:          strings.TrimSpace(req.Model),
		Enabled:        true,
	}
	if req.Enabled != nil {
		settings.Enabled = *req.Enabled
	}
	if req.TimeoutSeconds != nil {
		settings.TimeoutSeconds = *req.TimeoutSeconds
	} else if existing != nil {
		settings.TimeoutSeconds = existing.TimeoutSeconds
	} else {
		settings.TimeoutSeconds = uc.merger.global.TimeoutSeconds
	}
	if req.MaxRetries != nil {
		settings.MaxRetries = *req.MaxRetries
	} else if existing != nil {
		settings.MaxRetries = existing.MaxRetries
	} else {
		settings.MaxRetries = uc.merger.global.MaxRetries
	}

	updateProviderAPIKey := false
	switch {
	case req.ClearProviderAPIKey:
		settings.ProviderAPIKeyEnc = ""
		updateProviderAPIKey = true
	case strings.TrimSpace(req.ProviderAPIKey) != "":
		enc, encErr := uc.encryptKey(strings.TrimSpace(req.ProviderAPIKey))
		if encErr != nil {
			return nil, domainErr.New(domainErr.ErrInternal, "failed to encrypt provider api key", encErr)
		}
		settings.ProviderAPIKeyEnc = enc
		updateProviderAPIKey = true
	case existing != nil:
		settings.ProviderAPIKeyEnc = existing.ProviderAPIKeyEnc
	}

	if uid, ok := middleware.UserIDFromContext(ctx); ok {
		settings.UpdatedBy = &uid
	}

	effective, _, _ := uc.merger.Merge(settings)
	if err := uc.merger.ValidateEffective(effective); err != nil {
		return nil, domainErr.New(domainErr.ErrValidation, err.Error(), err)
	}

	if err := uc.settingsRepo.Upsert(ctx, settings, updateProviderAPIKey); err != nil {
		return nil, err
	}
	if uc.invalidate != nil {
		uc.invalidate(orgID)
	}

	saved, err := uc.settingsRepo.GetByOrganizationID(ctx, orgID)
	if err != nil {
		return nil, err
	}
	effective, source, hasOrgKey := uc.merger.Merge(saved)
	return toSettingsResponse(orgID, saved, effective, source, hasOrgKey), nil
}
