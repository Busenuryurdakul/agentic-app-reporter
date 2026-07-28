package iam

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/iam/dto"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/masterfabric-go/masterfabric/internal/shared/response"
	"github.com/masterfabric-go/masterfabric/internal/shared/validator"
)

// CreateUserAPIKey handles POST /api/v1/auth/api-keys.
func (h *Handler) CreateUserAPIKey(w http.ResponseWriter, r *http.Request) {
	if h.manageUserAPIKeysUC == nil {
		response.JSON(w, http.StatusServiceUnavailable, map[string]string{"error": "api key management unavailable"})
		return
	}
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, map[string]string{"error": "not authenticated"})
		return
	}

	var req dto.CreateUserAPIKeyRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	key, err := h.manageUserAPIKeysUC.CreateKey(r.Context(), userID, req)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.Created(w, key)
}

// ListUserAPIKeys handles GET /api/v1/auth/api-keys.
func (h *Handler) ListUserAPIKeys(w http.ResponseWriter, r *http.Request) {
	if h.manageUserAPIKeysUC == nil {
		response.JSON(w, http.StatusServiceUnavailable, map[string]string{"error": "api key management unavailable"})
		return
	}
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, map[string]string{"error": "not authenticated"})
		return
	}

	keys, err := h.manageUserAPIKeysUC.ListKeys(r.Context(), userID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{"keys": keys})
}

// RevokeUserAPIKey handles DELETE /api/v1/auth/api-keys/{keyId}.
func (h *Handler) RevokeUserAPIKey(w http.ResponseWriter, r *http.Request) {
	if h.manageUserAPIKeysUC == nil {
		response.JSON(w, http.StatusServiceUnavailable, map[string]string{"error": "api key management unavailable"})
		return
	}
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, map[string]string{"error": "not authenticated"})
		return
	}

	keyID, err := uuid.Parse(chi.URLParam(r, "keyId"))
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid key id"})
		return
	}

	if err := h.manageUserAPIKeysUC.RevokeKey(r.Context(), userID, keyID); err != nil {
		response.Error(w, err)
		return
	}

	response.NoContent(w)
}
