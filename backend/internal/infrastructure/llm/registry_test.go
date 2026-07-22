package llm

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	domainllm "github.com/masterfabric-go/masterfabric/internal/domain/llm"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewProvider_SelectsMock(t *testing.T) {
	p, err := NewProvider(config.LLMConfig{
		Enabled:        true,
		Provider:       "mock",
		Model:          "unit-model",
		TimeoutSeconds: 5,
		MaxRetries:     0,
	})
	require.NoError(t, err)
	require.NotNil(t, p)
	assert.Equal(t, domainllm.ProviderMock, p.Name())

	resp, err := p.Generate(context.Background(), domainllm.GenerateRequest{UserPrompt: "x"})
	require.NoError(t, err)
	assert.Equal(t, "unit-model", resp.Model)
}

func TestNewProvider_SelectsGemma(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/chat/completions":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"model": "gemma",
				"choices": []map[string]any{
					{"finish_reason": "stop", "message": map[string]string{"content": "# Doc\n"}},
				},
			})
		case "/v1/models":
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"data":[]}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer srv.Close()

	p, err := NewProvider(config.LLMConfig{
		Enabled:        true,
		Provider:       "gemma",
		BaseURL:        srv.URL + "/v1",
		APIKey:         "k",
		TimeoutSeconds: 5,
		MaxRetries:     0,
	})
	require.NoError(t, err)
	assert.Equal(t, domainllm.ProviderGemma, p.Name())

	resp, err := p.Generate(context.Background(), domainllm.GenerateRequest{UserPrompt: "x"})
	require.NoError(t, err)
	assert.Contains(t, resp.Content, "# Doc")

	h, err := p.Health(context.Background())
	require.NoError(t, err)
	assert.True(t, h.Healthy)
}

func TestNewProvider_CaseInsensitive(t *testing.T) {
	p, err := NewProvider(config.LLMConfig{Enabled: true, Provider: "MoCk", TimeoutSeconds: 5})
	require.NoError(t, err)
	assert.Equal(t, domainllm.ProviderMock, p.Name())
}

func TestNewProvider_UnknownProvider(t *testing.T) {
	p, err := NewProvider(config.LLMConfig{Enabled: true, Provider: "openai", TimeoutSeconds: 5})
	assert.Nil(t, p)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "unknown LLM provider")
}

func TestNewProvider_EmptyProviderWhenEnabled(t *testing.T) {
	p, err := NewProvider(config.LLMConfig{Enabled: true, Provider: "  ", TimeoutSeconds: 5})
	assert.Nil(t, p)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "LLM_PROVIDER")
}

func TestNewProvider_GemmaMissingBaseURL(t *testing.T) {
	p, err := NewProvider(config.LLMConfig{Enabled: true, Provider: "gemma", TimeoutSeconds: 5})
	assert.Nil(t, p)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "LLM_BASE_URL")
}

func TestNewProvider_DisabledStillReturnsProvider(t *testing.T) {
	p, err := NewProvider(config.LLMConfig{Enabled: false, Provider: "mock", TimeoutSeconds: 5})
	require.NoError(t, err)
	require.NotNil(t, p)
	assert.Equal(t, domainllm.ProviderMock, p.Name())
}

func TestIsKnownProvider(t *testing.T) {
	assert.True(t, IsKnownProvider("mock"))
	assert.True(t, IsKnownProvider("GEMMA"))
	assert.False(t, IsKnownProvider("openai"))
	assert.False(t, IsKnownProvider(""))
}
