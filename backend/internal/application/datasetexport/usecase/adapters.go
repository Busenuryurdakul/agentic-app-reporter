package usecase

import (
	"context"
	"errors"
	"strings"

	exportdto "github.com/masterfabric-go/masterfabric/internal/application/datasetexport/dto"
	generationUC "github.com/masterfabric-go/masterfabric/internal/application/generation/usecase"
	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/llm"
)

// GenerationContextRebuilder adapts WorkspaceContextBuilder to ContextRebuilder.
type GenerationContextRebuilder struct {
	Builder *generationUC.WorkspaceContextBuilder
}

// Rebuild implements ContextRebuilder.
func (a *GenerationContextRebuilder) Rebuild(
	ctx context.Context,
	workspaceID uuid.UUID,
	language string,
) (*generationUC.WorkspaceLLMContext, error) {
	if a == nil || a.Builder == nil {
		return nil, errors.New("workspace context builder is not configured")
	}
	return a.Builder.Build(ctx, workspaceID, generationUC.BuildContextOptions{
		LanguageOverride: language,
	})
}

// GenerationPromptAssembler adapts PromptBuilder to PromptAssembler.
type GenerationPromptAssembler struct {
	Builder *generationUC.PromptBuilder
}

// Build implements PromptAssembler.
func (a *GenerationPromptAssembler) Build(
	ctx *generationUC.WorkspaceLLMContext,
	documentType string,
) (llm.GenerateRequest, error) {
	if a == nil || a.Builder == nil {
		return llm.GenerateRequest{}, errors.New("prompt builder is not configured")
	}
	return a.Builder.Build(ctx, documentType)
}

// assistantSecretPatterns are coarse checks for hallucinated credentials in exported bodies.
var assistantSecretPatterns = []string{
	`"api_key":`,
	`api_key:`,
	`"apikey":`,
	`"password":`,
	`"secret":`,
	`"token":`,
	`Bearer `,
	`sk-`,
	`hf_`,
}

func containsAssistantSecretPattern(body string) bool {
	lower := strings.ToLower(body)
	for _, p := range assistantSecretPatterns {
		if strings.Contains(lower, strings.ToLower(p)) {
			return true
		}
	}
	return false
}

func containsSmokeDatasetMarker(parts ...string) bool {
	for _, part := range parts {
		if strings.Contains(part, exportdto.SmokeDatasetMarker) {
			return true
		}
	}
	return false
}
