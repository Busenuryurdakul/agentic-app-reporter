package dto

import (
	"time"

	"github.com/google/uuid"
)

// OrgLLMSettingsResponse is the effective LLM configuration visible to org members.
// Never includes raw provider API keys (LLM inference keys are separate from MCP/app keys).
type OrgLLMSettingsResponse struct {
	OrganizationID    uuid.UUID  `json:"organization_id"`
	Configured        bool       `json:"configured"`
	Source            string     `json:"source"` // "environment" | "organization"
	Provider          string     `json:"provider"`
	BaseURL           string     `json:"base_url"`
	Model             string     `json:"model"`
	TimeoutSeconds    int        `json:"timeout_seconds"`
	MaxRetries        int        `json:"max_retries"`
	Enabled           bool       `json:"enabled"`
	HasProviderAPIKey bool       `json:"has_provider_api_key"`
	UpdatedAt         *time.Time `json:"updated_at,omitempty"`
}

// UpdateOrgLLMSettingsRequest updates organization LLM overrides.
type UpdateOrgLLMSettingsRequest struct {
	Provider            string `json:"provider" validate:"required_unless=ResetToEnvDefaults true,omitempty,oneof=mock gemma ollama"`
	BaseURL             string `json:"base_url"`
	Model               string `json:"model"`
	ProviderAPIKey      string `json:"provider_api_key"` // LLM provider inference key only
	ClearProviderAPIKey bool   `json:"clear_provider_api_key"`
	TimeoutSeconds      *int   `json:"timeout_seconds" validate:"omitempty,min=1,max=600"`
	MaxRetries          *int   `json:"max_retries" validate:"omitempty,min=0,max=10"`
	Enabled             *bool  `json:"enabled"`
	ResetToEnvDefaults  bool   `json:"reset_to_env_defaults"`
}

// TestOrgLLMConnectionRequest optionally probes draft settings before save.
type TestOrgLLMConnectionRequest struct {
	Provider       string `json:"provider" validate:"omitempty,oneof=mock gemma ollama"`
	BaseURL        string `json:"base_url"`
	Model          string `json:"model"`
	ProviderAPIKey string `json:"provider_api_key"`
}

// TestOrgLLMConnectionResponse is the result of a provider health probe.
type TestOrgLLMConnectionResponse struct {
	Provider string `json:"provider"`
	Healthy  bool   `json:"healthy"`
	Message  string `json:"message"`
	Enabled  bool   `json:"enabled"`
	Source   string `json:"source"`
}
