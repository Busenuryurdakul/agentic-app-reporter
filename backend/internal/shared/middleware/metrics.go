package middleware

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/masterfabric-go/masterfabric/internal/shared/telemetry"
)

const unmatchedRoute = "unmatched"

type metricsResponseWriter struct {
	http.ResponseWriter
	statusCode int
	bytes      int64
}

func (w *metricsResponseWriter) WriteHeader(code int) {
	w.statusCode = code
	w.ResponseWriter.WriteHeader(code)
}

func (w *metricsResponseWriter) Write(b []byte) (int, error) {
	n, err := w.ResponseWriter.Write(b)
	w.bytes += int64(n)
	return n, err
}

// Metrics records Prometheus HTTP metrics for each request using low-cardinality labels.
// Scrape traffic to /metrics is excluded.
func Metrics() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if shouldSkipHTTPMetrics(r.URL.Path) {
				next.ServeHTTP(w, r)
				return
			}

			start := time.Now()
			ctx := r.Context()
			telemetry.IncHTTPInFlight(ctx)

			wrapped := &metricsResponseWriter{
				ResponseWriter: w,
				statusCode:     http.StatusOK,
			}

			next.ServeHTTP(wrapped, r)

			telemetry.DecHTTPInFlight(ctx)
			telemetry.RecordHTTPRequest(
				ctx,
				r.Method,
				httpRoutePattern(r),
				wrapped.statusCode,
				time.Since(start).Seconds(),
				wrapped.bytes,
			)
		})
	}
}

func shouldSkipHTTPMetrics(path string) bool {
	return path == "/metrics"
}

func httpRoutePattern(r *http.Request) string {
	if rctx := chi.RouteContext(r.Context()); rctx != nil {
		if pattern := rctx.RoutePattern(); pattern != "" {
			return pattern
		}
	}

	switch r.URL.Path {
	case "/health/live", "/health/ready":
		return r.URL.Path
	}

	return unmatchedRoute
}
