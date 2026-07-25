package main

// seed.go - Database seeding script
// Run with: go run ./scripts
// (Uses multiple files in this package - do not run `go run scripts/seed.go`
// directly, or seed_questionnaire.go will not be compiled in.)

import (
	"context"
	"fmt"
	"log"
	"time"

	pgBootstrap "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/bootstrap"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	"github.com/masterfabric-go/masterfabric/internal/shared/database"
)

func main() {
	cfg := config.Load()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	db, err := database.NewPostgresPool(ctx, cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	fmt.Println("🌱 Seeding database...")

	if err := pgBootstrap.SeedRoles(ctx, db); err != nil {
		log.Fatalf("Failed to seed roles: %v", err)
	}
	if assigned, err := pgBootstrap.BackfillOrgAdminRoles(ctx, db); err != nil {
		log.Fatalf("Failed to backfill org_admin roles: %v", err)
	} else if assigned > 0 {
		fmt.Printf("  ✓ Backfilled org_admin for %d organization member(s)\n", assigned)
	}

	count, err := pgBootstrap.SeedQuestionnaires(ctx, db)
	if err != nil {
		log.Fatalf("Failed to seed questionnaires: %v", err)
	}
	if err := pgBootstrap.VerifyStudioDefault(ctx, db); err != nil {
		log.Fatalf("Questionnaire verification failed: %v", err)
	}
	fmt.Printf("  ✓ Seeded questionnaire set: %s (%d questions)\n", pgBootstrap.StudioDefaultSetKey, count)

	fmt.Println("✅ Database seeded successfully!")
}
