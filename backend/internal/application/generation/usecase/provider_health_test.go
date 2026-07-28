package usecase

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/llm"
	"github.com/masterfabric-go/masterfabric/internal/infrastructure/llm/mock"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProviderHealth_EnabledHealthy(t *testing.T) {
	uc := NewProviderHealthUseCase(mock.New(), true)
	info, err := uc.Execute(context.Background())
	require.NoError(t, err)
	assert.True(t, info.Enabled)
	assert.True(t, info.Healthy)
	assert.Equal(t, "mock", info.Provider)
	assert.Equal(t, "ok", info.Message)
}

func TestProviderHealth_Disabled(t *testing.T) {
	uc := NewProviderHealthUseCase(mock.New(), false)
	info, err := uc.Execute(context.Background())
	require.NoError(t, err)
	assert.False(t, info.Enabled)
	assert.False(t, info.Healthy)
	assert.Equal(t, "LLM disabled", info.Message)
}

func TestProviderHealth_ProviderErrorMappedUnhealthy(t *testing.T) {
	uc := NewProviderHealthUseCase(mock.New(mock.WithHealthError(mock.ErrHealthFailed)), true)
	info, err := uc.Execute(context.Background())
	require.NoError(t, err)
	assert.True(t, info.Enabled)
	assert.False(t, info.Healthy)
	assert.Equal(t, "provider health check failed", info.Message)
}

func TestProviderHealth_ContextCanceled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	uc := NewProviderHealthUseCase(mock.New(mock.WithDelay(2*time.Second)), true)
	_, err := uc.Execute(ctx)
	require.Error(t, err)
}

func TestProviderHealth_UsesOrgResolverWhenOrgContextPresent(t *testing.T) {
	orgID := uuid.New()
	defaultProvider := mock.New(mock.WithHealthError(mock.ErrHealthFailed))
	orgProvider := mock.New()
	uc := NewProviderHealthUseCaseWithResolver(defaultProvider, &stubProviderResolver{
		provider: orgProvider,
		orgID:    orgID,
	}, true)

	ctx := context.WithValue(context.Background(), middleware.ContextKeyTenantID, orgID)
	info, err := uc.Execute(ctx)
	require.NoError(t, err)
	assert.True(t, info.Healthy)
	assert.Equal(t, "mock", info.Provider)
}

type stubProviderResolver struct {
	provider llm.LLMProvider
	orgID    uuid.UUID
}

func (s *stubProviderResolver) Resolve(ctx context.Context, orgID uuid.UUID) (llm.LLMProvider, error) {
	if orgID != s.orgID {
		return nil, domainErr.New(domainErr.ErrForbidden, "org mismatch", nil)
	}
	return s.provider, nil
}
