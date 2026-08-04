package usecase

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/productspec"
	"github.com/masterfabric-go/masterfabric/internal/domain/llm"
	"github.com/masterfabric-go/masterfabric/internal/shared/telemetry"
)

const defaultPeftTestOrgID = "4eda8bd6-7bd3-474c-8e06-267d4a9d0fe8"

type structuredAttempt struct {
	Markdown     string
	Meta         productspec.GenerationMeta
	ProviderName string
	ModelName    string
	Gate         productspec.QualityGateResult
	UsedFallback bool
	FallbackReason string
}

func (uc *GenerateDocumentUseCase) isPeftTestOrg(orgID uuid.UUID) bool {
	if uc.peftTestOrgID == uuid.Nil {
		return false
	}
	return orgID == uc.peftTestOrgID
}

func (uc *GenerateDocumentUseCase) generateProductSpecStructured(
	ctx context.Context,
	orgID uuid.UUID,
	primary llm.LLMProvider,
	fallback llm.LLMProvider,
	prompt llm.GenerateRequest,
	language string,
) (*structuredAttempt, error) {
	attempt, err := uc.runStructuredAttempt(ctx, primary, prompt, language)
	if err == nil && uc.structuredAttemptAcceptable(attempt) {
		return attempt, nil
	}

	reason := structuredFailureReason(attempt, err)
	if fallback == nil || primary == fallback {
		if err != nil {
			return attempt, err
		}
		if attempt != nil {
			attempt.FallbackReason = reason
		}
		return attempt, errStructuredNotAcceptable(reason)
	}

	uc.logger.Info("peft adapter fallback to base model",
		"organization_id", orgID.String(),
		"reason", reason,
		"primary_provider", providerLabel(primary),
		"fallback_provider", providerLabel(fallback),
	)

	fbAttempt, fbErr := uc.runStructuredAttempt(ctx, fallback, prompt, language)
	if fbErr != nil {
		return attempt, fbErr
	}
	fbAttempt.UsedFallback = true
	fbAttempt.FallbackReason = reason
	if !uc.structuredAttemptAcceptable(fbAttempt) {
		return fbAttempt, errStructuredNotAcceptable(structuredFailureReason(fbAttempt, nil))
	}
	return fbAttempt, nil
}

func (uc *GenerateDocumentUseCase) runStructuredAttempt(
	ctx context.Context,
	provider llm.LLMProvider,
	prompt llm.GenerateRequest,
	language string,
) (*structuredAttempt, error) {
	start := time.Now()
	telemetry.IncLLMInflight(ctx)
	result, err := GenerateStructuredProductSpec(ctx, provider, prompt, language)
	duration := time.Since(start)
	telemetry.DecLLMInflight(ctx)
	status := "success"
	if err != nil {
		status = "error"
	}
	telemetry.RecordLLMGeneration(ctx, provider.Name(), status, duration.Seconds())

	attempt := &structuredAttempt{
		Meta:         productspec.GenerationMeta{},
		ProviderName: provider.Name(),
	}
	if result != nil {
		attempt.Markdown = result.Markdown
		attempt.Meta = result.Meta
	}
	if err != nil {
		return attempt, err
	}
	attempt.Gate = productspec.RunQualityGate(attempt.Markdown, attempt.Meta, 1200)
	return attempt, nil
}

func (uc *GenerateDocumentUseCase) structuredAttemptAcceptable(attempt *structuredAttempt) bool {
	if attempt == nil {
		return false
	}
	if strings.TrimSpace(attempt.Markdown) == "" {
		return false
	}
	if !attempt.Meta.StructuredOutputValid {
		return false
	}
	if !attempt.Meta.MarkdownRenderSucceeded {
		return false
	}
	if !attempt.Gate.Passed {
		return false
	}
	return true
}

func structuredFailureReason(attempt *structuredAttempt, err error) string {
	if err != nil {
		return "provider_error"
	}
	if attempt == nil {
		return "empty_result"
	}
	if strings.TrimSpace(attempt.Markdown) == "" {
		return "empty_markdown"
	}
	if !attempt.Meta.StructuredOutputValid {
		return "structured_validation_failed"
	}
	if attempt.Meta.StructuredRepairAttempts >= maxStructuredRepairAttempts {
		return "repair_limit_exceeded"
	}
	if !attempt.Gate.Passed {
		return "quality_gate_failed"
	}
	return "unknown"
}

func providerLabel(p llm.LLMProvider) string {
	if p == nil {
		return "none"
	}
	return p.Name()
}

func errStructuredNotAcceptable(reason string) error {
	return &structuredNotAcceptableError{reason: reason}
}

type structuredNotAcceptableError struct {
	reason string
}

func (e *structuredNotAcceptableError) Error() string {
	return "structured product spec not acceptable: " + e.reason
}

func parsePeftTestOrgID(raw string, logger *slog.Logger) uuid.UUID {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		raw = defaultPeftTestOrgID
	}
	id, err := uuid.Parse(raw)
	if err != nil {
		if logger != nil {
			logger.Warn("invalid PEFT_TEST_ORG_ID; structured adapter integration disabled", "value", raw)
		}
		return uuid.Nil
	}
	return id
}
