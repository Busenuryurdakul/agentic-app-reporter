package llm

import "context"

const (
	// ProviderMock is the registry name for the deterministic in-process mock provider.
	ProviderMock = "mock"
	// ProviderGemma is the registry name for the OpenAI-compatible Gemma HTTP adapter.
	ProviderGemma = "gemma"
)

// TokenUsage optionally reports token counts from a provider response.
// Callers must not log raw prompts; usage fields alone are safe to record.
type TokenUsage struct {
	PromptTokens     int `json:"prompt_tokens,omitempty"`
	CompletionTokens int `json:"completion_tokens,omitempty"`
	TotalTokens      int `json:"total_tokens,omitempty"`
}

// GenerateRequest is the provider-agnostic generation input.
// Application layers build prompts; providers must not assume a vendor schema.
type GenerateRequest struct {
	SystemPrompt string
	UserPrompt   string
	MaxTokens    int
}

// GenerateResponse is the provider-agnostic generation output.
type GenerateResponse struct {
	Content      string
	Provider     string
	Model        string
	FinishReason string
	Usage        TokenUsage
}

// ProviderHealth is the result of a provider readiness probe.
type ProviderHealth struct {
	Provider string
	Healthy  bool
	Message  string
}

// LLMProvider is the port every concrete LLM adapter must implement.
// Business logic depends only on this interface.
type LLMProvider interface {
	Name() string
	Generate(ctx context.Context, req GenerateRequest) (GenerateResponse, error)
	Health(ctx context.Context) (ProviderHealth, error)
}
