package usecase

import (
	"context"
	"errors"
	"strings"
	"sync"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/llmsettings/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/llm"
	llmModel "github.com/masterfabric-go/masterfabric/internal/domain/llm/model"
	llmRepo "github.com/masterfabric-go/masterfabric/internal/domain/llm/repository"
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
	infraLLM "github.com/masterfabric-go/masterfabric/internal/infrastructure/llm"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
)

// OrgLLMProviderResolver resolves the LLM provider for an organization before generation.
type OrgLLMProviderResolver struct {
	settingsRepo llmRepo.OrgLLMSettingsRepository
	merger       *EffectiveLLMConfigMerger
	global       config.LLMConfig

	mu    sync.RWMutex
	cache map[uuid.UUID]cachedProvider
}

type cachedProvider struct {
	provider llm.LLMProvider
	settings *llmModel.OrgLLMSettings
}

// NewOrgLLMProviderResolver creates a resolver with in-memory provider cache per organization.
func NewOrgLLMProviderResolver(
	settingsRepo llmRepo.OrgLLMSettingsRepository,
	merger *EffectiveLLMConfigMerger,
	global config.LLMConfig,
) *OrgLLMProviderResolver {
	return &OrgLLMProviderResolver{
		settingsRepo: settingsRepo,
		merger:       merger,
		global:       global,
		cache:        make(map[uuid.UUID]cachedProvider),
	}
}

// Invalidate drops cached providers for an organization after settings change.
func (r *OrgLLMProviderResolver) Invalidate(orgID uuid.UUID) {
	r.mu.Lock()
	delete(r.cache, orgID)
	r.mu.Unlock()
}

// Resolve returns the LLM provider for the given organization.
func (r *OrgLLMProviderResolver) Resolve(ctx context.Context, orgID uuid.UUID) (llm.LLMProvider, error) {
	orgSettings, err := r.settingsRepo.GetByOrganizationID(ctx, orgID)
	if err != nil && !errors.Is(err, domainErr.ErrNotFound) {
		return nil, err
	}
	if errors.Is(err, domainErr.ErrNotFound) {
		orgSettings = nil
	}

	r.mu.RLock()
	if cached, ok := r.cache[orgID]; ok && settingsEqual(cached.settings, orgSettings) {
		p := cached.provider
		r.mu.RUnlock()
		return p, nil
	}
	r.mu.RUnlock()

	effective, _, _ := r.merger.Merge(orgSettings)
	if !effective.Enabled {
		return nil, domainErr.New(domainErr.ErrServiceUnavailable, "LLM is disabled for this organization", nil)
	}
	if err := r.merger.ValidateEffective(effective); err != nil {
		return nil, domainErr.New(domainErr.ErrValidation, err.Error(), err)
	}

	provider, err := infraLLM.NewProvider(effective.ToLLMConfig(r.global))
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to construct llm provider", err)
	}

	r.mu.Lock()
	r.cache[orgID] = cachedProvider{provider: provider, settings: cloneOrgSettings(orgSettings)}
	r.mu.Unlock()

	return provider, nil
}

func settingsEqual(a, b *llmModel.OrgLLMSettings) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return a.OrganizationID == b.OrganizationID &&
		a.Provider == b.Provider &&
		a.BaseURL == b.BaseURL &&
		a.Model == b.Model &&
		a.ProviderAPIKeyEnc == b.ProviderAPIKeyEnc &&
		a.TimeoutSeconds == b.TimeoutSeconds &&
		a.MaxRetries == b.MaxRetries &&
		a.Enabled == b.Enabled &&
		a.UpdatedAt.Equal(b.UpdatedAt)
}

func cloneOrgSettings(s *llmModel.OrgLLMSettings) *llmModel.OrgLLMSettings {
	if s == nil {
		return nil
	}
	c := *s
	return &c
}

// TestOrgLLMConnectionUseCase probes effective or draft LLM settings.
type TestOrgLLMConnectionUseCase struct {
	settingsRepo llmRepo.OrgLLMSettingsRepository
	orgRepo      tenantRepo.OrgRepository
	merger       *EffectiveLLMConfigMerger
	global       config.LLMConfig
}

// NewTestOrgLLMConnectionUseCase creates a TestOrgLLMConnectionUseCase.
func NewTestOrgLLMConnectionUseCase(
	settingsRepo llmRepo.OrgLLMSettingsRepository,
	orgRepo tenantRepo.OrgRepository,
	merger *EffectiveLLMConfigMerger,
	global config.LLMConfig,
) *TestOrgLLMConnectionUseCase {
	return &TestOrgLLMConnectionUseCase{
		settingsRepo: settingsRepo,
		orgRepo:      orgRepo,
		merger:       merger,
		global:       global,
	}
}

// Execute runs a health probe against effective saved settings or an optional draft payload.
func (uc *TestOrgLLMConnectionUseCase) Execute(
	ctx context.Context,
	orgID uuid.UUID,
	req *dto.TestOrgLLMConnectionRequest,
) (*dto.TestOrgLLMConnectionResponse, error) {
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

	var orgSettings *llmModel.OrgLLMSettings
	source := sourceEnvironment
	var effective EffectiveLLMConfig

	saved, err := uc.settingsRepo.GetByOrganizationID(ctx, orgID)
	if err != nil && !errors.Is(err, domainErr.ErrNotFound) {
		return nil, err
	}
	if saved != nil {
		orgSettings = saved
		source = sourceOrganization
	}

	if req != nil && hasDraftProbe(req) {
		effective = buildDraftEffective(uc.global, orgSettings, req, uc.merger)
		source = sourceOrganization
	} else {
		var effSource string
		effective, effSource, _ = uc.merger.Merge(orgSettings)
		if effSource == sourceOrganization {
			source = sourceOrganization
		}
	}

	if !effective.Enabled {
		return &dto.TestOrgLLMConnectionResponse{
			Provider: effective.Provider,
			Healthy:  false,
			Message:  "LLM disabled",
			Enabled:  false,
			Source:   source,
		}, nil
	}

	if err := uc.merger.ValidateEffective(effective); err != nil {
		return nil, domainErr.New(domainErr.ErrValidation, err.Error(), err)
	}

	provider, err := infraLLM.NewProvider(effective.ToLLMConfig(uc.global))
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to construct llm provider", err)
	}

	health, err := provider.Health(ctx)
	if err != nil {
		if ctx.Err() != nil {
			return nil, err
		}
		return &dto.TestOrgLLMConnectionResponse{
			Provider: provider.Name(),
			Healthy:  false,
			Message:  "provider health check failed",
			Enabled:  true,
			Source:   source,
		}, nil
	}

	msg := health.Message
	if msg == "" {
		if health.Healthy {
			msg = "ok"
		} else {
			msg = "unhealthy"
		}
	}
	providerName := health.Provider
	if providerName == "" {
		providerName = provider.Name()
	}

	return &dto.TestOrgLLMConnectionResponse{
		Provider: providerName,
		Healthy:  health.Healthy,
		Message:  msg,
		Enabled:  true,
		Source:   source,
	}, nil
}

func hasDraftProbe(req *dto.TestOrgLLMConnectionRequest) bool {
	if req == nil {
		return false
	}
	return strings.TrimSpace(req.Provider) != "" ||
		strings.TrimSpace(req.BaseURL) != "" ||
		strings.TrimSpace(req.Model) != "" ||
		strings.TrimSpace(req.ProviderAPIKey) != ""
}

func buildDraftEffective(
	global config.LLMConfig,
	saved *llmModel.OrgLLMSettings,
	req *dto.TestOrgLLMConnectionRequest,
	merger *EffectiveLLMConfigMerger,
) EffectiveLLMConfig {
	effective, _, _ := merger.Merge(saved)
	if p := strings.TrimSpace(req.Provider); p != "" {
		effective.Provider = p
	}
	if v := strings.TrimSpace(req.BaseURL); v != "" {
		effective.BaseURL = v
	}
	if v := strings.TrimSpace(req.Model); v != "" {
		effective.Model = v
	}
	if k := strings.TrimSpace(req.ProviderAPIKey); k != "" {
		effective.ProviderAPIKey = k
	}
	if effective.TimeoutSeconds <= 0 {
		effective.TimeoutSeconds = global.TimeoutSeconds
	}
	if effective.MaxRetries <= 0 && global.MaxRetries > 0 {
		effective.MaxRetries = global.MaxRetries
	}
	return effective
}
