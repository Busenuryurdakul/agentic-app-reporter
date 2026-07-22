package usecase

import (
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
func (g *GenerationGate) TryBegin(workspaceID uuid.UUID) bool {
	if g == nil {
		return true
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	if _, ok := g.inflight[workspaceID]; ok {
		return false
	}
	g.inflight[workspaceID] = struct{}{}
	return true
}

// End clears the in-flight mark for the workspace.
func (g *GenerationGate) End(workspaceID uuid.UUID) {
	if g == nil {
		return
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	delete(g.inflight, workspaceID)
}

func errGenerationInProgress() error {
	return domainErr.New(domainErr.ErrConflict, "a document is already being generated for this workspace", nil)
}
