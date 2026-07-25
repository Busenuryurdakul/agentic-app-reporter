package gemma

import (
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"time"

	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

var (
	hfTokenPattern    = regexp.MustCompile(`hf_[A-Za-z0-9_]+`)
	bearerTokenPattern = regexp.MustCompile(`(?i)bearer\s+[A-Za-z0-9._\-]+`)
)

func classifyProviderHTTPStatus(status int) (providerCode string, kind error, message string) {
	switch {
	case status == http.StatusBadRequest:
		return domainErr.ProviderCodeInvalidRequest, domainErr.ErrBadRequest,
			"gemma provider rejected request (invalid request or context length)"
	case status == http.StatusUnauthorized || status == http.StatusForbidden:
		return domainErr.ProviderCodeAuth, domainErr.ErrBadGateway,
			"gemma provider authentication or model access failed"
	case status == http.StatusNotFound:
		return domainErr.ProviderCodeNotFound, domainErr.ErrBadGateway,
			"gemma provider model or route not found"
	case status == http.StatusTooManyRequests:
		return domainErr.ProviderCodeRateLimited, domainErr.ErrRateLimited,
			"gemma provider rate limited"
	case status >= 500:
		return domainErr.ProviderCodeUpstream, domainErr.ErrInternal,
			fmt.Sprintf("gemma provider unavailable (HTTP %d)", status)
	case status >= 400:
		return domainErr.ProviderCodeInvalidRequest, domainErr.ErrBadRequest,
			fmt.Sprintf("gemma provider rejected request (HTTP %d)", status)
	default:
		return domainErr.ProviderCodeUpstream, domainErr.ErrInternal,
			fmt.Sprintf("gemma provider unexpected status (HTTP %d)", status)
	}
}

func sanitizeResponseBody(raw []byte) string {
	s := truncateForError(raw)
	s = hfTokenPattern.ReplaceAllString(s, "[REDACTED]")
	s = bearerTokenPattern.ReplaceAllString(s, "[REDACTED]")
	return s
}

func (c *Client) logAndWrapChatCompletionError(status int, raw []byte, duration time.Duration) error {
	summary := sanitizeResponseBody(raw)
	providerCode, kind, message := classifyProviderHTTPStatus(status)

	slog.Error("llm provider chat completion failed",
		"provider", c.Name(),
		"http_status", status,
		"provider_error_code", providerCode,
		"response_body_summary", summary,
		"model", c.model,
		"base_url", c.baseURL,
		"duration_ms", duration.Milliseconds(),
	)

	return domainErr.NewWithProvider(
		kind,
		message,
		providerCode,
		fmt.Errorf("http_status=%d body_summary=%s", status, summary),
	)
}
