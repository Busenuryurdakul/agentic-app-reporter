package mcp

func toolCatalog() []toolDefinition {
	emptySchema := map[string]any{
		"type":                 "object",
		"properties":           map[string]any{},
		"additionalProperties": false,
	}

	workspaceSchema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"workspace_id": map[string]any{
				"type":        "string",
				"description": "Workspace UUID (or set ADCS_WORKSPACE_ID / X-Workspace-ID header)",
			},
			"limit": map[string]any{
				"type":        "integer",
				"description": "Max documents to return (list_documents only)",
			},
		},
		"additionalProperties": false,
	}

	documentSchema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"workspace_id": map[string]any{
				"type":        "string",
				"description": "Workspace UUID (or set ADCS_WORKSPACE_ID / X-Workspace-ID header)",
			},
			"document_id": map[string]any{
				"type":        "string",
				"description": "Generated document UUID",
			},
		},
		"required":             []string{"document_id"},
		"additionalProperties": false,
	}

	return []toolDefinition{
		{
			Name:        "get_me",
			Description: "Returns the authenticated user's profile.",
			InputSchema: emptySchema,
		},
		{
			Name:        "llm_health",
			Description: "Returns LLM provider health status.",
			InputSchema: emptySchema,
		},
		{
			Name:        "list_documents",
			Description: "Lists generated documents for a workspace. Requires X-Organization-ID and workspace_id (argument or X-Workspace-ID).",
			InputSchema: workspaceSchema,
		},
		{
			Name:        "get_document",
			Description: "Returns a generated document including markdown body. Requires X-Organization-ID, workspace_id, and document_id.",
			InputSchema: documentSchema,
		},
		{
			Name:        "workspace_readiness",
			Description: "Returns workspace readiness score and missing information summary. Requires X-Organization-ID and workspace_id.",
			InputSchema: workspaceSchema,
		},
	}
}
