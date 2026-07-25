// Command seed-questionnaire upserts the studio-default questionnaire set.
// Idempotent — safe to run after every deploy or migration.
//
// Usage:
//
//	cd backend
//	DATABASE_URL=postgres://... go run ./cmd/seed-questionnaire
//
// On Render (binary in Docker image):
//
//	/app/seed-questionnaire
package main

import (
	"context"
	"fmt"
	"os"
	"time"

	pgBootstrap "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/bootstrap"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	"github.com/masterfabric-go/masterfabric/internal/shared/database"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "seed-questionnaire failed: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	db, err := database.NewPostgresPool(ctx, cfg.Database)
	if err != nil {
		return fmt.Errorf("connect to database: %w", err)
	}
	defer db.Close()

	count, err := pgBootstrap.SeedQuestionnaires(ctx, db)
	if err != nil {
		return fmt.Errorf("seed %q: %w", pgBootstrap.StudioDefaultSetKey, err)
	}

	if err := pgBootstrap.VerifyStudioDefault(ctx, db); err != nil {
		return fmt.Errorf("verify %q: %w", pgBootstrap.StudioDefaultSetKey, err)
	}

	fmt.Printf("OK: questionnaire set %q seeded and verified (%d questions)\n",
		pgBootstrap.StudioDefaultSetKey, count)
	return nil
}
