package mcp

import (
	"net/http"

	"github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/masterfabric-go/masterfabric/internal/shared/response"
)

func enforceMCPToolScope(w http.ResponseWriter, r *http.Request, toolName string) bool {
	method, ok := middleware.AuthMethodFromContext(r.Context())
	if !ok || method != middleware.AuthMethodAPIKey {
		return true
	}

	perms, _ := middleware.PermissionsFromContext(r.Context())
	if model.ScopesAllowMCPTool(perms, toolName) {
		return true
	}

	response.JSON(w, http.StatusForbidden, map[string]string{"error": "insufficient api key scope for tool: " + toolName})
	return false
}
