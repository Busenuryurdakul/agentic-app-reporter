package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/projectprofile/model"
)

// ProfileRepository defines the interface for project profile persistence.
type ProfileRepository interface {
	// GetByWorkspaceID retrieves the project profile for a workspace.
	// Returns a domain "not found" error if no profile has been created yet.
	GetByWorkspaceID(ctx context.Context, workspaceID uuid.UUID) (*model.Profile, error)

	// Upsert creates the profile if it does not exist for the workspace,
	// or updates the existing one otherwise.
	Upsert(ctx context.Context, profile *model.Profile) error
}
