package telemetry_test

import (
	"context"
	"testing"

	"github.com/masterfabric-go/masterfabric/internal/shared/telemetry"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRegisterDBPoolMetrics_NilPool(t *testing.T) {
	err := telemetry.RegisterDBPoolMetrics(nil)
	require.NoError(t, err)
}

func TestSetLLMProviderHealth_NoPanicWithoutSetup(t *testing.T) {
	assert.NotPanics(t, func() {
		telemetry.SetLLMProviderHealth(context.Background(), "mock", true)
	})
}

func TestHTTPMetricsInstruments(t *testing.T) {
	ctx := context.Background()
	shutdown, err := telemetry.Setup(ctx, "test", "test")
	require.NoError(t, err)
	t.Cleanup(func() { _ = shutdown(ctx) })

	m, err := telemetry.HTTPMetricsInstruments()
	require.NoError(t, err)
	require.NotNil(t, m)

	telemetry.RecordHTTPRequest(ctx, "GET", "/health/live", 200, 0.01, 10)
	telemetry.IncHTTPInFlight(ctx)
	telemetry.DecHTTPInFlight(ctx)

	gathered, err := prometheus.DefaultGatherer.Gather()
	require.NoError(t, err)
	found := false
	for _, mf := range gathered {
		if mf.GetName() == "http_requests_total" {
			found = true
			break
		}
	}
	assert.True(t, found, "expected http_requests_total in prometheus gatherer")
}

func TestRecordHTTPRequest_NoPanicWithoutSetup(t *testing.T) {
	assert.NotPanics(t, func() {
		telemetry.RecordHTTPRequest(context.Background(), "GET", "/health/live", 200, 0.01, 10)
	})
}

func TestSetLLMProviderHealth_WithSetup(t *testing.T) {
	ctx := context.Background()
	shutdown, err := telemetry.Setup(ctx, "test", "test")
	require.NoError(t, err)
	t.Cleanup(func() { _ = shutdown(ctx) })

	assert.NotPanics(t, func() {
		telemetry.SetLLMProviderHealth(ctx, "mock", true)
		telemetry.SetLLMProviderHealth(ctx, "mock", false)
	})
}
