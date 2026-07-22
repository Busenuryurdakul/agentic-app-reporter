package response

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// JSON writes a JSON response with the given status code and payload.
func JSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if payload != nil {
		_ = json.NewEncoder(w).Encode(payload)
	}
}

// Error writes a JSON error response, mapping domain errors to HTTP codes.
// 502/503 DomainError messages are returned to clients (timeout / upstream);
// other 5xx responses stay generic so wrapped causes are not leaked.
func Error(w http.ResponseWriter, err error) {
	code := domainErr.HTTPStatusCode(err)
	msg := clientErrorMessage(err)
	if code >= http.StatusInternalServerError {
		slog.Error("request failed", "code", code, "error", err)
		if !isClientSafeServerError(err) {
			msg = "an internal error occurred"
		}
	}
	JSON(w, code, domainErr.ErrorResponse{
		Error:   http.StatusText(code),
		Message: msg,
		Code:    code,
	})
}

func clientErrorMessage(err error) string {
	var de *domainErr.DomainError
	if errors.As(err, &de) && de.Message != "" {
		return de.Message
	}
	return err.Error()
}

func isClientSafeServerError(err error) bool {
	return errors.Is(err, domainErr.ErrBadGateway) || errors.Is(err, domainErr.ErrServiceUnavailable)
}

// Created writes a 201 Created JSON response.
func Created(w http.ResponseWriter, payload interface{}) {
	JSON(w, http.StatusCreated, payload)
}

// NoContent writes a 204 No Content response.
func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}
