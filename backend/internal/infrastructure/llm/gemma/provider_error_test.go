package gemma

import (
	"testing"

	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
)

func TestClassifyProviderHTTPStatus(t *testing.T) {
	t.Parallel()

	tests := []struct {
		status int
		code   string
		kind   error
	}{
		{400, domainErr.ProviderCodeInvalidRequest, domainErr.ErrBadRequest},
		{401, domainErr.ProviderCodeAuth, domainErr.ErrBadGateway},
		{403, domainErr.ProviderCodeAuth, domainErr.ErrBadGateway},
		{404, domainErr.ProviderCodeNotFound, domainErr.ErrBadGateway},
		{429, domainErr.ProviderCodeRateLimited, domainErr.ErrRateLimited},
		{502, domainErr.ProviderCodeUpstream, domainErr.ErrInternal},
	}

	for _, tt := range tests {
		code, kind, _ := classifyProviderHTTPStatus(tt.status)
		assert.Equal(t, tt.code, code, "status=%d", tt.status)
		assert.ErrorIs(t, kind, tt.kind, "status=%d", tt.status)
	}
}

func TestSanitizeResponseBody_RedactsSecrets(t *testing.T) {
	t.Parallel()

	raw := []byte(`{"error":"invalid token hf_abc123xyz and Bearer secret-token-value"}`)
	out := sanitizeResponseBody(raw)
	assert.NotContains(t, out, "hf_abc123xyz")
	assert.NotContains(t, out, "secret-token-value")
	assert.Contains(t, out, "[REDACTED]")
}
