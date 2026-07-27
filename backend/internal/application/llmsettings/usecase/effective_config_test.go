package usecase_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/llmsettings/dto"
	llmsettingsUC "github.com/masterfabric-go/masterfabric/internal/application/llmsettings/usecase"
	llmModel "github.com/masterfabric-go/masterfabric/internal/domain/llm/model"
	tenantModel "github.com/masterfabric-go/masterfabric/internal/domain/tenant/model"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEffectiveLLMConfigMerger_EnvironmentFallback(t *testing.T) {
	global := config.LLMConfig{
		Enabled:        true,
		Provider:       "mock",
		Model:          "env-model",
		TimeoutSeconds: 60,
		MaxRetries:     2,
	}
	merger := llmsettingsUC.NewEffectiveLLMConfigMerger(global, false, nil)

	effective, source, hasKey := merger.Merge(nil)
	assert.Equal(t, "environment", source)
	assert.Equal(t, "mock", effective.Provider)
	assert.Equal(t, "env-model", effective.Model)
	assert.False(t, hasKey)
}

func TestEffectiveLLMConfigMerger_OrganizationOverride(t *testing.T) {
	global := config.LLMConfig{
		Enabled:        true,
		Provider:       "mock",
		Model:          "env-model",
		TimeoutSeconds: 60,
		MaxRetries:     2,
	}
	merger := llmsettingsUC.NewEffectiveLLMConfigMerger(global, false, func(s string) (string, error) {
		return "hf_secret", nil
	})

	orgID := uuid.New()
	settings := &llmModel.OrgLLMSettings{
		OrganizationID:    orgID,
		Provider:          "mock",
		Model:             "org-model",
		ProviderAPIKeyEnc: "enc",
		TimeoutSeconds:    45,
		MaxRetries:        1,
		Enabled:           true,
	}

	effective, source, hasKey := merger.Merge(settings)
	assert.Equal(t, "organization", source)
	assert.Equal(t, "org-model", effective.Model)
	assert.True(t, hasKey)
	assert.Equal(t, "hf_secret", effective.ProviderAPIKey)
}

func TestGetOrgLLMSettingsUseCase_OrgIsolation(t *testing.T) {
	orgA := uuid.New()
	orgB := uuid.New()
	repo := &stubOrgLLMSettingsRepo{}
	orgRepo := &stubOrgRepo{orgs: map[uuid.UUID]*tenantModel.Organization{
		orgA: {ID: orgA},
	}}
	merger := llmsettingsUC.NewEffectiveLLMConfigMerger(config.LLMConfig{
		Provider: "mock", Enabled: true, TimeoutSeconds: 60, MaxRetries: 2,
	}, false, nil)
	uc := llmsettingsUC.NewGetOrgLLMSettingsUseCase(repo, orgRepo, merger)

	ctx := context.WithValue(context.Background(), middleware.ContextKeyTenantID, orgB)
	_, err := uc.Execute(ctx, orgA)
	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrForbidden))
}

func TestUpdateOrgLLMSettingsUseCase_ResponseNeverIncludesRawKey(t *testing.T) {
	orgID := uuid.New()
	repo := &stubOrgLLMSettingsRepo{}
	orgRepo := &stubOrgRepo{orgs: map[uuid.UUID]*tenantModel.Organization{
		orgID: {ID: orgID},
	}}
	merger := llmsettingsUC.NewEffectiveLLMConfigMerger(config.LLMConfig{
		Provider: "mock", Enabled: true, TimeoutSeconds: 60, MaxRetries: 2,
	}, false, func(s string) (string, error) { return "plain-key", nil })
	encrypt := func(plain string) (string, error) { return "enc-" + plain, nil }
	uc := llmsettingsUC.NewUpdateOrgLLMSettingsUseCase(repo, orgRepo, merger, encrypt, nil)

	ctx := context.WithValue(context.Background(), middleware.ContextKeyTenantID, orgID)
	resp, err := uc.Execute(ctx, orgID, dto.UpdateOrgLLMSettingsRequest{
		Provider:       "mock",
		Model:          "saved-model",
		ProviderAPIKey: "sk-test-key-12345",
	})
	require.NoError(t, err)
	assert.True(t, resp.HasProviderAPIKey)
	assert.NotContains(t, resp.Model, "sk-test")
}

type stubOrgLLMSettingsRepo struct {
	settings map[uuid.UUID]*llmModel.OrgLLMSettings
}

func (s *stubOrgLLMSettingsRepo) GetByOrganizationID(_ context.Context, orgID uuid.UUID) (*llmModel.OrgLLMSettings, error) {
	if s.settings == nil {
		return nil, domainErr.New(domainErr.ErrNotFound, "not found", nil)
	}
	if v, ok := s.settings[orgID]; ok {
		return v, nil
	}
	return nil, domainErr.New(domainErr.ErrNotFound, "not found", nil)
}

func (s *stubOrgLLMSettingsRepo) Upsert(_ context.Context, settings *llmModel.OrgLLMSettings, _ bool) error {
	if s.settings == nil {
		s.settings = make(map[uuid.UUID]*llmModel.OrgLLMSettings)
	}
	c := *settings
	s.settings[settings.OrganizationID] = &c
	return nil
}

func (s *stubOrgLLMSettingsRepo) Delete(_ context.Context, orgID uuid.UUID) error {
	delete(s.settings, orgID)
	return nil
}

type stubOrgRepo struct {
	orgs map[uuid.UUID]*tenantModel.Organization
}

func (s *stubOrgRepo) Create(context.Context, *tenantModel.Organization) error { return nil }
func (s *stubOrgRepo) GetByID(_ context.Context, id uuid.UUID) (*tenantModel.Organization, error) {
	if org, ok := s.orgs[id]; ok {
		return org, nil
	}
	return nil, domainErr.New(domainErr.ErrNotFound, "org not found", nil)
}
func (s *stubOrgRepo) GetBySlug(context.Context, string) (*tenantModel.Organization, error) {
	return nil, domainErr.New(domainErr.ErrNotFound, "not found", nil)
}
func (s *stubOrgRepo) List(context.Context, int, int) ([]*tenantModel.Organization, int, error) {
	return nil, 0, nil
}
func (s *stubOrgRepo) Update(context.Context, *tenantModel.Organization) error { return nil }
func (s *stubOrgRepo) Delete(context.Context, uuid.UUID) error                 { return nil }
