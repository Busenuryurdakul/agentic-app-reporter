package gemma

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/masterfabric-go/masterfabric/internal/domain/llm"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

const (
	defaultModel       = "gemma"
	maxErrorBodyBytes  = 512
	defaultHTTPTimeout = 60 * time.Second
)

// Client talks to an OpenAI-compatible Chat Completions API that serves Gemma
// (Ollama, vLLM, Google OpenAI-compatible proxies, etc.).
// Business logic must depend only on llm.LLMProvider — never on this package.
type Client struct {
	baseURL    string
	apiKey     string
	model      string
	httpClient *http.Client
}

// Config configures a Gemma HTTP client.
type Config struct {
	BaseURL    string
	APIKey     string
	Model      string
	HTTPClient *http.Client
}

// New creates a Gemma provider client. BaseURL is required (e.g. http://localhost:11434/v1).
func New(cfg Config) (*Client, error) {
	base := strings.TrimRight(strings.TrimSpace(cfg.BaseURL), "/")
	if base == "" {
		return nil, fmt.Errorf("gemma provider requires LLM_BASE_URL")
	}
	model := strings.TrimSpace(cfg.Model)
	if model == "" {
		model = defaultModel
	}
	httpClient := cfg.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{Timeout: defaultHTTPTimeout}
	}
	return &Client{
		baseURL:    base,
		apiKey:     strings.TrimSpace(cfg.APIKey),
		model:      model,
		httpClient: httpClient,
	}, nil
}

// Name implements llm.LLMProvider.
func (c *Client) Name() string {
	return llm.ProviderGemma
}

type chatRequest struct {
	Model     string        `json:"model"`
	Messages  []chatMessage `json:"messages"`
	MaxTokens int           `json:"max_tokens,omitempty"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatResponse struct {
	Model   string `json:"model"`
	Choices []struct {
		FinishReason string `json:"finish_reason"`
		Message      struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error"`
}

// Generate implements llm.LLMProvider.
func (c *Client) Generate(ctx context.Context, req llm.GenerateRequest) (llm.GenerateResponse, error) {
	if err := ctx.Err(); err != nil {
		return llm.GenerateResponse{}, err
	}

	messages := buildChatMessages(req)

	body := chatRequest{
		Model:     c.model,
		Messages:  messages,
		MaxTokens: req.MaxTokens,
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return llm.GenerateResponse{}, domainErr.New(domainErr.ErrInternal, "failed to encode gemma request", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(payload))
	if err != nil {
		return llm.GenerateResponse{}, domainErr.New(domainErr.ErrInternal, "failed to create gemma request", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	c.setAuth(httpReq)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		if ctx.Err() != nil {
			return llm.GenerateResponse{}, ctx.Err()
		}
		return llm.GenerateResponse{}, domainErr.New(domainErr.ErrInternal, "gemma provider request failed", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if err != nil {
		return llm.GenerateResponse{}, domainErr.New(domainErr.ErrInternal, "failed to read gemma response", err)
	}

	if resp.StatusCode == http.StatusTooManyRequests {
		return llm.GenerateResponse{}, domainErr.New(domainErr.ErrRateLimited, "gemma provider rate limited", nil)
	}
	if resp.StatusCode >= 500 {
		return llm.GenerateResponse{}, domainErr.New(
			domainErr.ErrInternal,
			fmt.Sprintf("gemma provider unavailable (HTTP %d)", resp.StatusCode),
			fmt.Errorf("status=%d body=%s", resp.StatusCode, truncateForError(raw)),
		)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return llm.GenerateResponse{}, domainErr.New(
			domainErr.ErrBadRequest,
			fmt.Sprintf("gemma provider rejected request (HTTP %d)", resp.StatusCode),
			fmt.Errorf("status=%d body=%s", resp.StatusCode, truncateForError(raw)),
		)
	}

	var parsed chatResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return llm.GenerateResponse{}, domainErr.New(domainErr.ErrInternal, "invalid gemma response JSON", err)
	}
	if parsed.Error != nil && parsed.Error.Message != "" {
		return llm.GenerateResponse{}, domainErr.New(domainErr.ErrInternal, "gemma provider error", fmt.Errorf("%s", parsed.Error.Message))
	}
	if len(parsed.Choices) == 0 || strings.TrimSpace(parsed.Choices[0].Message.Content) == "" {
		return llm.GenerateResponse{}, domainErr.New(domainErr.ErrInternal, "gemma provider returned empty content", nil)
	}

	modelName := parsed.Model
	if modelName == "" {
		modelName = c.model
	}

	return llm.GenerateResponse{
		Content:      parsed.Choices[0].Message.Content,
		Provider:     c.Name(),
		Model:        modelName,
		FinishReason: parsed.Choices[0].FinishReason,
		Usage: llm.TokenUsage{
			PromptTokens:     parsed.Usage.PromptTokens,
			CompletionTokens: parsed.Usage.CompletionTokens,
			TotalTokens:      parsed.Usage.TotalTokens,
		},
	}, nil
}

// Health implements llm.LLMProvider via GET /models (OpenAI-compatible).
func (c *Client) Health(ctx context.Context) (llm.ProviderHealth, error) {
	if err := ctx.Err(); err != nil {
		return llm.ProviderHealth{}, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/models", nil)
	if err != nil {
		return llm.ProviderHealth{}, domainErr.New(domainErr.ErrInternal, "failed to create gemma health request", err)
	}
	c.setAuth(httpReq)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		if ctx.Err() != nil {
			return llm.ProviderHealth{}, ctx.Err()
		}
		return llm.ProviderHealth{
			Provider: c.Name(),
			Healthy:  false,
			Message:  "gemma provider unreachable",
		}, nil
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, maxErrorBodyBytes))

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return llm.ProviderHealth{Provider: c.Name(), Healthy: true, Message: "ok"}, nil
	}
	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return llm.ProviderHealth{
			Provider: c.Name(),
			Healthy:  false,
			Message:  "gemma provider authentication failed",
		}, nil
	}
	return llm.ProviderHealth{
		Provider: c.Name(),
		Healthy:  false,
		Message:  fmt.Sprintf("gemma provider unhealthy (HTTP %d)", resp.StatusCode),
	}, nil
}

func buildChatMessages(req llm.GenerateRequest) []chatMessage {
	user := strings.TrimSpace(req.UserPrompt)
	system := strings.TrimSpace(req.SystemPrompt)
	if system != "" {
		// Hugging Face Inference router and some OpenAI-compatible hosts reject role=system.
		user = system + "\n\n" + user
	}
	return []chatMessage{{Role: "user", Content: user}}
}

func (c *Client) setAuth(req *http.Request) {
	if c.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.apiKey)
	}
}

func truncateForError(b []byte) string {
	s := strings.TrimSpace(string(b))
	s = strings.ReplaceAll(s, "\n", " ")
	if len(s) > maxErrorBodyBytes {
		return s[:maxErrorBodyBytes] + "…"
	}
	return s
}

var _ llm.LLMProvider = (*Client)(nil)
