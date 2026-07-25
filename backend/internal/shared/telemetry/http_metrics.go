package telemetry

import (
	"context"
	"strconv"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
)

// HTTPMetrics holds OpenTelemetry instruments for HTTP server observability.
type HTTPMetrics struct {
	RequestsTotal     metric.Int64Counter
	RequestDuration   metric.Float64Histogram
	RequestsInFlight  metric.Int64UpDownCounter
	ResponseSizeBytes metric.Int64Histogram
}

// HTTPMetricsInstruments returns shared HTTP metric instruments after telemetry.Setup.
func HTTPMetricsInstruments() (*HTTPMetrics, error) {
	if httpMetrics == nil {
		return nil, errInstrumentsNotInitialized
	}
	return httpMetrics, nil
}

// RecordHTTPRequest records HTTP request metrics. route must be a low-cardinality
// route pattern (never a raw URL with IDs).
func RecordHTTPRequest(
	ctx context.Context,
	method, route string,
	statusCode int,
	durationSeconds float64,
	responseBytes int64,
) {
	if route == "" {
		return
	}

	m, err := HTTPMetricsInstruments()
	if err != nil || m == nil {
		return
	}

	attrs := metric.WithAttributes(
		attribute.String("method", method),
		attribute.String("route", route),
		attribute.String("status_code", strconv.Itoa(statusCode)),
	)

	m.RequestsTotal.Add(ctx, 1, attrs)
	m.RequestDuration.Record(ctx, durationSeconds, attrs)
	if responseBytes >= 0 {
		m.ResponseSizeBytes.Record(ctx, responseBytes, attrs)
	}
}

// IncHTTPInFlight increments the in-flight HTTP request gauge.
func IncHTTPInFlight(ctx context.Context) {
	m, err := HTTPMetricsInstruments()
	if err != nil || m == nil {
		return
	}
	m.RequestsInFlight.Add(ctx, 1)
}

// DecHTTPInFlight decrements the in-flight HTTP request gauge.
func DecHTTPInFlight(ctx context.Context) {
	m, err := HTTPMetricsInstruments()
	if err != nil || m == nil {
		return
	}
	m.RequestsInFlight.Add(ctx, -1)
}
