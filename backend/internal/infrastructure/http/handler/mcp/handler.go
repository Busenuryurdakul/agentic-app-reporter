package mcp

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/generation/usecase"
	observeUC "github.com/masterfabric-go/masterfabric/internal/application/observe/usecase"
	iamRepo "github.com/masterfabric-go/masterfabric/internal/domain/iam/repository"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/masterfabric-go/masterfabric/internal/shared/response"
)

// Handler exposes MCP-compatible HTTP endpoints (tools list + invoke).
type Handler struct {
	userRepo         iamRepo.UserRepository
	providerHealthUC *usecase.ProviderHealthUseCase
	listDocumentsUC  *usecase.ListDocumentsUseCase
	getDocumentUC    *usecase.GetDocumentUseCase
	readinessUC      *observeUC.ReadinessUseCase
}

// NewHandler creates an MCP handler.
func NewHandler(
	userRepo iamRepo.UserRepository,
	providerHealthUC *usecase.ProviderHealthUseCase,
	listDocumentsUC *usecase.ListDocumentsUseCase,
	getDocumentUC *usecase.GetDocumentUseCase,
	readinessUC *observeUC.ReadinessUseCase,
) *Handler {
	return &Handler{
		userRepo:         userRepo,
		providerHealthUC: providerHealthUC,
		listDocumentsUC:  listDocumentsUC,
		getDocumentUC:    getDocumentUC,
		readinessUC:      readinessUC,
	}
}

type toolDefinition struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	InputSchema map[string]any `json:"inputSchema,omitempty"`
}

type callToolRequest struct {
	Name      string          `json:"name" validate:"required"`
	Arguments json.RawMessage `json:"arguments,omitempty"`
}

// ListTools handles GET /api/v1/mcp/tools.
func (h *Handler) ListTools(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, http.StatusOK, map[string]any{"tools": toolCatalog()})
}

// CallTool handles POST /api/v1/mcp/tools/call.
func (h *Handler) CallTool(w http.ResponseWriter, r *http.Request) {
	var req callToolRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	if req.Name == "" {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "tool name is required"})
		return
	}

	if !enforceMCPToolScope(w, r, req.Name) {
		return
	}

	switch req.Name {
	case "get_me":
		h.callGetMe(w, r)
	case "llm_health":
		h.callLLMHealth(w, r)
	case "list_documents":
		h.callListDocuments(w, r, req.Arguments)
	case "get_document":
		h.callGetDocument(w, r, req.Arguments)
	case "workspace_readiness":
		h.callWorkspaceReadiness(w, r, req.Arguments)
	default:
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "unknown tool: " + req.Name})
	}
}

// Health handles GET /api/v1/mcp/health.
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	method, _ := middleware.AuthMethodFromContext(r.Context())
	response.JSON(w, http.StatusOK, map[string]any{
		"status":      "ok",
		"auth_method": method,
		"mcp_version": "1.0",
		"protocol":    "http",
	})
}

func (h *Handler) callGetMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, map[string]string{"error": "not authenticated"})
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{
		"tool": "get_me",
		"result": map[string]any{
			"id":         user.ID,
			"email":      user.Email,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"status":     string(user.Status),
		},
	})
}

func (h *Handler) callLLMHealth(w http.ResponseWriter, r *http.Request) {
	if h.providerHealthUC == nil {
		response.JSON(w, http.StatusServiceUnavailable, map[string]string{"error": "llm health unavailable"})
		return
	}

	info, err := h.providerHealthUC.Execute(r.Context())
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{
		"tool":   "llm_health",
		"result": info,
	})
}

func (h *Handler) callListDocuments(w http.ResponseWriter, r *http.Request, rawArgs json.RawMessage) {
	if h.listDocumentsUC == nil {
		response.JSON(w, http.StatusServiceUnavailable, map[string]string{"error": "list documents unavailable"})
		return
	}

	workspaceID, err := h.resolveWorkspaceID(w, r, rawArgs)
	if err != nil {
		return
	}

	args, _ := parseWorkspaceArgs(rawArgs)
	result, err := h.listDocumentsUC.Execute(r.Context(), workspaceID, limitOrDefault(args.Limit))
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{"tool": "list_documents", "result": result})
}

func (h *Handler) callGetDocument(w http.ResponseWriter, r *http.Request, rawArgs json.RawMessage) {
	if h.getDocumentUC == nil {
		response.JSON(w, http.StatusServiceUnavailable, map[string]string{"error": "get document unavailable"})
		return
	}

	workspaceID, err := h.resolveWorkspaceID(w, r, rawArgs)
	if err != nil {
		return
	}

	args, err := parseWorkspaceArgs(rawArgs)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	documentID, err := documentIDFromArgs(args)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	result, err := h.getDocumentUC.Execute(r.Context(), workspaceID, documentID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{"tool": "get_document", "result": result})
}

func (h *Handler) callWorkspaceReadiness(w http.ResponseWriter, r *http.Request, rawArgs json.RawMessage) {
	if h.readinessUC == nil {
		response.JSON(w, http.StatusServiceUnavailable, map[string]string{"error": "workspace readiness unavailable"})
		return
	}

	workspaceID, err := h.resolveWorkspaceID(w, r, rawArgs)
	if err != nil {
		return
	}

	result, err := h.readinessUC.Execute(r.Context(), workspaceID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{"tool": "workspace_readiness", "result": result})
}

func (h *Handler) resolveWorkspaceID(w http.ResponseWriter, r *http.Request, rawArgs json.RawMessage) (uuid.UUID, error) {
	if _, ok := middleware.ResolveOrganizationID(r.Context()); !ok {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": errOrgRequired.Error()})
		return uuid.Nil, errOrgRequired
	}

	args, err := parseWorkspaceArgs(rawArgs)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return uuid.Nil, err
	}

	ctxWorkspaceID, _ := middleware.WorkspaceIDFromContext(r.Context())
	workspaceID, err := workspaceIDFromRequest(args, ctxWorkspaceID)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return uuid.Nil, err
	}

	return workspaceID, nil
}
