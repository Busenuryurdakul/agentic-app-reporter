package usecase

import (
	"context"
	"testing"
	"time"

	"github.com/masterfabric-go/masterfabric/internal/infrastructure/llm/mock"
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
