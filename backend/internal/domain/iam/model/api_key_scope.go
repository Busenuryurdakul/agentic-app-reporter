package model

// User API key scopes for MCP / headless access.
const (
	ScopeMCPRead      = "mcp:read"
	ScopeMCPProfile   = "mcp:profile"
	ScopeMCPLLM       = "mcp:llm"
	ScopeMCPWorkspace = "mcp:workspace"
)

// DefaultUserAPIKeyScopes is assigned when create request omits scopes.
var DefaultUserAPIKeyScopes = []string{ScopeMCPRead}

// ValidUserAPIKeyScopes is the allow-list for key creation.
var ValidUserAPIKeyScopes = map[string]struct{}{
	ScopeMCPRead:      {},
	ScopeMCPProfile:   {},
	ScopeMCPLLM:       {},
	ScopeMCPWorkspace: {},
}

// MCPToolRequiredScope maps MCP tool names to minimum scope (excluding umbrella mcp:read).
func MCPToolRequiredScope(toolName string) string {
	switch toolName {
	case "get_me":
		return ScopeMCPProfile
	case "llm_health":
		return ScopeMCPLLM
	case "list_documents", "get_document", "workspace_readiness":
		return ScopeMCPWorkspace
	default:
		return ""
	}
}

// ScopesAllowMCPTool reports whether granted scopes permit invoking toolName.
// Empty scopes means legacy full MCP read access.
func ScopesAllowMCPTool(granted []string, toolName string) bool {
	required := MCPToolRequiredScope(toolName)
	if required == "" {
		return false
	}
	if len(granted) == 0 {
		return true
	}
	for _, scope := range granted {
		if scope == ScopeMCPRead || scope == required {
			return true
		}
	}
	return false
}
