package usecase

import (
	"context"

	"github.com/masterfabric-go/masterfabric/internal/application/generation/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/llm"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// ProviderHealthUseCase probes the configured LLM provider.
type ProviderHealthUseCase struct {
	provider llm.LLMProvider
	enabled  bool
}

// NewProviderHealthUseCase creates a ProviderHealthUseCase.
func NewProviderHealthUseCase(provider llm.LLMProvider, enabled bool) *ProviderHealthUseCase {
	return &ProviderHealthUseCase{provider: provider, enabled: enabled}
}

// Execute returns provider health. When LLM is disabled, returns healthy=false
// without calling the provider. Provider probe errors are mapped to a structured
// unhealthy response (HTTP 200) except for context cancellation.
func (uc *ProviderHealthUseCase) Execute(ctx context.Context) (*dto.ProviderHealthInfo, error) {
	if uc.provider == nil {
		return nil, domainErr.New(domainErr.ErrInternal, "LLM provider is not configured", nil)
	}

	name := uc.provider.Name()
	if !uc.enabled {
		return &dto.ProviderHealthInfo{
			Provider: name,
			Healthy:  false,
			Message:  "LLM disabled",
			Enabled:  false,
		}, nil
	}

	health, err := uc.provider.Health(ctx)
	if err != nil {
		if ctx.Err() != nil {
			return nil, err
		}
		return &dto.ProviderHealthInfo{
			Provider: name,
			Healthy:  false,
			Message:  "provider health check failed",
			Enabled:  true,
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
		providerName = name
	}

	return &dto.ProviderHealthInfo{
		Provider: providerName,
		Healthy:  health.Healthy,
		Message:  msg,
		Enabled:  true,
	}, nil
}
