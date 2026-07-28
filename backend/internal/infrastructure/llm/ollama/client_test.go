package ollama

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/masterfabric-go/masterfabric/internal/domain/llm"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNew_DefaultsBaseURLAndModel(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/models" {
			w.WriteHeader(http.StatusOK)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	c, err := New(Config{BaseURL: srv.URL + "/v1"})
	require.NoError(t, err)
	assert.Equal(t, llm.ProviderOllama, c.Name())
}

func TestClient_GenerateAndHealth(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/chat/completions":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"model": "llama3.2",
				"choices": []map[string]any{
					{"finish_reason": "stop", "message": map[string]string{"content": "# Doc\n"}},
				},
			})
		case "/v1/models":
			w.WriteHeader(http.StatusOK)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer srv.Close()

	c, err := New(Config{
		BaseURL: srv.URL + "/v1",
		Model:   "llama3.2",
	})
	require.NoError(t, err)

	resp, err := c.Generate(context.Background(), llm.GenerateRequest{UserPrompt: "hello"})
	require.NoError(t, err)
	assert.Equal(t, llm.ProviderOllama, resp.Provider)
	assert.Contains(t, resp.Content, "# Doc")

	h, err := c.Health(context.Background())
	require.NoError(t, err)
	assert.Equal(t, llm.ProviderOllama, h.Provider)
	assert.True(t, h.Healthy)
}

func TestClient_HealthUnreachable_NoGemmaInMessage(t *testing.T) {
	c, err := New(Config{
		BaseURL:        "http://127.0.0.1:1/v1",
		TimeoutSeconds: 1,
	})
	require.NoError(t, err)

	h, err := c.Health(context.Background())
	require.NoError(t, err)
	assert.Equal(t, llm.ProviderOllama, h.Provider)
	assert.False(t, h.Healthy)
	assert.NotContains(t, h.Message, "gemma")
	assert.Contains(t, h.Message, "ollama provider unreachable")
}
