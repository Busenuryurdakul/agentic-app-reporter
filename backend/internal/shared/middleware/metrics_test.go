package middleware_test

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/masterfabric-go/masterfabric/internal/shared/telemetry"
	"github.com/prometheus/client_golang/prometheus"
	dto "github.com/prometheus/client_model/go"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMetrics(t *testing.T) {
	ctx := context.Background()
	shutdown, err := telemetry.Setup(ctx, "test", "test")
	require.NoError(t, err)
	t.Cleanup(func() { _ = shutdown(ctx) })

	t.Run("SkipsMetricsEndpoint", func(t *testing.T) {
		handler := middleware.Metrics()(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		assert.False(t, hasMetricFamily("http_requests_total"))
	})

	t.Run("RecordsHealthRequest", func(t *testing.T) {
		r := chi.NewRouter()
		r.Use(middleware.Metrics())
		r.Get("/health/live", func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"status":"alive"}`))
		})

		req := httptest.NewRequest(http.MethodGet, "/health/live", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		require.Equal(t, http.StatusOK, rec.Code)

		total := findMetricSample("http_requests_total", map[string]string{
			"method":      "GET",
			"route":       "/health/live",
			"status_code": "200",
		})
		require.NotNil(t, total)
		assert.Equal(t, float64(1), total.GetCounter().GetValue())

		inflight := findMetricSample("http_requests_in_flight", nil)
		require.NotNil(t, inflight)
		assert.Equal(t, float64(0), inflight.GetGauge().GetValue())
	})

	t.Run("UsesUnmatchedRouteForUnknownPaths", func(t *testing.T) {
		handler := middleware.Metrics()(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusNotFound)
		}))

		req := httptest.NewRequest(http.MethodGet, "/does-not-exist", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		require.Equal(t, http.StatusNotFound, rec.Code)

		total := findMetricSample("http_requests_total", map[string]string{
			"method":      "GET",
			"route":       "unmatched",
			"status_code": "404",
		})
		require.NotNil(t, total)
	})

	t.Run("ResponseSizeRecorded", func(t *testing.T) {
		body := strings.Repeat("x", 128)
		handler := middleware.Metrics()(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			_, _ = io.WriteString(w, body)
		}))

		req := httptest.NewRequest(http.MethodGet, "/health/ready", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		require.Equal(t, http.StatusOK, rec.Code)

		countMetric := findMetricSample("http_response_size_bytes", map[string]string{
			"method":      "GET",
			"route":       "/health/ready",
			"status_code": "200",
		})
		require.NotNil(t, countMetric)
		require.NotNil(t, countMetric.GetHistogram())
		assert.Equal(t, uint64(1), countMetric.GetHistogram().GetSampleCount())
	})
}

func hasMetricFamily(name string) bool {
	gathered, err := prometheus.DefaultGatherer.Gather()
	if err != nil {
		return false
	}
	for _, mf := range gathered {
		if mf.GetName() == name {
			return true
		}
	}
	return false
}

func findMetricSample(name string, labels map[string]string) *dto.Metric {
	gathered, err := prometheus.DefaultGatherer.Gather()
	if err != nil {
		return nil
	}

	for _, mf := range gathered {
		if mf.GetName() != name {
			continue
		}
		for _, metric := range mf.GetMetric() {
			if labelsMatch(metric.GetLabel(), labels) {
				return metric
			}
		}
	}
	return nil
}

func labelsMatch(metricLabels []*dto.LabelPair, expected map[string]string) bool {
	if len(expected) == 0 {
		return true
	}
	for key, want := range expected {
		found := false
		for _, label := range metricLabels {
			if label.GetName() == key && label.GetValue() == want {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}
