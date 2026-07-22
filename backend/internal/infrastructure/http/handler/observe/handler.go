package observe

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/observe/usecase"
	"github.com/masterfabric-go/masterfabric/internal/shared/response"
)

// Handler exposes Phase 4 observe endpoints (readiness + generation summary).
type Handler struct {
	readinessUC *usecase.ReadinessUseCase
	summaryUC   *usecase.ObserveSummaryUseCase
}

// NewHandler creates an observe Handler.
func NewHandler(readinessUC *usecase.ReadinessUseCase, summaryUC *usecase.ObserveSummaryUseCase) *Handler {
	return &Handler{readinessUC: readinessUC, summaryUC: summaryUC}
}

// GetReadiness handles GET /api/v1/workspaces/{workspaceId}/readiness.
func (h *Handler) GetReadiness(w http.ResponseWriter, r *http.Request) {
	if h.readinessUC == nil {
		response.JSON(w, http.StatusServiceUnavailable, map[string]string{"error": "readiness unavailable"})
		return
	}
	workspaceID, err := uuid.Parse(chi.URLParam(r, "workspaceId"))
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid workspace id"})
		return
	}

	result, err := h.readinessUC.Execute(r.Context(), workspaceID)
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, result)
}

// GetSummary handles GET /api/v1/workspaces/{workspaceId}/observe/summary.
func (h *Handler) GetSummary(w http.ResponseWriter, r *http.Request) {
	if h.summaryUC == nil {
		response.JSON(w, http.StatusServiceUnavailable, map[string]string{"error": "observe summary unavailable"})
		return
	}
	workspaceID, err := uuid.Parse(chi.URLParam(r, "workspaceId"))
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid workspace id"})
		return
	}

	limit := 0
	if raw := r.URL.Query().Get("limit"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 0 {
			response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid limit"})
			return
		}
		limit = n
	}

	result, err := h.summaryUC.Execute(r.Context(), workspaceID, limit)
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, result)
}
