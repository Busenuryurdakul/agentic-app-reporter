package errors

import (
	"errors"
	"fmt"
	"net/http"
)

// Sentinel domain errors.
var (
	ErrNotFound           = errors.New("resource not found")
	ErrAlreadyExists      = errors.New("resource already exists")
	ErrUnauthorized       = errors.New("unauthorized")
	ErrForbidden          = errors.New("forbidden")
	ErrValidation         = errors.New("validation error")
	ErrInternal           = errors.New("internal error")
	ErrBadRequest         = errors.New("bad request")
	ErrConflict           = errors.New("conflict")
	ErrRateLimited        = errors.New("rate limited")
	ErrNotImplemented     = errors.New("not implemented")
	ErrBadGateway         = errors.New("bad gateway")
	ErrServiceUnavailable = errors.New("service unavailable")
)

// Provider error codes exposed to API clients when upstream LLM calls fail.
const (
	ProviderCodeInvalidRequest  = "provider_invalid_request"
	ProviderCodeContextLength   = "provider_context_length"
	ProviderCodeAuth            = "provider_auth"
	ProviderCodeNotFound        = "provider_not_found"
	ProviderCodeRateLimited     = "provider_rate_limited"
	ProviderCodeQuota           = "provider_quota"
	ProviderCodeUpstream        = "provider_upstream"
)

// DomainError is a structured error with an underlying cause and a message.
type DomainError struct {
	Kind         error  // One of the sentinel errors above.
	Message      string // Human-readable message.
	Err          error  // Optional wrapped error for debugging.
	ProviderCode string // Optional upstream LLM provider classification code.
}

// Error implements the error interface.
func (e *DomainError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s: %v", e.Kind, e.Message, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Kind, e.Message)
}

// Unwrap returns the underlying sentinel error for errors.Is.
func (e *DomainError) Unwrap() error {
	return e.Kind
}

// New creates a new DomainError.
func New(kind error, message string, err error) *DomainError {
	return &DomainError{
		Kind:    kind,
		Message: message,
		Err:     err,
	}
}

// NewWithProvider creates a DomainError tagged with an upstream provider code.
func NewWithProvider(kind error, message, providerCode string, err error) *DomainError {
	return &DomainError{
		Kind:         kind,
		Message:      message,
		Err:          err,
		ProviderCode: providerCode,
	}
}

// HTTPStatusCode maps a domain error to an HTTP status code.
func HTTPStatusCode(err error) int {
	switch {
	case errors.Is(err, ErrNotFound):
		return http.StatusNotFound
	case errors.Is(err, ErrAlreadyExists):
		return http.StatusConflict
	case errors.Is(err, ErrUnauthorized):
		return http.StatusUnauthorized
	case errors.Is(err, ErrForbidden):
		return http.StatusForbidden
	case errors.Is(err, ErrValidation):
		return http.StatusUnprocessableEntity
	case errors.Is(err, ErrBadRequest):
		return http.StatusBadRequest
	case errors.Is(err, ErrConflict):
		return http.StatusConflict
	case errors.Is(err, ErrRateLimited):
		return http.StatusTooManyRequests
	case errors.Is(err, ErrNotImplemented):
		return http.StatusNotImplemented
	case errors.Is(err, ErrBadGateway):
		return http.StatusBadGateway
	case errors.Is(err, ErrServiceUnavailable):
		return http.StatusServiceUnavailable
	default:
		return http.StatusInternalServerError
	}
}

// ErrorResponse is the JSON structure returned to API clients.
type ErrorResponse struct {
	Error             string `json:"error"`
	Message           string `json:"message"`
	Code              int    `json:"code"`
	ProviderErrorCode string `json:"provider_error_code,omitempty"`
}
