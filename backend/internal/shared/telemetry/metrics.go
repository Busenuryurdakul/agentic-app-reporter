package telemetry

import (
	"context"
	"sync"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
)

var (
	llmMetricsOnce sync.Once
	llmMetrics     *LLMMetrics
	llmMetricsErr  error
)

// LLMMetrics holds OpenTelemetry instruments for LLM generation observability.
type LLMMetrics struct {
	GenerationDuration metric.Float64Histogram
	GenerationTotal    metric.Int64Counter
	Inflight           metric.Int64UpDownCounter
}

// LLMMetricsInstruments returns shared LLM metric instruments (lazy init).
func LLMMetricsInstruments() (*LLMMetrics, error) {
	llmMetricsOnce.Do(func() {
		meter := otel.Meter("masterfabric/llm")
		var err error
		llmMetrics = &LLMMetrics{}

		llmMetrics.GenerationDuration, err = meter.Float64Histogram(
			"llm_generation_duration_seconds",
			metric.WithDescription("Duration of LLM generation calls in seconds"),
			metric.WithUnit("s"),
		)
		if err != nil {
			llmMetricsErr = err
			return
		}

		llmMetrics.GenerationTotal, err = meter.Int64Counter(
			"llm_generation_total",
			metric.WithDescription("Total LLM generation attempts"),
		)
		if err != nil {
			llmMetricsErr = err
			return
		}

		llmMetrics.Inflight, err = meter.Int64UpDownCounter(
			"llm_inflight",
			metric.WithDescription("In-flight LLM generation calls"),
		)
		if err != nil {
			llmMetricsErr = err
		}
	})
	return llmMetrics, llmMetricsErr
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
