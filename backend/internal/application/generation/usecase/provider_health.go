package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/generation/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/llm"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/masterfabric-go/masterfabric/internal/shared/telemetry"
)

// ProviderHealthUseCase probes the configured LLM provider.
type ProviderHealthUseCase struct {
	defaultProvider llm.LLMProvider
	resolver        ProviderResolver
	enabled         bool
}

// NewProviderHealthUseCase creates a ProviderHealthUseCase.
func NewProviderHealthUseCase(provider llm.LLMProvider, enabled bool) *ProviderHealthUseCase {
	return &ProviderHealthUseCase{defaultProvider: provider, enabled: enabled}
}

// NewProviderHealthUseCaseWithResolver creates a health probe that uses the same
// org-aware provider resolution path as document generation when org context exists.
func NewProviderHealthUseCaseWithResolver(
	defaultProvider llm.LLMProvider,
	resolver ProviderResolver,
	enabled bool,
) *ProviderHealthUseCase {
	return &ProviderHealthUseCase{
		defaultProvider: defaultProvider,
		resolver:        resolver,
		enabled:         enabled,
	}
}

// Execute returns provider health. When LLM is disabled, returns healthy=false
// without calling the provider. Provider probe errors are mapped to a structured
// unhealthy response (HTTP 200) except for context cancellation.
func (uc *ProviderHealthUseCase) Execute(ctx context.Context) (*dto.ProviderHealthInfo, error) {
	provider, err := uc.resolveProvider(ctx)
	if err != nil {
		return nil, err
	}
	if provider == nil {
		return nil, domainErr.New(domainErr.ErrInternal, "LLM provider is not configured", nil)
	}

	name := provider.Name()
	if !uc.enabled {
		info := &dto.ProviderHealthInfo{
			Provider: name,
			Healthy:  false,
			Message:  "LLM disabled",
			Enabled:  false,
		}
		telemetry.SetLLMProviderHealth(ctx, name, false)
		return info, nil
	}

	health, err := provider.Health(ctx)
	if err != nil {
		if ctx.Err() != nil {
			return nil, err
		}
		info := &dto.ProviderHealthInfo{
			Provider: name,
			Healthy:  false,
			Message:  "provider health check failed",
			Enabled:  true,
		}
		telemetry.SetLLMProviderHealth(ctx, name, false)
		return info, nil
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
		providerName = name
	}

	info := &dto.ProviderHealthInfo{
		Provider: providerName,
		Healthy:  health.Healthy,
		Message:  msg,
		Enabled:  true,
	}
	telemetry.SetLLMProviderHealth(ctx, providerName, info.Healthy)
	return info, nil
}

func (uc *ProviderHealthUseCase) resolveProvider(ctx context.Context) (llm.LLMProvider, error) {
	if uc.resolver != nil {
		if orgID, ok := resolveHealthOrgID(ctx); ok {
			return uc.resolver.Resolve(ctx, orgID)
		}
	}
	return uc.defaultProvider, nil
}

func resolveHealthOrgID(ctx context.Context) (uuid.UUID, bool) {
	return middleware.ResolveOrganizationID(ctx)
}
