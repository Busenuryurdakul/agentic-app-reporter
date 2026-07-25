package telemetry

import (
	"context"
	"fmt"
	"sync"

	"github.com/jackc/pgx/v5/pgxpool"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
)

var (
	dbMetricsOnce sync.Once
	dbMetricsErr  error
)

// RegisterDBPoolMetrics registers observable PostgreSQL pool metrics for the given pool.
// Safe to call once at startup; no-op when pool is nil.
func RegisterDBPoolMetrics(pool *pgxpool.Pool) error {
	if pool == nil {
		return nil
	}

	dbMetricsOnce.Do(func() {
		meter := otel.Meter("masterfabric/db")

		connections, err := meter.Float64ObservableGauge(
			"db_pool_connections",
			metric.WithDescription("PostgreSQL connection pool size by state"),
		)
		if err != nil {
			dbMetricsErr = fmt.Errorf("create db_pool_connections: %w", err)
			return
		}

		acquireTotal, err := meter.Int64ObservableCounter(
			"db_pool_acquire_total",
			metric.WithDescription("Total successful connection acquires from the pool"),
		)
		if err != nil {
			dbMetricsErr = fmt.Errorf("create db_pool_acquire_total: %w", err)
			return
		}

		acquireDuration, err := meter.Float64ObservableCounter(
			"db_pool_acquire_duration_seconds_total",
			metric.WithDescription("Total time spent acquiring connections from the pool"),
			metric.WithUnit("s"),
		)
		if err != nil {
			dbMetricsErr = fmt.Errorf("create db_pool_acquire_duration_seconds_total: %w", err)
			return
		}

		canceledAcquires, err := meter.Int64ObservableCounter(
			"db_pool_canceled_acquire_total",
			metric.WithDescription("Total connection acquires canceled before completion"),
		)
		if err != nil {
			dbMetricsErr = fmt.Errorf("create db_pool_canceled_acquire_total: %w", err)
			return
		}

		_, dbMetricsErr = meter.RegisterCallback(
			func(_ context.Context, o metric.Observer) error {
				stat := pool.Stat()

				observeGauge := func(state string, value int32) {
					o.ObserveFloat64(connections, float64(value), metric.WithAttributes(
						attribute.String("state", state),
					))
				}
				observeGauge("idle", stat.IdleConns())
				observeGauge("acquired", stat.AcquiredConns())
				observeGauge("total", stat.TotalConns())
				observeGauge("max", stat.MaxConns())

				o.ObserveInt64(acquireTotal, stat.AcquireCount())
				o.ObserveFloat64(acquireDuration, stat.AcquireDuration().Seconds())
				o.ObserveInt64(canceledAcquires, stat.CanceledAcquireCount())
				return nil
			},
			connections,
			acquireTotal,
			acquireDuration,
			canceledAcquires,
		)
		if dbMetricsErr != nil {
			dbMetricsErr = fmt.Errorf("register db pool callback: %w", dbMetricsErr)
		}
	})

	return dbMetricsErr
}
