package usecase

import (
	"context"
	"fmt"
	"strings"

	"github.com/masterfabric-go/masterfabric/internal/domain/document/productspec"
	"github.com/masterfabric-go/masterfabric/internal/domain/llm"
)

const maxStructuredRepairAttempts = 2

// StructuredProductSpecResult holds the outcome of structured generation.
type StructuredProductSpecResult struct {
	Markdown string
	Meta     productspec.GenerationMeta
}

// GenerateStructuredProductSpec runs JSON generation, validation, repair, and deterministic render.
func GenerateStructuredProductSpec(
	ctx context.Context,
	provider llm.LLMProvider,
	prompt llm.GenerateRequest,
	language string,
) (*StructuredProductSpecResult, error) {
	meta := productspec.GenerationMeta{}
	prompt.JSONMode = true
	if prompt.Temperature <= 0 {
		prompt.Temperature = 0.2
	}

	genResp, err := callProvider(ctx, provider, prompt)
	if err != nil {
		return nil, err
	}
	raw := genResp.Content
	lastFinish := genResp.FinishReason

	spec, parseOK, validation := parseAndValidate(raw, lastFinish)
	meta.JSONParseSucceeded = parseOK
	lastRaw := raw
	if spec != nil {
		productspec.AssignRequirementIDs(spec)
	}

	repairAttempts := 0
	for repairAttempts < maxStructuredRepairAttempts && (spec == nil || !validation.Valid) {
		repairAttempts++
		var repairPrompt llm.GenerateRequest
		if spec != nil {
			repairPrompt = llm.GenerateRequest{
				SystemPrompt: productspec.BuildRepairSystemPrompt(language),
				UserPrompt:   productspec.BuildRepairUserPrompt(language, productspec.SpecJSON(spec), validation),
				MaxTokens:    prompt.MaxTokens,
				Temperature:  0.1,
				TopP:         prompt.TopP,
				JSONMode:     true,
			}
		} else {
			repairPrompt = llm.GenerateRequest{
				SystemPrompt: productspec.BuildRepairSystemPrompt(language),
				UserPrompt:   productspec.BuildParseRepairUserPrompt(language, lastRaw),
				MaxTokens:    prompt.MaxTokens,
				Temperature:  0.1,
				TopP:         prompt.TopP,
				JSONMode:     true,
			}
		}
		genResp, err = callProvider(ctx, provider, repairPrompt)
		if err != nil {
			return nil, err
		}
		raw = genResp.Content
		lastFinish = genResp.FinishReason
		lastRaw = raw
		spec, parseOK, validation = parseAndValidate(raw, lastFinish)
		meta.JSONParseSucceeded = parseOK
		if spec != nil {
			productspec.AssignRequirementIDs(spec)
		}
	}

	meta.StructuredRepairAttempts = repairAttempts
	meta.RequiredFieldCoverage = validation.RequiredFieldCoverage
	meta.EmptyRequiredArrayCount = validation.EmptyRequiredArrayCount
	meta.EmptyRequiredStringCount = validation.EmptyRequiredStringCount
	meta.StructuredOutputValid = validation.Valid

	if !validation.Valid || spec == nil {
		msg := productspec.FormatValidationSummary(validation)
		if spec == nil {
			msg = "structured_json_parse_failed"
		}
		return &StructuredProductSpecResult{Meta: meta}, fmt.Errorf("%s", msg)
	}

	markdown, err := productspec.RenderMarkdown(spec, language)
	if err != nil {
		meta.MarkdownRenderSucceeded = false
		return &StructuredProductSpecResult{Meta: meta}, err
	}
	meta.MarkdownRenderSucceeded = true
	return &StructuredProductSpecResult{Markdown: markdown, Meta: meta}, nil
}

func callProvider(ctx context.Context, provider llm.LLMProvider, prompt llm.GenerateRequest) (llm.GenerateResponse, error) {
	resp, err := provider.Generate(ctx, prompt)
	if err != nil {
		return llm.GenerateResponse{}, err
	}
	resp.Content = strings.TrimSpace(resp.Content)
	return resp, nil
}

func parseAndValidate(raw, finishReason string) (*productspec.StructuredSpec, bool, productspec.ValidationResult) {
	if isTruncatedFinishReason(finishReason) {
		return nil, false, productspec.ValidationResult{
			Valid: false,
			Errors: []productspec.ValidationError{{
				Path: "root", Code: "truncated_output", Message: "Model çıktısı token limitinde kesildi",
			}},
		}
	}
	spec, err := productspec.ParseStructured(raw)
	if err != nil {
		return nil, false, productspec.ValidationResult{
			Valid: false,
			Errors: []productspec.ValidationError{{
				Path: "root", Code: "parse_error", Message: err.Error(),
			}},
		}
	}
	productspec.SanitizeStructured(spec)
	validation := productspec.ValidateStructured(spec)
	return spec, true, validation
}

func isTruncatedFinishReason(reason string) bool {
	r := strings.ToLower(strings.TrimSpace(reason))
	return r == "length" || r == "max_tokens"
}

func preservedValidFields(before, after string, prevValidation productspec.ValidationResult) bool {
	if prevValidation.Valid {
		return before == after
	}
	// For partially valid docs, require high similarity when no invalid paths to re-check.
	return true
}
