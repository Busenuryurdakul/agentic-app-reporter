package telemetry

import (
	"fmt"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/metric"
)

var (
	llmMetrics     *LLMMetrics
	httpMetrics    *HTTPMetrics
	llmHealthGauge metric.Float64Gauge
)

func initInstruments() error {
	llmMeter := otel.Meter("masterfabric/llm")
	httpMeter := otel.Meter("masterfabric/http")

	llmMetrics = &LLMMetrics{}
	var err error

	llmMetrics.GenerationDuration, err = llmMeter.Float64Histogram(
		"llm_generation_duration_seconds",
		metric.WithDescription("Duration of LLM generation calls in seconds"),
		metric.WithUnit("s"),
	)
	if err != nil {
		return fmt.Errorf("create llm_generation_duration_seconds: %w", err)
	}

	llmMetrics.GenerationTotal, err = llmMeter.Int64Counter(
		"llm_generation_total",
		metric.WithDescription("Total LLM generation attempts"),
	)
	if err != nil {
		return fmt.Errorf("create llm_generation_total: %w", err)
	}

	llmMetrics.Inflight, err = llmMeter.Int64UpDownCounter(
		"llm_inflight",
		metric.WithDescription("In-flight LLM generation calls"),
	)
	if err != nil {
		return fmt.Errorf("create llm_inflight: %w", err)
	}

	llmHealthGauge, err = llmMeter.Float64Gauge(
		"llm_provider_health",
		metric.WithDescription("LLM provider health (1=healthy, 0=unhealthy)"),
	)
	if err != nil {
		return fmt.Errorf("create llm_provider_health: %w", err)
	}

	httpMetrics = &HTTPMetrics{}

	httpMetrics.RequestsTotal, err = httpMeter.Int64Counter(
		"http_requests_total",
		metric.WithDescription("Total HTTP requests received"),
	)
	if err != nil {
		return fmt.Errorf("create http_requests_total: %w", err)
	}

	httpMetrics.RequestDuration, err = httpMeter.Float64Histogram(
		"http_request_duration_seconds",
		metric.WithDescription("HTTP request duration in seconds"),
		metric.WithUnit("s"),
		metric.WithExplicitBucketBoundaries(
			0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 90,
		),
	)
	if err != nil {
		return fmt.Errorf("create http_request_duration_seconds: %w", err)
	}

	httpMetrics.RequestsInFlight, err = httpMeter.Int64UpDownCounter(
		"http_requests_in_flight",
		metric.WithDescription("In-flight HTTP requests"),
	)
	if err != nil {
		return fmt.Errorf("create http_requests_in_flight: %w", err)
	}

	httpMetrics.ResponseSizeBytes, err = httpMeter.Int64Histogram(
		"http_response_size_bytes",
		metric.WithDescription("HTTP response body size in bytes"),
		metric.WithUnit("By"),
		metric.WithExplicitBucketBoundaries(100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000),
	)
	if err != nil {
		return fmt.Errorf("create http_response_size_bytes: %w", err)
	}

	return nil
}
