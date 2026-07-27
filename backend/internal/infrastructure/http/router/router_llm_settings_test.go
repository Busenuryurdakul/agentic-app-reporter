package router_test

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	llmsettingsUC "github.com/masterfabric-go/masterfabric/internal/application/llmsettings/usecase"
	llmsettingsHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/llmsettings"
	tenantHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/tenant"
	"github.com/masterfabric-go/masterfabric/internal/infrastructure/http/router"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	"github.com/stretchr/testify/assert"
)

func TestRouter_LLMSettingsRoutesRegistered(t *testing.T) {
	merger := llmsettingsUC.NewEffectiveLLMConfigMerger(config.LLMConfig{
		Provider: "mock", Enabled: true, TimeoutSeconds: 60, MaxRetries: 2,
	}, false, nil)
	h := llmsettingsHandler.NewHandler(
		llmsettingsUC.NewGetOrgLLMSettingsUseCase(nil, nil, merger),
		nil,
		nil,
	)

	deps := router.Dependencies{
		Logger:             slog.Default(),
		TenantHandler:      tenantHandler.NewHandler(nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil),
		LLMSettingsHandler: h,
	}
	r := router.New(deps)

	orgID := uuid.New().String()
	paths := []string{
		"/api/v1/organizations/" + orgID + "/llm-settings",
		"/api/v1/organizations/" + orgID + "/llm-settings/test",
	}
	for _, path := range paths {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		assert.NotEqual(t, http.StatusNotFound, rec.Code, "route should exist: %s got %d", path, rec.Code)
	}
}
