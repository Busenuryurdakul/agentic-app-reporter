package export

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/export/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/export/usecase"
	"github.com/masterfabric-go/masterfabric/internal/shared/response"
)

// Handler exposes sync document export downloads.
type Handler struct {
	exportUC *usecase.ExportPackageUseCase
}

// NewHandler creates an export Handler.
func NewHandler(exportUC *usecase.ExportPackageUseCase) *Handler {
	return &Handler{exportUC: exportUC}
}

// CreateExport handles POST /api/v1/workspaces/{workspaceId}/exports.
func (h *Handler) CreateExport(w http.ResponseWriter, r *http.Request) {
	if h.exportUC == nil {
		response.JSON(w, http.StatusServiceUnavailable, map[string]string{"error": "export unavailable"})
		return
	}
	workspaceID, err := uuid.Parse(chi.URLParam(r, "workspaceId"))
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid workspace id"})
		return
	}

	req, err := decodeExportRequest(r)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	result, err := h.exportUC.Execute(r.Context(), workspaceID, req)
	if err != nil {
		response.Error(w, err)
		return
	}

	w.Header().Set("Content-Type", result.ContentType)
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename=%q`, result.Filename))
	w.Header().Set("X-Document-Count", fmt.Sprintf("%d", result.DocumentCount))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(result.Body)
}

func decodeExportRequest(r *http.Request) (dto.ExportPackageRequest, error) {
	var req dto.ExportPackageRequest
	if r.Body == nil {
		return req, nil
	}
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(&req); err != nil {
		if errors.Is(err, io.EOF) {
			return req, nil
		}
		return req, err
	}
	return req, nil
}
