package bootstrap

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Run applies idempotent production bootstrap: RBAC role templates and membership backfill.
func Run(ctx context.Context, db *pgxpool.Pool, log *slog.Logger) error {
	if err := SeedRoles(ctx, db); err != nil {
		return fmt.Errorf("seed roles: %w", err)
	}
	if log != nil {
		log.Info("rbac roles seeded")
	}

	assigned, err := BackfillOrgAdminRoles(ctx, db)
	if err != nil {
		return fmt.Errorf("backfill org_admin roles: %w", err)
	}
	if log != nil && assigned > 0 {
		log.Info("backfilled org_admin roles for organization members", "count", assigned)
	}

	return nil
}
