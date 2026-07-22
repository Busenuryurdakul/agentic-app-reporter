package llm

import (
	"context"
	"errors"
	"net"
	"strings"
	"time"

	domainllm "github.com/masterfabric-go/masterfabric/internal/domain/llm"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// ResilientProvider wraps an LLMProvider with per-attempt timeout and transient retries.
type ResilientProvider struct {
	inner      domainllm.LLMProvider
	timeout    time.Duration
	maxRetries int
	sleep      func(ctx context.Context, d time.Duration) error
}

// NewResilient wraps inner with timeout/retry behaviour from config-like parameters.
func NewResilient(inner domainllm.LLMProvider, timeoutSeconds, maxRetries int) *ResilientProvider {
	timeout := time.Duration(timeoutSeconds) * time.Second
	if timeout <= 0 {
		timeout = 60 * time.Second
	}
	if maxRetries < 0 {
		maxRetries = 0
	}
	return &ResilientProvider{
		inner:      inner,
		timeout:    timeout,
		maxRetries: maxRetries,
		sleep: func(ctx context.Context, d time.Duration) error {
			timer := time.NewTimer(d)
			defer timer.Stop()
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-timer.C:
				return nil
			}
		},
	}
}

// Name implements llm.LLMProvider.
func (p *ResilientProvider) Name() string {
	if p.inner == nil {
		return ""
	}
	return p.inner.Name()
}

// Generate implements llm.LLMProvider with retries on transient failures.
func (p *ResilientProvider) Generate(ctx context.Context, req domainllm.GenerateRequest) (domainllm.GenerateResponse, error) {
	if p.inner == nil {
		return domainllm.GenerateResponse{}, domainErr.New(domainErr.ErrInternal, "LLM provider is not configured", nil)
	}

	var lastErr error
	attempts := p.maxRetries + 1
	for attempt := 0; attempt < attempts; attempt++ {
		if err := ctx.Err(); err != nil {
			return domainllm.GenerateResponse{}, err
		}

		attemptCtx, cancel := context.WithTimeout(ctx, p.timeout)
		resp, err := p.inner.Generate(attemptCtx, req)
		cancel()
		if err == nil {
			return resp, nil
		}
		lastErr = err

		if !isTransientLLMError(err) || attempt == attempts-1 {
			return domainllm.GenerateResponse{}, err
		}
		backoff := time.Duration(attempt+1) * 100 * time.Millisecond
		if err := p.sleep(ctx, backoff); err != nil {
			return domainllm.GenerateResponse{}, err
		}
	}
	return domainllm.GenerateResponse{}, lastErr
}

// Health implements llm.LLMProvider with a single timed probe (no retry storm).
func (p *ResilientProvider) Health(ctx context.Context) (domainllm.ProviderHealth, error) {
	if p.inner == nil {
		return domainllm.ProviderHealth{}, domainErr.New(domainErr.ErrInternal, "LLM provider is not configured", nil)
	}
	attemptCtx, cancel := context.WithTimeout(ctx, p.timeout)
	defer cancel()
	return p.inner.Health(attemptCtx)
}

func isTransientLLMError(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, context.Canceled) {
		return false
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return true
	}
	if errors.Is(err, domainErr.ErrRateLimited) {
		return true
	}
	var netErr net.Error
	if errors.As(err, &netErr) {
		return true
	}
	msg := strings.ToLower(err.Error())
	for _, part := range []string{
		"provider unavailable",
		"connection refused",
		"timeout",
		"temporary",
		"i/o timeout",
	} {
		if strings.Contains(msg, part) {
			return true
		}
	}
	return false
}

var _ domainllm.LLMProvider = (*ResilientProvider)(nil)
