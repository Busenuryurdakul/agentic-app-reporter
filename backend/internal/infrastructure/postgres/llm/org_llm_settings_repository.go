package llm

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	llmModel "github.com/masterfabric-go/masterfabric/internal/domain/llm/model"
	llmRepo "github.com/masterfabric-go/masterfabric/internal/domain/llm/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

var _ llmRepo.OrgLLMSettingsRepository = (*OrgLLMSettingsRepository)(nil)

// OrgLLMSettingsRepository implements llmRepo.OrgLLMSettingsRepository with PostgreSQL.
type OrgLLMSettingsRepository struct {
	db *pgxpool.Pool
}

// NewOrgLLMSettingsRepository creates a new OrgLLMSettingsRepository.
func NewOrgLLMSettingsRepository(db *pgxpool.Pool) *OrgLLMSettingsRepository {
	return &OrgLLMSettingsRepository{db: db}
}

const orgLLMSettingsColumns = `
	organization_id, provider, base_url, model, provider_api_key_enc,
	timeout_seconds, max_retries, enabled, updated_by, created_at, updated_at`

func scanOrgLLMSettings(row pgx.Row) (*llmModel.OrgLLMSettings, error) {
	var s llmModel.OrgLLMSettings
	var baseURL, model, keyEnc *string
	var timeout, maxRetries *int
	err := row.Scan(
		&s.OrganizationID,
		&s.Provider,
		&baseURL,
		&model,
		&keyEnc,
		&timeout,
		&maxRetries,
		&s.Enabled,
		&s.UpdatedBy,
		&s.CreatedAt,
		&s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if baseURL != nil {
		s.BaseURL = *baseURL
	}
	if model != nil {
		s.Model = *model
	}
	if keyEnc != nil {
		s.ProviderAPIKeyEnc = *keyEnc
	}
	if timeout != nil {
		s.TimeoutSeconds = *timeout
	}
	if maxRetries != nil {
		s.MaxRetries = *maxRetries
	}
	return &s, nil
}

// GetByOrganizationID returns org LLM settings or ErrNotFound when unset.
func (r *OrgLLMSettingsRepository) GetByOrganizationID(ctx context.Context, orgID uuid.UUID) (*llmModel.OrgLLMSettings, error) {
	query := `SELECT ` + orgLLMSettingsColumns + ` FROM organization_llm_settings WHERE organization_id = $1`
	settings, err := scanOrgLLMSettings(r.db.QueryRow(ctx, query, orgID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "organization llm settings not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to get organization llm settings", err)
	}
	return settings, nil
}

// Upsert creates or updates organization LLM settings.
// When updateProviderAPIKey is true the provider_api_key_enc column is set (empty clears it).
func (r *OrgLLMSettingsRepository) Upsert(ctx context.Context, settings *llmModel.OrgLLMSettings, updateProviderAPIKey bool) error {
	now := time.Now().UTC()
	if settings.CreatedAt.IsZero() {
		settings.CreatedAt = now
	}
	settings.UpdatedAt = now

	var baseURL, model *string
	var keyEnc *string
	if settings.BaseURL != "" {
		baseURL = &settings.BaseURL
	}
	if settings.Model != "" {
		model = &settings.Model
	}
	if updateProviderAPIKey {
		if settings.ProviderAPIKeyEnc != "" {
			keyEnc = &settings.ProviderAPIKeyEnc
		}
	}
	var timeout, maxRetries *int
	if settings.TimeoutSeconds > 0 {
		timeout = &settings.TimeoutSeconds
	}
	if settings.MaxRetries >= 0 {
		v := settings.MaxRetries
		maxRetries = &v
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO organization_llm_settings (
			organization_id, provider, base_url, model, provider_api_key_enc,
			timeout_seconds, max_retries, enabled, updated_by, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		ON CONFLICT (organization_id) DO UPDATE SET
			provider = EXCLUDED.provider,
			base_url = EXCLUDED.base_url,
			model = EXCLUDED.model,
			provider_api_key_enc = CASE WHEN $12 THEN EXCLUDED.provider_api_key_enc ELSE organization_llm_settings.provider_api_key_enc END,
			timeout_seconds = EXCLUDED.timeout_seconds,
			max_retries = EXCLUDED.max_retries,
			enabled = EXCLUDED.enabled,
			updated_by = EXCLUDED.updated_by,
			updated_at = EXCLUDED.updated_at
	`,
		settings.OrganizationID,
		settings.Provider,
		baseURL,
		model,
		keyEnc,
		timeout,
		maxRetries,
		settings.Enabled,
		settings.UpdatedBy,
		settings.CreatedAt,
		settings.UpdatedAt,
		updateProviderAPIKey,
	)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to upsert organization llm settings", err)
	}
	return nil
}

// Delete removes organization LLM overrides so env defaults apply.
func (r *OrgLLMSettingsRepository) Delete(ctx context.Context, orgID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM organization_llm_settings WHERE organization_id = $1`, orgID)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to delete organization llm settings", err)
	}
	return nil
}
