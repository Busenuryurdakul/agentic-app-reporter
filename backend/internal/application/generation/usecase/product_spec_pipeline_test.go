package usecase_test

import (
	"context"
	"strings"
	"testing"

	"github.com/masterfabric-go/masterfabric/internal/application/generation/usecase"
	docModel "github.com/masterfabric-go/masterfabric/internal/domain/document/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/productspec"
	"github.com/masterfabric-go/masterfabric/internal/domain/llm"
	"github.com/masterfabric-go/masterfabric/internal/infrastructure/llm/mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateStructuredProductSpec_MockProvider(t *testing.T) {
	provider := mock.New()
	prompt := llm.GenerateRequest{
		SystemPrompt: "json",
		UserPrompt:   "context",
		MaxTokens:    4096,
		JSONMode:     true,
	}
	result, err := usecase.GenerateStructuredProductSpec(context.Background(), provider, prompt, "tr")
	require.NoError(t, err)
	assert.True(t, result.Meta.StructuredOutputValid)
	assert.True(t, result.Meta.MarkdownRenderSucceeded)
	assert.True(t, strings.HasPrefix(result.Markdown, productspec.StructuredMarkdownPrefix))
}

func TestGenerateStructuredProductSpec_RepairAttemptsCapped(t *testing.T) {
	provider := &brokenThenFixedProvider{}
	prompt := llm.GenerateRequest{SystemPrompt: "s", UserPrompt: "u", MaxTokens: 1024, JSONMode: true}
	result, err := usecase.GenerateStructuredProductSpec(context.Background(), provider, prompt, "tr")
	require.NoError(t, err)
	assert.True(t, result.Meta.StructuredOutputValid)
	assert.Equal(t, 1, result.Meta.StructuredRepairAttempts)
}

func TestGenerateStructuredProductSpec_FailsAfterTwoRepairs(t *testing.T) {
	provider := &alwaysInvalidProvider{}
	prompt := llm.GenerateRequest{SystemPrompt: "s", UserPrompt: "u", MaxTokens: 1024, JSONMode: true}
	_, err := usecase.GenerateStructuredProductSpec(context.Background(), provider, prompt, "tr")
	require.Error(t, err)
}

func TestPromptBuilder_ProductSpec_MarkdownMode(t *testing.T) {
	req, err := usecase.NewPromptBuilder().Build(&usecase.WorkspaceLLMContext{
		WorkspaceName: "Demo", WorkspaceSlug: "demo", Language: "tr",
		QuestionnaireSet: "studio-default",
		Profile:          usecase.ProfileSnapshot{ProjectName: "Studio"},
	}, docModel.DocumentTypeProductSpec)
	require.NoError(t, err)
	assert.False(t, req.JSONMode)
	assert.Contains(t, req.SystemPrompt, "Markdown")
	assert.Contains(t, req.UserPrompt, "## 1. Özet ve hedef kullanıcı")
}

type brokenThenFixedProvider struct{ calls int }

func (p *brokenThenFixedProvider) Name() string { return "broken-then-fixed" }
func (p *brokenThenFixedProvider) Health(ctx context.Context) (llm.ProviderHealth, error) {
	return llm.ProviderHealth{Provider: p.Name(), Healthy: true}, nil
}
func (p *brokenThenFixedProvider) Generate(ctx context.Context, req llm.GenerateRequest) (llm.GenerateResponse, error) {
	p.calls++
	if p.calls == 1 {
		return llm.GenerateResponse{Content: `{"summary":{"project_name":"X"}}`, Provider: p.Name()}, nil
	}
	return llm.GenerateResponse{Content: productspec.SampleValidSpecJSON(), Provider: p.Name()}, nil
}

type alwaysInvalidProvider struct{}

func (p *alwaysInvalidProvider) Name() string { return "always-invalid" }
func (p *alwaysInvalidProvider) Health(ctx context.Context) (llm.ProviderHealth, error) {
	return llm.ProviderHealth{Provider: p.Name(), Healthy: true}, nil
}
func (p *alwaysInvalidProvider) Generate(ctx context.Context, req llm.GenerateRequest) (llm.GenerateResponse, error) {
	return llm.GenerateResponse{Content: `{"summary":{"project_name":""}}`, Provider: p.Name()}, nil
}
