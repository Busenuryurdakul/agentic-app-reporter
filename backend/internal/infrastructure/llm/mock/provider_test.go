package mock

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/masterfabric-go/masterfabric/internal/domain/llm"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProvider_GenerateSuccess(t *testing.T) {
	p := New(WithModel("test-model"))
	resp, err := p.Generate(context.Background(), llm.GenerateRequest{
		SystemPrompt: "sys",
		UserPrompt:   "user prompt",
		MaxTokens:    128,
	})
	require.NoError(t, err)
	assert.Equal(t, llm.ProviderMock, resp.Provider)
	assert.Equal(t, "test-model", resp.Model)
	assert.Equal(t, "stop", resp.FinishReason)
	assert.Contains(t, resp.Content, "# Studio Document")
	assert.Contains(t, resp.Content, "system_bytes=3")
	assert.Contains(t, resp.Content, "user_bytes=11")
	assert.NotContains(t, resp.Content, "user prompt")
}

func TestProvider_GenerateControlledError(t *testing.T) {
	p := New(WithGenerateError(ErrGenerationFailed))
	_, err := p.Generate(context.Background(), llm.GenerateRequest{})
	require.Error(t, err)
	assert.ErrorIs(t, err, ErrGenerationFailed)
}

func TestProvider_HealthSuccess(t *testing.T) {
	p := New()
	h, err := p.Health(context.Background())
	require.NoError(t, err)
	assert.True(t, h.Healthy)
	assert.Equal(t, llm.ProviderMock, h.Provider)
	assert.Equal(t, "ok", h.Message)
}

func TestProvider_HealthControlledError(t *testing.T) {
	p := New(WithHealthError(ErrHealthFailed))
	_, err := p.Health(context.Background())
	require.Error(t, err)
	assert.ErrorIs(t, err, ErrHealthFailed)
}

func TestProvider_GenerateRespectsContextCancel(t *testing.T) {
	p := New(WithDelay(2 * time.Second))
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := p.Generate(ctx, llm.GenerateRequest{})
	require.Error(t, err)
	assert.True(t, errors.Is(err, context.Canceled))
}

func TestProvider_GenerateRespectsTimeout(t *testing.T) {
	p := New(WithDelay(2 * time.Second))
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()

	start := time.Now()
	_, err := p.Generate(ctx, llm.GenerateRequest{})
	elapsed := time.Since(start)

	require.Error(t, err)
	assert.True(t, errors.Is(err, context.DeadlineExceeded))
	assert.Less(t, elapsed, 500*time.Millisecond)
}

func TestProvider_SetGenerateErrorRuntime(t *testing.T) {
	p := New()
	_, err := p.Generate(context.Background(), llm.GenerateRequest{})
	require.NoError(t, err)

	p.SetGenerateError(ErrGenerationFailed)
	_, err = p.Generate(context.Background(), llm.GenerateRequest{})
	assert.ErrorIs(t, err, ErrGenerationFailed)

	p.SetGenerateError(nil)
	_, err = p.Generate(context.Background(), llm.GenerateRequest{})
	require.NoError(t, err)
}
