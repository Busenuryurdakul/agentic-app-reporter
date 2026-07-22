package llm

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	domainllm "github.com/masterfabric-go/masterfabric/internal/domain/llm"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type stubProvider struct {
	name      string
	calls     atomic.Int32
	failTimes int
	failErr   error
	health    domainllm.ProviderHealth
}

func (s *stubProvider) Name() string { return s.name }

func (s *stubProvider) Generate(ctx context.Context, req domainllm.GenerateRequest) (domainllm.GenerateResponse, error) {
	n := int(s.calls.Add(1))
	if n <= s.failTimes {
		return domainllm.GenerateResponse{}, s.failErr
	}
	return domainllm.GenerateResponse{Content: "ok", Provider: s.name, Model: "m"}, nil
}

func (s *stubProvider) Health(ctx context.Context) (domainllm.ProviderHealth, error) {
	return s.health, nil
}

func TestResilientProvider_RetriesTransientThenSucceeds(t *testing.T) {
	inner := &stubProvider{
		name:      "stub",
		failTimes: 2,
		failErr:   domainErr.New(domainErr.ErrRateLimited, "slow", nil),
		health:    domainllm.ProviderHealth{Provider: "stub", Healthy: true, Message: "ok"},
	}
	p := NewResilient(inner, 5, 3)
	p.sleep = func(ctx context.Context, d time.Duration) error { return nil }

	resp, err := p.Generate(context.Background(), domainllm.GenerateRequest{UserPrompt: "x"})
	require.NoError(t, err)
	assert.Equal(t, "ok", resp.Content)
	assert.Equal(t, int32(3), inner.calls.Load())
}

func TestResilientProvider_DoesNotRetryBadRequest(t *testing.T) {
	inner := &stubProvider{
		name:      "stub",
		failTimes: 5,
		failErr:   domainErr.New(domainErr.ErrBadRequest, "bad", nil),
	}
	p := NewResilient(inner, 5, 3)
	p.sleep = func(ctx context.Context, d time.Duration) error { return nil }

	_, err := p.Generate(context.Background(), domainllm.GenerateRequest{UserPrompt: "x"})
	require.Error(t, err)
	assert.ErrorIs(t, err, domainErr.ErrBadRequest)
	assert.Equal(t, int32(1), inner.calls.Load())
}

func TestResilientProvider_RespectsParentCancel(t *testing.T) {
	inner := &stubProvider{
		name:      "stub",
		failTimes: 5,
		failErr:   domainErr.New(domainErr.ErrRateLimited, "slow", nil),
	}
	p := NewResilient(inner, 5, 5)
	p.sleep = func(ctx context.Context, d time.Duration) error { return ctx.Err() }

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err := p.Generate(ctx, domainllm.GenerateRequest{UserPrompt: "x"})
	require.Error(t, err)
	assert.True(t, errors.Is(err, context.Canceled))
}

func TestIsTransientLLMError(t *testing.T) {
	assert.True(t, isTransientLLMError(domainErr.New(domainErr.ErrRateLimited, "x", nil)))
	assert.True(t, isTransientLLMError(context.DeadlineExceeded))
	assert.False(t, isTransientLLMError(context.Canceled))
	assert.False(t, isTransientLLMError(domainErr.New(domainErr.ErrBadRequest, "x", nil)))
	assert.True(t, isTransientLLMError(domainErr.New(domainErr.ErrInternal, "gemma provider unavailable (HTTP 502)", nil)))
}
