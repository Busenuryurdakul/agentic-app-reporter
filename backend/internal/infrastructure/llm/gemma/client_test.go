package gemma

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/masterfabric-go/masterfabric/internal/domain/llm"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNew_RequiresBaseURL(t *testing.T) {
	_, err := New(Config{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "LLM_BASE_URL")
}

func TestClient_GenerateSuccess(t *testing.T) {
	var gotAuth string
	var gotBody chatRequest
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/chat/completions", r.URL.Path)
		gotAuth = r.Header.Get("Authorization")
		require.NoError(t, json.NewDecoder(r.Body).Decode(&gotBody))
		_ = json.NewEncoder(w).Encode(map[string]any{
			"model": "gemma-test",
			"choices": []map[string]any{
				{"finish_reason": "stop", "message": map[string]string{"content": "# Hello\n"}},
			},
			"usage": map[string]int{"prompt_tokens": 3, "completion_tokens": 5, "total_tokens": 8},
		})
	}))
	defer srv.Close()

	c, err := New(Config{
		BaseURL:    srv.URL + "/v1",
		APIKey:     "secret-key",
		Model:      "gemma-test",
		HTTPClient: srv.Client(),
	})
	require.NoError(t, err)

	resp, err := c.Generate(context.Background(), llm.GenerateRequest{
		SystemPrompt: "sys",
		UserPrompt:   "user",
		MaxTokens:    64,
	})
	require.NoError(t, err)
	assert.Equal(t, "Bearer secret-key", gotAuth)
	assert.Equal(t, "sys", gotBody.Messages[0].Content)
	assert.Equal(t, "user", gotBody.Messages[1].Content)
	assert.Equal(t, "# Hello\n", resp.Content)
	assert.Equal(t, llm.ProviderGemma, resp.Provider)
	assert.Equal(t, "gemma-test", resp.Model)
	assert.Equal(t, 8, resp.Usage.TotalTokens)
}

func TestClient_GenerateRateLimited(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write([]byte(`{"error":{"message":"slow down"}}`))
	}))
	defer srv.Close()

	c, err := New(Config{BaseURL: srv.URL + "/v1", HTTPClient: srv.Client()})
	require.NoError(t, err)
	_, err = c.Generate(context.Background(), llm.GenerateRequest{UserPrompt: "x"})
	require.Error(t, err)
	assert.ErrorIs(t, err, domainErr.ErrRateLimited)
}

func TestClient_GenerateServerError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
		_, _ = w.Write([]byte(`upstream`))
	}))
	defer srv.Close()

	c, err := New(Config{BaseURL: srv.URL + "/v1", HTTPClient: srv.Client()})
	require.NoError(t, err)
	_, err = c.Generate(context.Background(), llm.GenerateRequest{UserPrompt: "x"})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "unavailable")
}

func TestClient_GenerateRespectsCancel(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	c, err := New(Config{BaseURL: srv.URL + "/v1", HTTPClient: srv.Client()})
	require.NoError(t, err)

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	_, err = c.Generate(ctx, llm.GenerateRequest{UserPrompt: "x"})
	require.Error(t, err)
}

func TestClient_HealthOK(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/models", r.URL.Path)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"data":[]}`))
	}))
	defer srv.Close()

	c, err := New(Config{BaseURL: srv.URL + "/v1", HTTPClient: srv.Client()})
	require.NoError(t, err)
	h, err := c.Health(context.Background())
	require.NoError(t, err)
	assert.True(t, h.Healthy)
	assert.Equal(t, llm.ProviderGemma, h.Provider)
}

func TestClient_HealthAuthFailed(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer srv.Close()

	c, err := New(Config{BaseURL: srv.URL + "/v1", HTTPClient: srv.Client()})
	require.NoError(t, err)
	h, err := c.Health(context.Background())
	require.NoError(t, err)
	assert.False(t, h.Healthy)
	assert.Contains(t, h.Message, "authentication")
}
