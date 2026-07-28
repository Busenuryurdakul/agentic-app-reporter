package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoad_Defaults(t *testing.T) {
	t.Setenv("APP_ENV", "development")
	t.Setenv("LLM_ENABLED", "true")
	t.Setenv("LLM_PROVIDER", "mock")

	cfg := Load()

	assert.Equal(t, "development", cfg.Environment)
	assert.False(t, cfg.IsProduction())
	assert.Equal(t, "0.0.0.0", cfg.Server.Host)
	assert.Equal(t, 8080, cfg.Server.Port)
	assert.Equal(t, "localhost", cfg.Database.Host)
	assert.Equal(t, 5432, cfg.Database.Port)
	assert.Equal(t, "masterfabric", cfg.Database.User)
	assert.Equal(t, "localhost", cfg.Redis.Host)
	assert.Equal(t, 6379, cfg.Redis.Port)
	assert.True(t, cfg.LLM.Enabled)
	assert.Equal(t, "mock", cfg.LLM.Provider)
	assert.Equal(t, 60, cfg.LLM.TimeoutSeconds)
	assert.Equal(t, 2, cfg.LLM.MaxRetries)
	assert.False(t, cfg.LLM.AllowMockInProduction)
	assert.Equal(t, "info", cfg.Log.Level)
	assert.Equal(t, "json", cfg.Log.Format)
}

func TestValidateLLMConfig(t *testing.T) {
	assert.NoError(t, ValidateLLMConfig(LLMConfig{Enabled: false}, true))

	assert.NoError(t, ValidateLLMConfig(LLMConfig{
		Enabled:        true,
		Provider:       "mock",
		TimeoutSeconds: 60,
		MaxRetries:     0,
	}, false))

	err := ValidateLLMConfig(LLMConfig{Enabled: true, Provider: "", TimeoutSeconds: 60}, false)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "LLM_PROVIDER")

	err = ValidateLLMConfig(LLMConfig{Enabled: true, Provider: "openai", TimeoutSeconds: 60}, false)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "unknown LLM provider")

	err = ValidateLLMConfig(LLMConfig{Enabled: true, Provider: "gemma", TimeoutSeconds: 60}, false)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "LLM_BASE_URL")

	assert.NoError(t, ValidateLLMConfig(LLMConfig{
		Enabled:        true,
		Provider:       "gemma",
		BaseURL:        "http://localhost:11434/v1",
		TimeoutSeconds: 60,
	}, false))

	err = ValidateLLMConfig(LLMConfig{
		Enabled:        true,
		Provider:       "gemma",
		BaseURL:        "http://localhost:11434/v1",
		Model:          "gemma-test",
		TimeoutSeconds: 60,
	}, true)
	assert.NoError(t, err)

	assert.NoError(t, ValidateLLMConfig(LLMConfig{
		Enabled:        true,
		Provider:       "gemma",
		BaseURL:        "https://llm.example/v1",
		APIKey:         "secret",
		Model:          "gemma-test",
		TimeoutSeconds: 60,
	}, true))

	assert.NoError(t, ValidateLLMConfig(LLMConfig{
		Enabled:        true,
		Provider:       "ollama",
		TimeoutSeconds: 60,
	}, false))

	assert.NoError(t, ValidateLLMConfig(LLMConfig{
		Enabled:        true,
		Provider:       "ollama",
		BaseURL:        "http://127.0.0.1:11434/v1",
		Model:          "llama3.2",
		TimeoutSeconds: 120,
	}, false))

	err = ValidateLLMConfig(LLMConfig{Enabled: true, Provider: "mock", TimeoutSeconds: 0}, false)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "LLM_TIMEOUT_SECONDS")

	err = ValidateLLMConfig(LLMConfig{Enabled: true, Provider: "mock", TimeoutSeconds: 60, MaxRetries: -1}, false)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "LLM_MAX_RETRIES")

	err = ValidateLLMConfig(LLMConfig{
		Enabled:        true,
		Provider:       "mock",
		Model:          "mock-model",
		TimeoutSeconds: 60,
	}, true)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not allowed in production")

	assert.NoError(t, ValidateLLMConfig(LLMConfig{
		Enabled:               true,
		Provider:              "mock",
		Model:                 "mock-model",
		TimeoutSeconds:        60,
		AllowMockInProduction: true,
	}, true))
}

func TestValidateLLMConfig_OllamaProduction(t *testing.T) {
	base := LLMConfig{
		Enabled:        true,
		Provider:       "ollama",
		Model:          "llama3.2",
		TimeoutSeconds: 120,
	}

	err := ValidateLLMConfig(base, true)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "LLM_BASE_URL")

	for _, forbidden := range []string{
		"http://localhost:11434/v1",
		"http://127.0.0.1:11434/v1",
		"http://host.docker.internal:11434/v1",
	} {
		cfg := base
		cfg.BaseURL = forbidden
		err = ValidateLLMConfig(cfg, true)
		require.Error(t, err, "url=%s", forbidden)
		assert.Contains(t, err.Error(), "localhost")
	}

	assert.NoError(t, ValidateLLMConfig(LLMConfig{
		Enabled:        true,
		Provider:       "ollama",
		BaseURL:        "http://127.0.0.1:11434/v1",
		Model:          "llama3.2",
		TimeoutSeconds: 120,
	}, false))

	assert.NoError(t, ValidateLLMConfig(LLMConfig{
		Enabled:        true,
		Provider:       "ollama",
		BaseURL:        "https://ollama.example.com/v1",
		Model:          "llama3.2",
		TimeoutSeconds: 120,
	}, true))
}

func TestValidateLLMConfig_OllamaRejectsHuggingFaceBaseURL(t *testing.T) {
	cfg := LLMConfig{
		Enabled:        true,
		Provider:       "ollama",
		BaseURL:        "https://router.huggingface.co/v1",
		Model:          "llama3.2",
		TimeoutSeconds: 120,
	}
	err := ValidateLLMConfig(cfg, true)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "incompatible")
	assert.Contains(t, err.Error(), "ollama")

	assert.NoError(t, ValidateLLMConfigForStartup(cfg, true))
	compatErr := ProviderBaseURLCompatibilityError(cfg)
	require.Error(t, compatErr)
	assert.Contains(t, compatErr.Error(), "incompatible")
}

func TestValidateLLMConfig_ProductionRequiresModel(t *testing.T) {
	err := ValidateLLMConfig(LLMConfig{
		Enabled:        true,
		Provider:       "ollama",
		BaseURL:        "https://ollama.example.com/v1",
		TimeoutSeconds: 120,
	}, true)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "LLM_MODEL")
}

func TestSanitizedLLMBaseURLHost(t *testing.T) {
	assert.Equal(t, "ollama.example.com", SanitizedLLMBaseURLHost("https://ollama.example.com/v1"))
	assert.Equal(t, "[invalid]", SanitizedLLMBaseURLHost("not-a-url"))
}

func TestConfig_IsProduction(t *testing.T) {
	assert.True(t, (&Config{Environment: "production"}).IsProduction())
	assert.True(t, (&Config{Environment: "PROD"}).IsProduction())
	assert.False(t, (&Config{Environment: "development"}).IsProduction())
	assert.False(t, (&Config{Environment: "staging"}).IsProduction())
}

func TestLoad_EnvironmentOverrides(t *testing.T) {
	os.Setenv("SERVER_PORT", "9090")
	os.Setenv("DB_HOST", "db.example.com")
	defer os.Unsetenv("SERVER_PORT")
	defer os.Unsetenv("DB_HOST")

	cfg := Load()
	assert.Equal(t, 9090, cfg.Server.Port)
	assert.Equal(t, "db.example.com", cfg.Database.Host)
}

func TestLoad_DBPoolInt32Bounds(t *testing.T) {
	os.Setenv("DB_MAX_CONNS", "50")
	os.Setenv("DB_MIN_CONNS", "2147483648")
	defer os.Unsetenv("DB_MAX_CONNS")
	defer os.Unsetenv("DB_MIN_CONNS")

	cfg := Load()
	assert.Equal(t, int32(50), cfg.Database.MaxConns)
	assert.Equal(t, int32(5), cfg.Database.MinConns)
}

func TestDatabaseConfig_DSN(t *testing.T) {
	cfg := DatabaseConfig{
		Host:     "localhost",
		Port:     5432,
		User:     "user",
		Password: "pass",
		DBName:   "testdb",
		SSLMode:  "disable",
	}
	expected := "postgres://user:pass@localhost:5432/testdb?sslmode=disable"
	assert.Equal(t, expected, cfg.DSN())
}

func TestDatabaseConfig_DSN_EscapesSpecialCharacters(t *testing.T) {
	cfg := DatabaseConfig{
		Host:     "localhost",
		Port:     5432,
		User:     "user@domain",
		Password: "p@ss:w?rd#",
		DBName:   "testdb",
		SSLMode:  "require",
	}
	dsn := cfg.DSN()
	assert.Contains(t, dsn, "postgres://")
	assert.Contains(t, dsn, "sslmode=require")
	assert.NotContains(t, dsn, "p@ss:w?rd#")
}

func TestRedisConfig_Addr(t *testing.T) {
	cfg := RedisConfig{Host: "redis.local", Port: 6380}
	assert.Equal(t, "redis.local:6380", cfg.Addr())
}
