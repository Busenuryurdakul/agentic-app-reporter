package llmsettings_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/llmsettings/dto"
	llmsettingsUC "github.com/masterfabric-go/masterfabric/internal/application/llmsettings/usecase"
	llmsettingsHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/llmsettings"
	llmModel "github.com/masterfabric-go/masterfabric/internal/domain/llm/model"
	tenantModel "github.com/masterfabric-go/masterfabric/internal/domain/tenant/model"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHandler_GetSettings_MasksProviderAPIKey(t *testing.T) {
	orgID := uuid.New()
	repo := &handlerStubRepo{
		settings: map[uuid.UUID]*llmModel.OrgLLMSettings{
			orgID: {
				OrganizationID:    orgID,
				Provider:          "mock",
				Model:             "org-model",
				ProviderAPIKeyEnc: "enc-value",
				Enabled:           true,
			},
		},
	}
	orgRepo := &handlerStubOrgRepo{orgs: map[uuid.UUID]*tenantModel.Organization{orgID: {ID: orgID}}}
	merger := llmsettingsUC.NewEffectiveLLMConfigMerger(config.LLMConfig{
		Provider: "mock", Enabled: true, TimeoutSeconds: 60, MaxRetries: 2,
	}, false, func(string) (string, error) { return "super-secret", nil })

	getUC := llmsettingsUC.NewGetOrgLLMSettingsUseCase(repo, orgRepo, merger)
	h := llmsettingsHandler.NewHandler(getUC, nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/organizations/"+orgID.String()+"/llm-settings", nil)
	ctx := context.WithValue(req.Context(), middleware.ContextKeyTenantID, orgID)
	req = req.WithContext(ctx)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("orgId", orgID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rec := httptest.NewRecorder()
	h.GetSettings(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	body := rec.Body.String()
	assert.NotContains(t, body, "super-secret")
	assert.NotContains(t, body, `"provider_api_key"`)
	assert.Contains(t, body, `"has_provider_api_key":true`)

	var resp dto.OrgLLMSettingsResponse
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	assert.True(t, resp.HasProviderAPIKey)
}

func TestHandler_GetSettings_InvalidOrgID(t *testing.T) {
	h := llmsettingsHandler.NewHandler(nil, nil, nil)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/organizations/not-a-uuid/llm-settings", nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("orgId", "not-a-uuid")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rec := httptest.NewRecorder()
	h.GetSettings(rec, req)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
}

type handlerStubRepo struct {
	settings map[uuid.UUID]*llmModel.OrgLLMSettings
}

func (s *handlerStubRepo) GetByOrganizationID(_ context.Context, orgID uuid.UUID) (*llmModel.OrgLLMSettings, error) {
	if v, ok := s.settings[orgID]; ok {
		return v, nil
	}
	return nil, domainErr.New(domainErr.ErrNotFound, "not found", nil)
}
func (s *handlerStubRepo) Upsert(context.Context, *llmModel.OrgLLMSettings, bool) error {
	return nil
}
func (s *handlerStubRepo) Delete(context.Context, uuid.UUID) error { return nil }

type handlerStubOrgRepo struct {
	orgs map[uuid.UUID]*tenantModel.Organization
}

func (s *handlerStubOrgRepo) Create(context.Context, *tenantModel.Organization) error { return nil }
func (s *handlerStubOrgRepo) GetByID(_ context.Context, id uuid.UUID) (*tenantModel.Organization, error) {
	if org, ok := s.orgs[id]; ok {
		return org, nil
	}
	return nil, domainErr.New(domainErr.ErrNotFound, "org not found", nil)
}
func (s *handlerStubOrgRepo) GetBySlug(context.Context, string) (*tenantModel.Organization, error) {
	return nil, domainErr.New(domainErr.ErrNotFound, "not found", nil)
}
func (s *handlerStubOrgRepo) List(context.Context, int, int) ([]*tenantModel.Organization, int, error) {
	return nil, 0, nil
}
func (s *handlerStubOrgRepo) Update(context.Context, *tenantModel.Organization) error { return nil }
func (s *handlerStubOrgRepo) Delete(context.Context, uuid.UUID) error                 { return nil }
