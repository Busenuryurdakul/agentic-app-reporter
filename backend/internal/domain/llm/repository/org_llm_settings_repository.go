package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/llm/model"
)

// OrgLLMSettingsRepository persists organization LLM provider overrides.
type OrgLLMSettingsRepository interface {
	GetByOrganizationID(ctx context.Context, orgID uuid.UUID) (*model.OrgLLMSettings, error)
	Upsert(ctx context.Context, settings *model.OrgLLMSettings, updateProviderAPIKey bool) error
	Delete(ctx context.Context, orgID uuid.UUID) error
}
