package mcp

import "errors"

var (
	errWorkspaceRequired = errors.New("workspace_id required (argument or X-Workspace-ID header)")
	errDocumentRequired  = errors.New("document_id required")
	errOrgRequired       = errors.New("X-Organization-ID header required for workspace tools")
	errInvalidWorkspaceID = errors.New("invalid workspace_id")
)
