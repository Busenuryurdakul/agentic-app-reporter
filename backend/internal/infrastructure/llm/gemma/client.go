package gemma

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/masterfabric-go/masterfabric/internal/domain/llm"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

const (
	defaultModel              = "gemma"
	maxErrorBodyBytes         = 512
	defaultHTTPTimeout        = 60 * time.Second
	hfMaxCompletionTokens     = 6144
)

// Client talks to an OpenAI-compatible Chat Completions API that serves Gemma
// (Ollama, vLLM, Google OpenAI-compatible proxies, etc.).
// Business logic must depend only on llm.LLMProvider — never on this package.
type Client struct {
	baseURL              string
	apiKey               string
	model                string
	providerName         string
	useNativeChatRoles   bool
	includeStreamFalse   bool
	httpClient           *http.Client
}

// Config configures a Gemma HTTP client.
type Config struct {
	BaseURL        string
	APIKey         string
	Model          string
	TimeoutSeconds int
	HTTPClient     *http.Client
	// ProviderName labels user-facing errors (defaults to "gemma"; Ollama passes "ollama").
	ProviderName string
	// UseNativeChatRoles sends separate system/user messages (Ollama-compatible).
	UseNativeChatRoles bool
	// IncludeStreamFalse sets stream=false on chat completion requests (Ollama OpenAI API).
	IncludeStreamFalse bool
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
	providerName := strings.TrimSpace(cfg.ProviderName)
	if providerName == "" {
		providerName = llm.ProviderGemma
	}
	httpClient := cfg.HTTPClient
	if httpClient == nil {
		timeout := defaultHTTPTimeout
		if cfg.TimeoutSeconds > 0 {
			timeout = time.Duration(cfg.TimeoutSeconds) * time.Second
		}
		httpClient = &http.Client{Timeout: timeout}
	}
	return &Client{
		baseURL:            base,
		apiKey:             strings.TrimSpace(cfg.APIKey),
		model:              model,
		providerName:       providerName,
		useNativeChatRoles: cfg.UseNativeChatRoles,
		includeStreamFalse: cfg.IncludeStreamFalse,
		httpClient:         httpClient,
	}, nil
}

// Name implements llm.LLMProvider.
func (c *Client) Name() string {
	return c.providerName
}

type chatRequest struct {
	Model          string          `json:"model"`
	Messages       []chatMessage   `json:"messages"`
	MaxTokens      int             `json:"max_tokens,omitempty"`
	Temperature    *float64        `json:"temperature,omitempty"`
	TopP           *float64        `json:"top_p,omitempty"`
	Stream         *bool           `json:"stream,omitempty"`
	ResponseFormat *responseFormat `json:"response_format,omitempty"`
}

type responseFormat struct {
	Type string `json:"type"`
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
	if strings.TrimSpace(c.model) == "" {
		return llm.GenerateResponse{}, domainErr.New(domainErr.ErrValidation, "LLM model is not configured", nil)
	}

	messages := buildChatMessages(req, c.useNativeChatRoles)
	if len(messages) == 0 || strings.TrimSpace(messages[len(messages)-1].Content) == "" {
		return llm.GenerateResponse{}, domainErr.New(domainErr.ErrValidation, "LLM prompt is empty", nil)
	}

	body := chatRequest{
		Model:     c.model,
		Messages:  messages,
		MaxTokens: c.effectiveMaxTokens(req.MaxTokens),
	}
	if req.Temperature > 0 {
		t := req.Temperature
		body.Temperature = &t
	}
	if req.TopP > 0 {
		p := req.TopP
		body.TopP = &p
	}
	if c.includeStreamFalse {
		stream := false
		body.Stream = &stream
	}
	if req.JSONMode {
		body.ResponseFormat = &responseFormat{Type: "json_object"}
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return llm.GenerateResponse{}, domainErr.New(domainErr.ErrInternal, "failed to encode llm request", err)
	}

	endpointPath := "/chat/completions"
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+endpointPath, bytes.NewReader(payload))
	if err != nil {
		return llm.GenerateResponse{}, domainErr.New(domainErr.ErrInternal, "failed to create llm request", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	c.setAuth(httpReq)

	start := time.Now()
	resp, err := c.httpClient.Do(httpReq)
	duration := time.Since(start)
	if err != nil {
		if ctx.Err() != nil {
			return llm.GenerateResponse{}, ctx.Err()
		}
		return llm.GenerateResponse{}, domainErr.New(domainErr.ErrInternal, c.providerName+" provider request failed", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if err != nil {
		return llm.GenerateResponse{}, domainErr.New(domainErr.ErrInternal, "failed to read llm response", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return llm.GenerateResponse{}, c.logAndWrapChatCompletionError(endpointPath, resp.StatusCode, raw, duration)
	}

	var parsed chatResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return llm.GenerateResponse{}, domainErr.New(domainErr.ErrInternal, "invalid gemma response JSON", err)
	}
	if parsed.Error != nil && parsed.Error.Message != "" {
		summary := sanitizeResponseBody([]byte(parsed.Error.Message))
		slog.Error("llm provider chat completion failed",
			"provider", c.providerName,
			"http_status", resp.StatusCode,
			"endpoint_path", endpointPath,
			"provider_error_code", domainErr.ProviderCodeUpstream,
			"response_body_summary", summary,
			"model", c.model,
			"base_url_host", config.SanitizedLLMBaseURLHost(c.baseURL),
			"duration_ms", duration.Milliseconds(),
		)
		return llm.GenerateResponse{}, domainErr.NewWithProvider(
			domainErr.ErrInternal,
			c.providerName+" provider returned an error payload",
			domainErr.ProviderCodeUpstream,
			fmt.Errorf("provider_error_message=%s", summary),
		)
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

	endpointPath := "/models"
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+endpointPath, nil)
	if err != nil {
		return llm.ProviderHealth{}, domainErr.New(domainErr.ErrInternal, "failed to create llm health request", err)
	}
	c.setAuth(httpReq)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		if ctx.Err() != nil {
			return llm.ProviderHealth{}, ctx.Err()
		}
		return llm.ProviderHealth{
			Provider: c.providerName,
			Healthy:  false,
			Message:  c.providerName + " provider unreachable",
		}, nil
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 64<<10))

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		if msg := modelAvailabilityMessage(c.model, raw); msg != "" {
			return llm.ProviderHealth{
				Provider: c.providerName,
				Healthy:  false,
				Message:  msg,
			}, nil
		}
		return llm.ProviderHealth{Provider: c.providerName, Healthy: true, Message: "ok"}, nil
	}
	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return llm.ProviderHealth{
			Provider: c.providerName,
			Healthy:  false,
			Message:  c.providerName + " provider authentication failed",
		}, nil
	}
	return llm.ProviderHealth{
		Provider: c.providerName,
		Healthy:  false,
		Message:  fmt.Sprintf("%s provider unhealthy (HTTP %d)", c.providerName, resp.StatusCode),
	}, nil
}

func (c *Client) effectiveMaxTokens(requested int) int {
	if requested <= 0 {
		return 0
	}
	if config.IsHuggingFaceInferenceBaseURL(c.baseURL) && requested > hfMaxCompletionTokens {
		return hfMaxCompletionTokens
	}
	return requested
}

func buildChatMessages(req llm.GenerateRequest, useNativeRoles bool) []chatMessage {
	user := strings.TrimSpace(req.UserPrompt)
	system := strings.TrimSpace(req.SystemPrompt)
	if useNativeRoles {
		out := make([]chatMessage, 0, 2)
		if system != "" {
			out = append(out, chatMessage{Role: "system", Content: system})
		}
		if user != "" {
			out = append(out, chatMessage{Role: "user", Content: user})
		}
		return out
	}
	if system != "" {
		// Hugging Face Inference router and some OpenAI-compatible hosts reject role=system.
		user = system + "\n\n" + user
	}
	if strings.TrimSpace(user) == "" {
		return nil
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

type modelsListResponse struct {
	Data []struct {
		ID string `json:"id"`
	} `json:"data"`
}

func modelAvailabilityMessage(model string, raw []byte) string {
	model = strings.TrimSpace(model)
	if model == "" {
		return "LLM model is not configured"
	}

	var listed modelsListResponse
	if err := json.Unmarshal(raw, &listed); err != nil || len(listed.Data) == 0 {
		return ""
	}

	for _, item := range listed.Data {
		if modelsMatch(model, item.ID) {
			return ""
		}
	}
	return fmt.Sprintf("configured model %q is not available from provider", model)
}

func modelsMatch(configured, listed string) bool {
	configured = normalizeModelID(configured)
	listed = normalizeModelID(listed)
	return configured != "" && configured == listed
}

func normalizeModelID(model string) string {
	model = strings.TrimSpace(strings.ToLower(model))
	if model == "" {
		return ""
	}
	if idx := strings.Index(model, ":"); idx > 0 {
		return model[:idx]
	}
	return model
}

var _ llm.LLMProvider = (*Client)(nil)
