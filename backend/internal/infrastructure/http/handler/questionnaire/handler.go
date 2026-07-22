package questionnaire

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/questionnaire/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/questionnaire/usecase"
	"github.com/masterfabric-go/masterfabric/internal/shared/response"
	"github.com/masterfabric-go/masterfabric/internal/shared/validator"
)

// Handler provides Questionnaire HTTP handlers.
type Handler struct {
	listSetsUC               *usecase.ListSetsUseCase
	getSetUC                 *usecase.GetSetUseCase
	listWorkspaceQuestionsUC *usecase.ListWorkspaceQuestionsUseCase
	listAnswersUC            *usecase.ListAnswersUseCase
	upsertAnswerUC           *usecase.UpsertAnswerUseCase
	bulkUpsertAnswersUC      *usecase.BulkUpsertAnswersUseCase
	missingInformationUC     *usecase.MissingInformationUseCase
}

// NewHandler creates a new Questionnaire handler.
func NewHandler(
	listSetsUC *usecase.ListSetsUseCase,
	getSetUC *usecase.GetSetUseCase,
	listWorkspaceQuestionsUC *usecase.ListWorkspaceQuestionsUseCase,
	listAnswersUC *usecase.ListAnswersUseCase,
	upsertAnswerUC *usecase.UpsertAnswerUseCase,
	bulkUpsertAnswersUC *usecase.BulkUpsertAnswersUseCase,
	missingInformationUC *usecase.MissingInformationUseCase,
) *Handler {
	return &Handler{
		listSetsUC:               listSetsUC,
		getSetUC:                 getSetUC,
		listWorkspaceQuestionsUC: listWorkspaceQuestionsUC,
		listAnswersUC:            listAnswersUC,
		upsertAnswerUC:           upsertAnswerUC,
		bulkUpsertAnswersUC:      bulkUpsertAnswersUC,
		missingInformationUC:     missingInformationUC,
	}
}

// ListSets returns questionnaire sets visible to the active organization.
func (h *Handler) ListSets(w http.ResponseWriter, r *http.Request) {
	sets, err := h.listSetsUC.Execute(r.Context())
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, sets)
}

// GetSet returns a single questionnaire set with its questions.
func (h *Handler) GetSet(w http.ResponseWriter, r *http.Request) {
	setID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid questionnaire set id"})
		return
	}

	set, err := h.getSetUC.Execute(r.Context(), setID)
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, set)
}

// ListWorkspaceQuestions returns the default questionnaire set's questions
// merged with the workspace's existing answers.
func (h *Handler) ListWorkspaceQuestions(w http.ResponseWriter, r *http.Request) {
	workspaceID, err := uuid.Parse(chi.URLParam(r, "workspaceId"))
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid workspace id"})
		return
	}

	result, err := h.listWorkspaceQuestionsUC.Execute(r.Context(), workspaceID)
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, result)
}

// ListAnswers returns all answers recorded for a workspace.
func (h *Handler) ListAnswers(w http.ResponseWriter, r *http.Request) {
	workspaceID, err := uuid.Parse(chi.URLParam(r, "workspaceId"))
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid workspace id"})
		return
	}

	answers, err := h.listAnswersUC.Execute(r.Context(), workspaceID)
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, answers)
}

// UpsertAnswer creates or updates a single answer for a workspace's question.
func (h *Handler) UpsertAnswer(w http.ResponseWriter, r *http.Request) {
	workspaceID, err := uuid.Parse(chi.URLParam(r, "workspaceId"))
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid workspace id"})
		return
	}
	questionID, err := uuid.Parse(chi.URLParam(r, "questionId"))
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid question id"})
		return
	}

	var req dto.UpsertAnswerRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	answer, err := h.upsertAnswerUC.Execute(r.Context(), workspaceID, questionID, req)
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, answer)
}

// BulkUpsertAnswers creates or updates multiple answers for a workspace at once.
func (h *Handler) BulkUpsertAnswers(w http.ResponseWriter, r *http.Request) {
	workspaceID, err := uuid.Parse(chi.URLParam(r, "workspaceId"))
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid workspace id"})
		return
	}

	var req dto.BulkUpsertAnswersRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	answers, err := h.bulkUpsertAnswersUC.Execute(r.Context(), workspaceID, req)
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, answers)
}

// MissingInformation returns required questions still missing an answer.
func (h *Handler) MissingInformation(w http.ResponseWriter, r *http.Request) {
	workspaceID, err := uuid.Parse(chi.URLParam(r, "workspaceId"))
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid workspace id"})
		return
	}

	result, err := h.missingInformationUC.Execute(r.Context(), workspaceID)
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, result)
}
