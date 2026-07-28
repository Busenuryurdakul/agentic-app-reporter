package service

import "context"

// UserAPIKeyValidator validates user-scoped API keys for headless / MCP access.
type UserAPIKeyValidator interface {
	ValidateUserAPIKey(ctx context.Context, rawKey string) (*TokenClaims, error)
}
