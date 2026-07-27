package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	"github.com/masterfabric-go/masterfabric/internal/shared/database"
)

func main() {
	cfg := config.Load()
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	db, err := database.NewPostgresPool(ctx, cfg.Database)
	if err != nil {
		fmt.Fprintf(os.Stderr, "db connect failed: %v\n", err)
		os.Exit(1)
	}
	defer db.Close()

	var exists bool
	err = db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_schema = current_schema() AND table_name = 'organization_llm_settings'
		)`).Scan(&exists)
	if err != nil {
		fmt.Fprintf(os.Stderr, "table check failed: %v\n", err)
		os.Exit(1)
	}
	if !exists {
		fmt.Println("FAIL organization_llm_settings table missing")
		os.Exit(1)
	}
	fmt.Println("PASS organization_llm_settings table exists")

	rows, err := db.Query(ctx, `
		SELECT r.name, rp.permission
		FROM roles r
		JOIN role_permissions rp ON rp.role_id = r.id
		WHERE rp.permission LIKE 'llm:%'
		ORDER BY r.name, rp.permission`)
	if err != nil {
		fmt.Fprintf(os.Stderr, "permissions query failed: %v\n", err)
		os.Exit(1)
	}
	defer rows.Close()

	type permRow struct {
		role, perm string
	}
	var perms []permRow
	for rows.Next() {
		var p permRow
		if err := rows.Scan(&p.role, &p.perm); err != nil {
			fmt.Fprintf(os.Stderr, "scan failed: %v\n", err)
			os.Exit(1)
		}
		perms = append(perms, p)
	}
	if len(perms) == 0 {
		fmt.Println("FAIL no llm:* permissions found — run go run ./scripts")
		os.Exit(1)
	}
	for _, p := range perms {
		fmt.Printf("PERM %s %s\n", p.role, p.perm)
	}

	var devRoleID, viewerRoleID uuid.UUID
	err = db.QueryRow(ctx, `
		SELECT id FROM roles
		WHERE scope_type = 'organization' AND scope_id = $1 AND name = 'developer'
	`, uuid.Nil).Scan(&devRoleID)
	if err != nil && err != pgx.ErrNoRows {
		fmt.Fprintf(os.Stderr, "developer role lookup failed: %v\n", err)
		os.Exit(1)
	}
	err = db.QueryRow(ctx, `
		SELECT id FROM roles
		WHERE scope_type = 'organization' AND scope_id = $1 AND name = 'viewer'
	`, uuid.Nil).Scan(&viewerRoleID)
	if err != nil && err != pgx.ErrNoRows {
		fmt.Fprintf(os.Stderr, "viewer role lookup failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("ROLE_ID developer=%s\n", devRoleID)
	fmt.Printf("ROLE_ID viewer=%s\n", viewerRoleID)
}
