package usecase

import (
	"context"
	"sync"

	"github.com/google/uuid"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// GenerationGate prevents overlapping generate/regenerate calls for the same workspace.
// In-process only (single API instance). Not a distributed lock.
type GenerationGate struct {
	mu       sync.Mutex
	inflight map[uuid.UUID]struct{}
}

// NewGenerationGate creates a GenerationGate.
func NewGenerationGate() *GenerationGate {
	return &GenerationGate{inflight: make(map[uuid.UUID]struct{})}
}

// TryBegin marks the workspace as busy. Returns false if already generating.
func (g *GenerationGate) TryBegin(_ context.Context, workspaceID uuid.UUID) (bool, error) {
	if g == nil {
		return true, nil
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	if _, ok := g.inflight[workspaceID]; ok {
		return false, nil
	}
	g.inflight[workspaceID] = struct{}{}
	return true, nil
}

// End clears the in-flight mark for the workspace.
func (g *GenerationGate) End(_ context.Context, workspaceID uuid.UUID) {
	if g == nil {
		return
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	delete(g.inflight, workspaceID)
}

// HasInflight reports whether this instance is running any generation.
func (g *GenerationGate) HasInflight() bool {
	if g == nil {
		return false
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	return len(g.inflight) > 0
}

// InflightCount returns the number of in-flight generations on this instance.
func (g *GenerationGate) InflightCount() int {
	if g == nil {
		return 0
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	return len(g.inflight)
}

func errGenerationInProgress() error {
	return domainErr.New(domainErr.ErrConflict, "a document is already being generated for this workspace", nil)
}
