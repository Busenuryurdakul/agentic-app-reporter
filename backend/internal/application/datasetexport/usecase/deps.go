package usecase

import (
	"context"

	"github.com/google/uuid"
	generationUC "github.com/masterfabric-go/masterfabric/internal/application/generation/usecase"
	"github.com/masterfabric-go/masterfabric/internal/domain/llm"
)

// ContextRebuilder rebuilds workspace LLM context at export time (same rules as generate).
type ContextRebuilder interface {
	Rebuild(ctx context.Context, workspaceID uuid.UUID, language string) (*generationUC.WorkspaceLLMContext, error)
}

// PromptAssembler builds provider-agnostic prompts for a document type.
type PromptAssembler interface {
	Build(ctx *generationUC.WorkspaceLLMContext, documentType string) (llm.GenerateRequest, error)
}
