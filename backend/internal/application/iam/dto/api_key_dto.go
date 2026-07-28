package dto

import (
	"time"

	"github.com/google/uuid"
)

// CreateUserAPIKeyRequest is the input for creating a user-scoped API key.
type CreateUserAPIKeyRequest struct {
	Name string `json:"name" validate:"required,min=1,max=255"`
}

// UserAPIKeyResponse is the output for a user API key (raw key only on creation).
type UserAPIKeyResponse struct {
	ID         uuid.UUID  `json:"id"`
	UserID     uuid.UUID  `json:"user_id"`
	Name       string     `json:"name"`
	Key        string     `json:"key,omitempty"`
	ExpiresAt  *time.Time `json:"expires_at,omitempty"`
	IsActive   bool       `json:"is_active"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}
