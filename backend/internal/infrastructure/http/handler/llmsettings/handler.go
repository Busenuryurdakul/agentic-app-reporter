package llmsettings

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/llmsettings/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/llmsettings/usecase"
	"github.com/masterfabric-go/masterfabric/internal/shared/response"
	"github.com/masterfabric-go/masterfabric/internal/shared/validator"
)

// Handler exposes organization LLM settings HTTP endpoints.
type Handler struct {
	getSettingsUC    *usecase.GetOrgLLMSettingsUseCase
	updateSettingsUC *usecase.UpdateOrgLLMSettingsUseCase
	testConnectionUC *usecase.TestOrgLLMConnectionUseCase
}

// NewHandler creates a new LLM settings handler.
func NewHandler(
	getSettingsUC *usecase.GetOrgLLMSettingsUseCase,
	updateSettingsUC *usecase.UpdateOrgLLMSettingsUseCase,
	testConnectionUC *usecase.TestOrgLLMConnectionUseCase,
) *Handler {
	return &Handler{
		getSettingsUC:    getSettingsUC,
		updateSettingsUC: updateSettingsUC,
		testConnectionUC: testConnectionUC,
	}
}

// GetSettings handles GET /api/v1/organizations/{orgId}/llm-settings.
func (h *Handler) GetSettings(w http.ResponseWriter, r *http.Request) {
	orgID, err := parseOrgID(r)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid organization id"})
		return
	}

	result, err := h.getSettingsUC.Execute(r.Context(), orgID)
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, result)
}

// UpdateSettings handles PUT /api/v1/organizations/{orgId}/llm-settings.
func (h *Handler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	orgID, err := parseOrgID(r)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid organization id"})
		return
	}

	var req dto.UpdateOrgLLMSettingsRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	result, err := h.updateSettingsUC.Execute(r.Context(), orgID, req)
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, result)
}

// TestConnection handles POST /api/v1/organizations/{orgId}/llm-settings/test.
func (h *Handler) TestConnection(w http.ResponseWriter, r *http.Request) {
	orgID, err := parseOrgID(r)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid organization id"})
		return
	}

	var req *dto.TestOrgLLMConnectionRequest
	if r.Body != nil {
		var body dto.TestOrgLLMConnectionRequest
		dec := json.NewDecoder(r.Body)
		if err := dec.Decode(&body); err != nil && err != io.EOF {
			response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
			return
		}
		if err == nil {
			if err := validator.ValidateStruct(&body); err != nil {
				response.JSON(w, http.StatusBadRequest, map[string]string{"error": validator.FormatValidationErrors(err)})
				return
			}
			req = &body
		}
	}

	result, err := h.testConnectionUC.Execute(r.Context(), orgID, req)
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, result)
}

func parseOrgID(r *http.Request) (uuid.UUID, error) {
	return uuid.Parse(chi.URLParam(r, "orgId"))
}
