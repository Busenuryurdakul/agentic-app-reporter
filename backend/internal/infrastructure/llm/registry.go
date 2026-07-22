package llm

import (
	"fmt"
	"strings"

	domainllm "github.com/masterfabric-go/masterfabric/internal/domain/llm"
	"github.com/masterfabric-go/masterfabric/internal/infrastructure/llm/gemma"
	"github.com/masterfabric-go/masterfabric/internal/infrastructure/llm/mock"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
)

// SupportedProviders returns registry keys available in this build.
func SupportedProviders() []string {
	return []string{domainllm.ProviderMock, domainllm.ProviderGemma}
}

// NormalizeProviderName lowercases and trims a provider config value.
func NormalizeProviderName(name string) string {
	return strings.ToLower(strings.TrimSpace(name))
}

// IsKnownProvider reports whether name is registered in this build.
func IsKnownProvider(name string) bool {
	switch NormalizeProviderName(name) {
	case domainllm.ProviderMock, domainllm.ProviderGemma:
		return true
	default:
		return false
	}
}

// NewProvider constructs the configured LLMProvider and wraps it with resilience.
// Unknown provider names return an error — there is no silent fallback.
func NewProvider(cfg config.LLMConfig) (domainllm.LLMProvider, error) {
	if !cfg.Enabled {
		// Keep a mock instance so Name()/Health wiring stays available while disabled.
		return NewResilient(mock.New(mock.WithModel(cfg.Model)), cfg.TimeoutSeconds, cfg.MaxRetries), nil
	}

	name := NormalizeProviderName(cfg.Provider)
	if name == "" {
		return nil, fmt.Errorf("LLM_PROVIDER is required when LLM_ENABLED=true")
	}

	inner, err := newInnerProvider(name, cfg)
	if err != nil {
		return nil, err
	}
	return NewResilient(inner, cfg.TimeoutSeconds, cfg.MaxRetries), nil
}

func newInnerProvider(name string, cfg config.LLMConfig) (domainllm.LLMProvider, error) {
	switch name {
	case domainllm.ProviderMock:
		return mock.New(mock.WithModel(cfg.Model)), nil
	case domainllm.ProviderGemma:
		return gemma.New(gemma.Config{
			BaseURL: cfg.BaseURL,
			APIKey:  cfg.APIKey,
			Model:   cfg.Model,
		})
	default:
		return nil, fmt.Errorf(
			"unknown LLM provider %q (supported: %s)",
			cfg.Provider,
			strings.Join(SupportedProviders(), ", "),
		)
	}
}
