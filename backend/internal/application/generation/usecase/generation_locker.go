package usecase

import (
	"context"

	"github.com/google/uuid"
)

// GenerationLocker prevents overlapping generate/regenerate calls for the same workspace.
// Implementations may be in-process (single instance) or distributed (Redis).
type GenerationLocker interface {
	TryBegin(ctx context.Context, workspaceID uuid.UUID) (bool, error)
	End(ctx context.Context, workspaceID uuid.UUID)
	HasInflight() bool
	InflightCount() int
}
