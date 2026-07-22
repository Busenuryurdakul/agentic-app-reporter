package generation

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/generation/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/generation/usecase"
	"github.com/masterfabric-go/masterfabric/internal/shared/response"
	"github.com/masterfabric-go/masterfabric/internal/shared/validator"
)

// Handler exposes generation / LLM / document HTTP endpoints.
type Handler struct {
	providerHealthUC     *usecase.ProviderHealthUseCase
	generateDocumentUC   *usecase.GenerateDocumentUseCase
	regenerateDocumentUC *usecase.RegenerateDocumentUseCase
	listDocumentsUC      *usecase.ListDocumentsUseCase
	getDocumentUC        *usecase.GetDocumentUseCase
}

// NewHandler creates a generation Handler. Document use-cases may be nil when DB is unavailable.
func NewHandler(
	providerHealthUC *usecase.ProviderHealthUseCase,
	generateDocumentUC *usecase.GenerateDocumentUseCase,
	regenerateDocumentUC *usecase.RegenerateDocumentUseCase,
	listDocumentsUC *usecase.ListDocumentsUseCase,
	getDocumentUC *usecase.GetDocumentUseCase,
) *Handler {
	return &Handler{
		providerHealthUC:     providerHealthUC,
		generateDocumentUC:   generateDocumentUC,
		regenerateDocumentUC: regenerateDocumentUC,
		listDocumentsUC:      listDocumentsUC,
		getDocumentUC:        getDocumentUC,
	}
}

// ProviderHealth handles GET /api/v1/llm/health.
func (h *Handler) ProviderHealth(w http.ResponseWriter, r *http.Request) {
	info, err := h.providerHealthUC.Execute(r.Context())
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, info)
}

// GenerateDocument handles POST /api/v1/workspaces/{workspaceId}/documents/generate.
func (h *Handler) GenerateDocument(w http.ResponseWriter, r *http.Request) {
	if h.generateDocumentUC == nil {
		response.JSON(w, http.StatusServiceUnavailable, map[string]string{"error": "document generation unavailable"})
		return
	}
	workspaceID, err := uuid.Parse(chi.URLParam(r, "workspaceId"))
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid workspace id"})
		return
	}

	req, err := decodeOptionalGenerateRequest(r)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	doc, err := h.generateDocumentUC.Execute(r.Context(), workspaceID, req)
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusCreated, doc)
}

// RegenerateDocument handles POST /api/v1/workspaces/{workspaceId}/documents/{documentId}/regenerate.
func (h *Handler) RegenerateDocument(w http.ResponseWriter, r *http.Request) {
	if h.regenerateDocumentUC == nil {
		response.JSON(w, http.StatusServiceUnavailable, map[string]string{"error": "document generation unavailable"})
		return
	}
	workspaceID, err := uuid.Parse(chi.URLParam(r, "workspaceId"))
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid workspace id"})
		return
	}
	documentID, err := uuid.Parse(chi.URLParam(r, "documentId"))
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid document id"})
		return
	}

	doc, err := h.regenerateDocumentUC.Execute(r.Context(), workspaceID, documentID)
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusCreated, doc)
}

// ListDocuments handles GET /api/v1/workspaces/{workspaceId}/documents.
func (h *Handler) ListDocuments(w http.ResponseWriter, r *http.Request) {
	if h.listDocumentsUC == nil {
		response.JSON(w, http.StatusServiceUnavailable, map[string]string{"error": "documents unavailable"})
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

	result, err := h.listDocumentsUC.Execute(r.Context(), workspaceID, limit)
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, result)
}

// GetDocument handles GET /api/v1/workspaces/{workspaceId}/documents/{documentId}.
func (h *Handler) GetDocument(w http.ResponseWriter, r *http.Request) {
	if h.getDocumentUC == nil {
		response.JSON(w, http.StatusServiceUnavailable, map[string]string{"error": "documents unavailable"})
		return
	}
	workspaceID, err := uuid.Parse(chi.URLParam(r, "workspaceId"))
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid workspace id"})
		return
	}
	documentID, err := uuid.Parse(chi.URLParam(r, "documentId"))
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid document id"})
		return
	}

	doc, err := h.getDocumentUC.Execute(r.Context(), workspaceID, documentID)
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, doc)
}

func decodeOptionalGenerateRequest(r *http.Request) (dto.GenerateDocumentRequest, error) {
	var req dto.GenerateDocumentRequest
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
	if err := validator.ValidateStruct(&req); err != nil {
		return req, errors.New(validator.FormatValidationErrors(err))
	}
	return req, nil
}
