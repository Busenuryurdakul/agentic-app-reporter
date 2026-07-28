package ollama

import (
	"context"
	"strings"

	"github.com/masterfabric-go/masterfabric/internal/domain/llm"
	"github.com/masterfabric-go/masterfabric/internal/infrastructure/llm/gemma"
)

const (
	// DefaultBaseURL is Ollama's OpenAI-compatible API (ollama serve).
	DefaultBaseURL = "http://127.0.0.1:11434/v1"
	// DefaultModel is used when LLM_MODEL is unset (pull with: ollama pull llama3.2).
	DefaultModel = "llama3.2"
)

// Client talks to a local Ollama instance via its OpenAI-compatible REST API.
// Implementation reuses the gemma HTTP adapter; only the provider name differs.
type Client struct {
	inner llm.LLMProvider
}

// Config configures an Ollama HTTP client.
type Config struct {
	BaseURL        string
	APIKey         string
	Model          string
	TimeoutSeconds int
}

// New creates an Ollama provider client.
func New(cfg Config) (*Client, error) {
	base := strings.TrimRight(strings.TrimSpace(cfg.BaseURL), "/")
	if base == "" {
		base = strings.TrimRight(DefaultBaseURL, "/")
	}
	model := strings.TrimSpace(cfg.Model)
	if model == "" {
		model = DefaultModel
	}

	inner, err := gemma.New(gemma.Config{
		BaseURL:            base,
		APIKey:             strings.TrimSpace(cfg.APIKey),
		Model:              model,
		TimeoutSeconds:     cfg.TimeoutSeconds,
		ProviderName:       llm.ProviderOllama,
		UseNativeChatRoles: true,
		IncludeStreamFalse: true,
	})
	if err != nil {
		return nil, err
	}
	return &Client{inner: inner}, nil
}

// Name implements llm.LLMProvider.
func (c *Client) Name() string {
	return llm.ProviderOllama
}

// Generate implements llm.LLMProvider.
func (c *Client) Generate(ctx context.Context, req llm.GenerateRequest) (llm.GenerateResponse, error) {
	resp, err := c.inner.Generate(ctx, req)
	if err != nil {
		return resp, err
	}
	resp.Provider = llm.ProviderOllama
	return resp, nil
}

// Health implements llm.LLMProvider.
func (c *Client) Health(ctx context.Context) (llm.ProviderHealth, error) {
	h, err := c.inner.Health(ctx)
	if err != nil {
		return h, err
	}
	h.Provider = llm.ProviderOllama
	return h, nil
}

var _ llm.LLMProvider = (*Client)(nil)
