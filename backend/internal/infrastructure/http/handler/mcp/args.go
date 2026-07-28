package mcp

import (
	"encoding/json"

	"github.com/google/uuid"
)

type workspaceToolArgs struct {
	WorkspaceID string `json:"workspace_id"`
	DocumentID  string `json:"document_id"`
	Limit       int    `json:"limit"`
}

func parseWorkspaceArgs(raw json.RawMessage) (workspaceToolArgs, error) {
	var args workspaceToolArgs
	if len(raw) == 0 {
		return args, nil
	}
	if err := json.Unmarshal(raw, &args); err != nil {
		return args, err
	}
	return args, nil
}

func workspaceIDFromRequest(r workspaceToolArgs, ctxWorkspaceID uuid.UUID) (uuid.UUID, error) {
	if r.WorkspaceID != "" {
		id, err := uuid.Parse(r.WorkspaceID)
		if err != nil {
			return uuid.Nil, errInvalidWorkspaceID
		}
		return id, nil
	}
	if ctxWorkspaceID != uuid.Nil {
		return ctxWorkspaceID, nil
	}
	return uuid.Nil, errWorkspaceRequired
}

func documentIDFromArgs(args workspaceToolArgs) (uuid.UUID, error) {
	if args.DocumentID == "" {
		return uuid.Nil, errDocumentRequired
	}
	return uuid.Parse(args.DocumentID)
}

func limitOrDefault(limit int) int {
	if limit <= 0 {
		return 20
	}
	if limit > 100 {
		return 100
	}
	return limit
}
