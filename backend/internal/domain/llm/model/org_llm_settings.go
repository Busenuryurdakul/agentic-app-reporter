package model

import (
	"time"

	"github.com/google/uuid"
)

// OrgLLMSettings holds organization-level LLM provider overrides.
// ProviderAPIKeyEnc stores an encrypted LLM inference key — never an MCP or app API key.
type OrgLLMSettings struct {
	OrganizationID    uuid.UUID
	Provider          string
	BaseURL           string
	Model             string
	ProviderAPIKeyEnc string
	TimeoutSeconds    int
	MaxRetries        int
	Enabled           bool
	UpdatedBy         *uuid.UUID
	CreatedAt         time.Time
	UpdatedAt         time.Time
}
