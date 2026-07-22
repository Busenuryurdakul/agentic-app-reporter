package main

// seed.go - Database seeding script
// Run with: go run scripts/seed.go

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	"github.com/masterfabric-go/masterfabric/internal/shared/database"
)

// System role templates use a nil scope_id so they can be assigned per organization.
var systemScopeID = uuid.Nil

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

	if err := seedRoles(ctx, db); err != nil {
		log.Fatalf("Failed to seed roles: %v", err)
	}

	fmt.Println("✅ Database seeded successfully!")
}

func seedRoles(ctx context.Context, db *pgxpool.Pool) error {
	productPlaceholders := []string{
		"workspace:read",
		"workspace:write",
		"profile:read",
		"profile:write",
		"questionnaire:read",
		"questionnaire:write",
		"answer:read",
		"answer:write",
		"document:read",
		"document:write",
		"document:approve",
		"generation:run",
		"generation:read",
		"export:create",
		"integration:read",
		"integration:write",
		"monitoring:read",
		"scoring:read",
	}

	roles := []struct {
		name        string
		description string
		permissions []string
	}{
		{
			name:        "admin",
			description: "Full system administrator",
			permissions: []string{"*"},
		},
		{
			name:        "org_admin",
			description: "Organization administrator",
			permissions: append([]string{"org:*", "app:*", "user:*", "workspace:*", "endpoint:*"}, productPlaceholders...),
		},
		{
			name:        "app_admin",
			description: "Application administrator",
			permissions: []string{"app:*", "endpoint:*", "workspace:read"},
		},
		{
			name:        "developer",
			description: "Developer with read/write access",
			permissions: []string{
				"workspace:read",
				"workspace:write",
				"profile:read",
				"profile:write",
				"questionnaire:read",
				"questionnaire:write",
				"answer:read",
				"answer:write",
				"document:read",
				"document:write",
				"generation:run",
				"generation:read",
				"export:create",
				"endpoint:read",
				"endpoint:write",
			},
		},
		{
			name:        "viewer",
			description: "Read-only access",
			permissions: []string{"*:read"},
		},
	}

	for _, r := range roles {
		roleID, err := upsertRole(ctx, db, r.name, r.description)
		if err != nil {
			return err
		}

		for _, perm := range r.permissions {
			_, err := db.Exec(ctx, `
				INSERT INTO role_permissions (role_id, permission, created_at)
				VALUES ($1, $2, NOW())
				ON CONFLICT (role_id, permission) DO NOTHING
			`, roleID, perm)
			if err != nil {
				return fmt.Errorf("insert permission %s for role %s: %w", perm, r.name, err)
			}
		}

		fmt.Printf("  ✓ Seeded role: %s\n", r.name)
	}

	return nil
}

func upsertRole(ctx context.Context, db *pgxpool.Pool, name, description string) (uuid.UUID, error) {
	var roleID uuid.UUID
	err := db.QueryRow(ctx, `
		SELECT id FROM roles
		WHERE scope_type = 'organization' AND scope_id = $1 AND name = $2
	`, systemScopeID, name).Scan(&roleID)
	if err == nil {
		_, updateErr := db.Exec(ctx, `
			UPDATE roles SET description = $2, updated_at = NOW() WHERE id = $1
		`, roleID, description)
		if updateErr != nil {
			return uuid.Nil, fmt.Errorf("update role %s: %w", name, updateErr)
		}
		return roleID, nil
	}
	if err != pgx.ErrNoRows {
		return uuid.Nil, fmt.Errorf("lookup role %s: %w", name, err)
	}

	roleID = uuid.New()
	_, err = db.Exec(ctx, `
		INSERT INTO roles (id, scope_type, scope_id, name, description, created_at, updated_at)
		VALUES ($1, 'organization', $2, $3, $4, NOW(), NOW())
	`, roleID, systemScopeID, name, description)
	if err != nil {
		return uuid.Nil, fmt.Errorf("insert role %s: %w", name, err)
	}
	return roleID, nil
}
