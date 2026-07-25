package telemetry

import (
	"context"
	"errors"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
)

var errInstrumentsNotInitialized = errors.New("telemetry instruments not initialized")

// LLMMetrics holds OpenTelemetry instruments for LLM generation observability.
type LLMMetrics struct {
	GenerationDuration metric.Float64Histogram
	GenerationTotal    metric.Int64Counter
	Inflight           metric.Int64UpDownCounter
}

// LLMMetricsInstruments returns shared LLM metric instruments after telemetry.Setup.
func LLMMetricsInstruments() (*LLMMetrics, error) {
	if llmMetrics == nil {
		return nil, errInstrumentsNotInitialized
	}
	return llmMetrics, nil
}

// RecordLLMGeneration records duration and outcome for an LLM call.
func RecordLLMGeneration(ctx context.Context, provider, status string, seconds float64) {
	m, err := LLMMetricsInstruments()
	if err != nil || m == nil {
		return
	}
	attrs := metric.WithAttributes(
		attribute.String("provider", provider),
		attribute.String("status", status),
	)
	m.GenerationDuration.Record(ctx, seconds, attrs)
	m.GenerationTotal.Add(ctx, 1, attrs)
}

// IncLLMInflight increments the in-flight gauge.
func IncLLMInflight(ctx context.Context) {
	m, err := LLMMetricsInstruments()
	if err != nil || m == nil {
		return
	}
	m.Inflight.Add(ctx, 1)
}

// DecLLMInflight decrements the in-flight gauge.
func DecLLMInflight(ctx context.Context) {
	m, err := LLMMetricsInstruments()
	if err != nil || m == nil {
		return
	}
	m.Inflight.Add(ctx, -1)
}

// SetLLMProviderHealth records provider health as 1 (healthy) or 0 (unhealthy).
func SetLLMProviderHealth(ctx context.Context, provider string, healthy bool) {
	if provider == "" || llmHealthGauge == nil {
		return
	}

	value := float64(0)
	if healthy {
		value = 1
	}
	llmHealthGauge.Record(ctx, value, metric.WithAttributes(
		attribute.String("provider", provider),
	))
}
