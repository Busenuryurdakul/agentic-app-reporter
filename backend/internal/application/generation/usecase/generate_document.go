package usecase

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/generation/dto"
	docModel "github.com/masterfabric-go/masterfabric/internal/domain/document/model"
	docRepo "github.com/masterfabric-go/masterfabric/internal/domain/document/repository"
	"github.com/masterfabric-go/masterfabric/internal/domain/llm"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
)

// GenerateDocumentUseCase builds workspace context, calls LLMProvider, and persists the document.
type GenerateDocumentUseCase struct {
	contextBuilder *WorkspaceContextBuilder
	promptBuilder  *PromptBuilder
	provider       llm.LLMProvider
	docRepo        docRepo.DocumentRepository
	gate           *GenerationGate
	llmEnabled     bool
	logger         *slog.Logger
}

// NewGenerateDocumentUseCase creates a GenerateDocumentUseCase.
func NewGenerateDocumentUseCase(
	contextBuilder *WorkspaceContextBuilder,
	promptBuilder *PromptBuilder,
	provider llm.LLMProvider,
	docRepo docRepo.DocumentRepository,
	gate *GenerationGate,
	llmEnabled bool,
	logger *slog.Logger,
) *GenerateDocumentUseCase {
	if logger == nil {
		logger = slog.Default()
	}
	if gate == nil {
		gate = NewGenerationGate()
	}
	return &GenerateDocumentUseCase{
		contextBuilder: contextBuilder,
		promptBuilder:  promptBuilder,
		provider:       provider,
		docRepo:        docRepo,
		gate:           gate,
		llmEnabled:     llmEnabled,
		logger:         logger,
	}
}

// Execute generates and stores a Markdown document for the workspace.
func (uc *GenerateDocumentUseCase) Execute(
	ctx context.Context,
	workspaceID uuid.UUID,
	req dto.GenerateDocumentRequest,
) (*dto.DocumentInfo, error) {
	if !uc.llmEnabled {
		return nil, domainErr.New(domainErr.ErrServiceUnavailable, "LLM is disabled", nil)
	}
	if uc.provider == nil {
		return nil, domainErr.New(domainErr.ErrServiceUnavailable, "LLM provider is not configured", nil)
	}
	if !uc.gate.TryBegin(workspaceID) {
		return nil, errGenerationInProgress()
	}
	defer uc.gate.End(workspaceID)

	wsCtx, err := uc.contextBuilder.Build(ctx, workspaceID, BuildContextOptions{
		LanguageOverride: req.Language,
	})
	if err != nil {
		return nil, err
	}

	prompt, err := uc.promptBuilder.Build(wsCtx)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to build prompt", err)
	}

	title := resolveDocumentTitle(req.Title, wsCtx.Language)
	var createdBy *uuid.UUID
	if uid, ok := middleware.UserIDFromContext(ctx); ok {
		createdBy = &uid
	}

	start := time.Now()
	genResp, err := uc.provider.Generate(ctx, prompt)
	duration := time.Since(start)
	// Log metadata only — never prompts, API keys, or full bodies.
	uc.logger.Info("llm generate completed",
		"provider", uc.provider.Name(),
		"workspace_id", workspaceID.String(),
		"duration_ms", duration.Milliseconds(),
		"ok", err == nil,
	)
	if err != nil {
		mapped := mapProviderGenerateError(err)
		uc.persistFailedDocument(ctx, wsCtx, title, createdBy, mapped)
		return nil, mapped
	}

	doc := &docModel.GeneratedDocument{
		ID:                uuid.New(),
		OrganizationID:    wsCtx.OrganizationID,
		WorkspaceID:       wsCtx.WorkspaceID,
		Title:             title,
		DocumentType:      docModel.DocumentTypeStudioMarkdown,
		Language:          wsCtx.Language,
		Status:            docModel.StatusSucceeded,
		MarkdownBody:      genResp.Content,
		ProviderName:      genResp.Provider,
		ModelName:         genResp.Model,
		SourceFingerprint: wsCtx.Fingerprint(),
		CreatedBy:         createdBy,
	}
	if doc.ProviderName == "" {
		doc.ProviderName = uc.provider.Name()
	}

	if err := uc.docRepo.Create(ctx, doc); err != nil {
		return nil, err
	}
	return toDocumentInfo(doc), nil
}

func (uc *GenerateDocumentUseCase) persistFailedDocument(
	ctx context.Context,
	wsCtx *WorkspaceLLMContext,
	title string,
	createdBy *uuid.UUID,
	mapped error,
) {
	safeMsg := "LLM provider failed to generate content"
	var de *domainErr.DomainError
	if errors.As(mapped, &de) && de.Message != "" {
		safeMsg = de.Message
	}

	doc := &docModel.GeneratedDocument{
		ID:                uuid.New(),
		OrganizationID:    wsCtx.OrganizationID,
		WorkspaceID:       wsCtx.WorkspaceID,
		Title:             title,
		DocumentType:      docModel.DocumentTypeStudioMarkdown,
		Language:          wsCtx.Language,
		Status:            docModel.StatusFailed,
		MarkdownBody:      "",
		ProviderName:      uc.provider.Name(),
		ErrorMessage:      safeMsg,
		SourceFingerprint: wsCtx.Fingerprint(),
		CreatedBy:         createdBy,
	}
	if err := uc.docRepo.Create(ctx, doc); err != nil {
		uc.logger.Error("failed to persist failed document row",
			"workspace_id", wsCtx.WorkspaceID.String(),
			"error", err,
		)
	}
}

func resolveDocumentTitle(reqTitle, language string) string {
	title := strings.TrimSpace(reqTitle)
	if title != "" {
		return title
	}
	if language == "en" {
		return "AI Development Configuration"
	}
	return "AI Geliştirme Yapılandırması"
}

func mapProviderGenerateError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return domainErr.New(domainErr.ErrServiceUnavailable, "LLM provider timed out or was canceled", err)
	}
	if errors.Is(err, domainErr.ErrRateLimited) {
		return err
	}
	if errors.Is(err, domainErr.ErrBadRequest) || errors.Is(err, domainErr.ErrValidation) {
		return domainErr.New(domainErr.ErrBadGateway, "LLM provider rejected the request", err)
	}
	return domainErr.New(domainErr.ErrBadGateway, "LLM provider failed to generate content", err)
}
