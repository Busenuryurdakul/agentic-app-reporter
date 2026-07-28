package model

import (
	"time"

	"github.com/google/uuid"
)

// UserAPIKey is a user-scoped API key for MCP / headless access.
type UserAPIKey struct {
	ID         uuid.UUID  `json:"id"`
	UserID     uuid.UUID  `json:"user_id"`
	KeyHash    string     `json:"-"`
	Name       string     `json:"name"`
	Scopes     []byte     `json:"scopes,omitempty"`
	ExpiresAt  *time.Time `json:"expires_at,omitempty"`
	IsActive   bool       `json:"is_active"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}
