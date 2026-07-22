package projectprofile

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/projectprofile/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/projectprofile/usecase"
	"github.com/masterfabric-go/masterfabric/internal/shared/response"
	"github.com/masterfabric-go/masterfabric/internal/shared/validator"
)

// Handler provides Project Profile HTTP handlers.
type Handler struct {
	getProfileUC    *usecase.GetProfileUseCase
	upsertProfileUC *usecase.UpsertProfileUseCase
	completenessUC  *usecase.CompletenessUseCase
}

// NewHandler creates a new Project Profile handler.
func NewHandler(
	getProfileUC *usecase.GetProfileUseCase,
	upsertProfileUC *usecase.UpsertProfileUseCase,
	completenessUC *usecase.CompletenessUseCase,
) *Handler {
	return &Handler{
		getProfileUC:    getProfileUC,
		upsertProfileUC: upsertProfileUC,
		completenessUC:  completenessUC,
	}
}

// GetProfile returns the project profile for a workspace.
func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	workspaceID, err := uuid.Parse(chi.URLParam(r, "workspaceId"))
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid workspace id"})
		return
	}

	profile, err := h.getProfileUC.Execute(r.Context(), workspaceID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, profile)
}

// UpsertProfile creates or updates the project profile for a workspace.
func (h *Handler) UpsertProfile(w http.ResponseWriter, r *http.Request) {
	workspaceID, err := uuid.Parse(chi.URLParam(r, "workspaceId"))
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid workspace id"})
		return
	}

	var req dto.UpsertProfileRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	profile, err := h.upsertProfileUC.Execute(r.Context(), workspaceID, req)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, profile)
}

// GetCompleteness returns the completeness report for a workspace's project profile.
func (h *Handler) GetCompleteness(w http.ResponseWriter, r *http.Request) {
	workspaceID, err := uuid.Parse(chi.URLParam(r, "workspaceId"))
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid workspace id"})
		return
	}

	result, err := h.completenessUC.Execute(r.Context(), workspaceID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, result)
}
