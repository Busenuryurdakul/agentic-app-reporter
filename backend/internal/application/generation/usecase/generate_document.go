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
	"github.com/masterfabric-go/masterfabric/internal/shared/telemetry"
)

// ProviderResolver resolves the LLM provider for an organization before generation.
type ProviderResolver interface {
	Resolve(ctx context.Context, orgID uuid.UUID) (llm.LLMProvider, error)
}

// GenerateDocumentUseCase builds workspace context, calls LLMProvider, and persists the document.
type GenerateDocumentUseCase struct {
	contextBuilder     *WorkspaceContextBuilder
	promptBuilder      *PromptBuilder
	providerResolver   ProviderResolver
	defaultProvider    llm.LLMProvider
	docRepo            docRepo.DocumentRepository
	gate               GenerationLocker
	llmEnabled         bool
	logger             *slog.Logger
}

// NewGenerateDocumentUseCase creates a GenerateDocumentUseCase.
func NewGenerateDocumentUseCase(
	contextBuilder *WorkspaceContextBuilder,
	promptBuilder *PromptBuilder,
	providerResolver ProviderResolver,
	defaultProvider llm.LLMProvider,
	docRepo docRepo.DocumentRepository,
	gate GenerationLocker,
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
		contextBuilder:   contextBuilder,
		promptBuilder:    promptBuilder,
		providerResolver: providerResolver,
		defaultProvider:  defaultProvider,
		docRepo:          docRepo,
		gate:             gate,
		llmEnabled:       llmEnabled,
		logger:           logger,
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
	if uc.providerResolver == nil && uc.defaultProvider == nil {
		return nil, domainErr.New(domainErr.ErrServiceUnavailable, "LLM provider is not configured", nil)
	}
	acquired, err := uc.gate.TryBegin(ctx, workspaceID)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to acquire generation lock", err)
	}
	if !acquired {
		return nil, errGenerationInProgress()
	}
	defer uc.gate.End(ctx, workspaceID)

	if req.DocumentType != "" {
		if err := docModel.ValidateDocumentType(req.DocumentType); err != nil {
			return nil, domainErr.New(domainErr.ErrValidation, err.Error(), err)
		}
	}
	docType := docModel.NormalizeDocumentType(req.DocumentType)

	wsCtx, err := uc.contextBuilder.Build(ctx, workspaceID, BuildContextOptions{
		LanguageOverride: req.Language,
	})
	if err != nil {
		return nil, err
	}

	provider, err := uc.resolveProvider(ctx, wsCtx.OrganizationID)
	if err != nil {
		return nil, err
	}

	prompt, err := uc.promptBuilder.Build(wsCtx, docType)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to build prompt", err)
	}

	answeredCount := 0
	for _, a := range wsCtx.Answers {
		if a.Answered {
			answeredCount++
		}
	}
	uc.logger.Info("llm generate prompt metrics",
		"organization_id", wsCtx.OrganizationID.String(),
		"workspace_id", workspaceID.String(),
		"document_type", docType,
		"system_prompt_chars", len(prompt.SystemPrompt),
		"user_prompt_chars", len(prompt.UserPrompt),
		"total_prompt_chars", len(prompt.SystemPrompt)+len(prompt.UserPrompt),
		"question_count", len(wsCtx.Answers),
		"answer_count", answeredCount,
	)

	title := resolveDocumentTitle(req.Title, wsCtx.Language, docType)
	var createdBy *uuid.UUID
	if uid, ok := middleware.UserIDFromContext(ctx); ok {
		createdBy = &uid
	}

	start := time.Now()
	telemetry.IncLLMInflight(ctx)
	genResp, err := provider.Generate(ctx, prompt)
	duration := time.Since(start)
	telemetry.DecLLMInflight(ctx)
	status := "success"
	if err != nil {
		status = "error"
	}
	telemetry.RecordLLMGeneration(ctx, provider.Name(), status, duration.Seconds())
	// Log metadata only — never prompts, API keys, or full bodies.
	uc.logger.Info("llm generate completed",
		"provider", provider.Name(),
		"organization_id", wsCtx.OrganizationID.String(),
		"workspace_id", workspaceID.String(),
		"duration_ms", duration.Milliseconds(),
		"ok", err == nil,
	)
	if err != nil {
		mapped := mapProviderGenerateError(err)
		uc.persistFailedDocument(ctx, wsCtx, title, docType, createdBy, provider, mapped)
		return nil, mapped
	}

	doc := &docModel.GeneratedDocument{
		ID:                uuid.New(),
		OrganizationID:    wsCtx.OrganizationID,
		WorkspaceID:       wsCtx.WorkspaceID,
		Title:             title,
		DocumentType:      docType,
		Language:          wsCtx.Language,
		Status:            docModel.StatusSucceeded,
		MarkdownBody:      genResp.Content,
		ProviderName:      genResp.Provider,
		ModelName:         genResp.Model,
		SourceFingerprint: wsCtx.Fingerprint(),
		ApprovalStatus:    docModel.ApprovalDraft,
		CreatedBy:         createdBy,
	}
	if doc.ProviderName == "" {
		doc.ProviderName = provider.Name()
	}

	if err := uc.docRepo.Create(ctx, doc); err != nil {
		return nil, err
	}
	return toDocumentInfo(doc), nil
}

func (uc *GenerateDocumentUseCase) resolveProvider(ctx context.Context, orgID uuid.UUID) (llm.LLMProvider, error) {
	if uc.providerResolver != nil {
		return uc.providerResolver.Resolve(ctx, orgID)
	}
	if uc.defaultProvider != nil {
		return uc.defaultProvider, nil
	}
	return nil, domainErr.New(domainErr.ErrServiceUnavailable, "LLM provider is not configured", nil)
}

func (uc *GenerateDocumentUseCase) persistFailedDocument(
	ctx context.Context,
	wsCtx *WorkspaceLLMContext,
	title string,
	documentType string,
	createdBy *uuid.UUID,
	provider llm.LLMProvider,
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
		DocumentType:      documentType,
		Language:          wsCtx.Language,
		Status:            docModel.StatusFailed,
		MarkdownBody:      "",
		ProviderName:      provider.Name(),
		ErrorMessage:      safeMsg,
		SourceFingerprint: wsCtx.Fingerprint(),
		ApprovalStatus:    docModel.ApprovalDraft,
		CreatedBy:         createdBy,
	}
	if err := uc.docRepo.Create(ctx, doc); err != nil {
		uc.logger.Error("failed to persist failed document row",
			"workspace_id", wsCtx.WorkspaceID.String(),
			"error", err,
		)
	}
}

func resolveDocumentTitle(reqTitle, language, documentType string) string {
	title := strings.TrimSpace(reqTitle)
	if title != "" {
		return title
	}
	return docModel.DefaultDocumentTitle(documentType, language)
}

func mapProviderGenerateError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return domainErr.New(domainErr.ErrServiceUnavailable, "LLM provider timed out or was canceled", err)
	}

	var de *domainErr.DomainError
	if errors.As(err, &de) && de.ProviderCode != "" {
		return domainErr.NewWithProvider(
			mapProviderKind(de),
			clientMessageForProviderCode(de.ProviderCode),
			de.ProviderCode,
			err,
		)
	}

	if errors.Is(err, domainErr.ErrRateLimited) {
		return domainErr.NewWithProvider(
			domainErr.ErrRateLimited,
			clientMessageForProviderCode(domainErr.ProviderCodeRateLimited),
			domainErr.ProviderCodeRateLimited,
			err,
		)
	}
	if errors.Is(err, domainErr.ErrBadRequest) || errors.Is(err, domainErr.ErrValidation) {
		return domainErr.NewWithProvider(
			domainErr.ErrBadGateway,
			clientMessageForProviderCode(domainErr.ProviderCodeInvalidRequest),
			domainErr.ProviderCodeInvalidRequest,
			err,
		)
	}
	return domainErr.New(domainErr.ErrBadGateway, "LLM provider failed to generate content", err)
}

func mapProviderKind(de *domainErr.DomainError) error {
	if de != nil && de.ProviderCode == domainErr.ProviderCodeRateLimited {
		return domainErr.ErrRateLimited
	}
	return domainErr.ErrBadGateway
}

func clientMessageForProviderCode(code string) string {
	switch code {
	case domainErr.ProviderCodeInvalidRequest:
		return "LLM provider rejected the request (invalid request or context too long)"
	case domainErr.ProviderCodeContextLength:
		return "LLM provider rejected the request (context length exceeded)"
	case domainErr.ProviderCodeAuth:
		return "LLM provider authentication or model access failed"
	case domainErr.ProviderCodeNotFound:
		return "LLM provider model or route not found"
	case domainErr.ProviderCodeRateLimited:
		return "LLM provider rate limit or quota exceeded"
	case domainErr.ProviderCodeQuota:
		return "LLM provider billing quota exceeded"
	case domainErr.ProviderCodeUpstream:
		return "LLM provider is temporarily unavailable"
	default:
		return "LLM provider failed to generate content"
	}
}
