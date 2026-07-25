//go:build integration

package document_test

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/repository"
	pgDocument "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/document"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func integrationPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://masterfabric:masterfabric@localhost:5432/masterfabric?sslmode=disable"
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	t.Cleanup(cancel)
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Skipf("postgres not available: %v", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		t.Skipf("postgres ping failed: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func TestListForPEFTExport_RejectsNilOrganization(t *testing.T) {
	t.Parallel()
	repo := pgDocument.NewDocumentRepository(integrationPool(t))
	_, err := repo.ListForPEFTExport(context.Background(), repository.PEFTExportFilter{})
	require.Error(t, err)
	var de *domainErr.DomainError
	require.ErrorAs(t, err, &de)
	assert.ErrorIs(t, de, domainErr.ErrValidation)
}

func TestListForPEFTExport_FiltersApprovedProductSpecOnly(t *testing.T) {
	pool := integrationPool(t)
	repo := pgDocument.NewDocumentRepository(pool)
	ctx := context.Background()

	orgID := uuid.New()
	wsID := uuid.New()
	now := time.Now().UTC()

	_, err := pool.Exec(ctx, `
		INSERT INTO organizations (id, name, slug, created_at, updated_at)
		VALUES ($1, 'PEFT IT Org', $2, $3, $3)
		ON CONFLICT (id) DO NOTHING`,
		orgID, "peft-it-"+orgID.String()[:8], now)
	require.NoError(t, err)
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM generated_documents WHERE organization_id = $1`, orgID)
		_, _ = pool.Exec(context.Background(), `DELETE FROM workspaces WHERE organization_id = $1`, orgID)
		_, _ = pool.Exec(context.Background(), `DELETE FROM organizations WHERE id = $1`, orgID)
	})

	_, err = pool.Exec(ctx, `
		INSERT INTO workspaces (id, organization_id, name, slug, created_at, updated_at)
		VALUES ($1, $2, 'PEFT IT WS', $3, $4, $4)`,
		wsID, orgID, "peft-it-ws-"+wsID.String()[:8], now)
	require.NoError(t, err)

	insertDoc := func(id uuid.UUID, docType, status, approval, body string, approvedAt *time.Time) {
		_, err := pool.Exec(ctx, `
			INSERT INTO generated_documents (
				id, organization_id, workspace_id, title, document_type, language, status,
				markdown_body, provider_name, model_name, source_fingerprint,
				approval_status, approved_at, created_at, updated_at
			) VALUES ($1,$2,$3,'IT',$4,'tr',$5,$6,'mock','mock','fp',$7,$8,$9,$9)`,
			id, orgID, wsID, docType, status, body, approval, approvedAt, now)
		require.NoError(t, err)
	}

	approvedAt := now.Add(-time.Hour)
	insertDoc(uuid.New(), model.DocumentTypeProductSpec, model.StatusSucceeded, model.ApprovalApproved, "# Spec\n"+longBody(), &approvedAt)
	insertDoc(uuid.New(), model.DocumentTypeStudioMarkdown, model.StatusSucceeded, model.ApprovalApproved, longBody(), &approvedAt)
	insertDoc(uuid.New(), model.DocumentTypeProductSpec, model.StatusSucceeded, model.ApprovalDraft, longBody(), nil)
	insertDoc(uuid.New(), model.DocumentTypeProductSpec, model.StatusSucceeded, model.ApprovalApproved, "", &approvedAt)

	out, err := repo.ListForPEFTExport(ctx, repository.PEFTExportFilter{OrganizationID: orgID})
	require.NoError(t, err)
	require.Len(t, out, 1)
	assert.Equal(t, model.DocumentTypeProductSpec, out[0].DocumentType)
	assert.Equal(t, model.ApprovalApproved, out[0].ApprovalStatus)
}

func TestListForPEFTExport_RespectsSinceAndWorkspace(t *testing.T) {
	pool := integrationPool(t)
	repo := pgDocument.NewDocumentRepository(pool)
	ctx := context.Background()

	orgID := uuid.New()
	wsA := uuid.New()
	wsB := uuid.New()
	now := time.Now().UTC()

	seedOrgWS(t, pool, orgID, wsA, wsB, now)
	t.Cleanup(func() { cleanupOrg(t, pool, orgID) })

	oldApproved := now.Add(-48 * time.Hour)
	newApproved := now.Add(-2 * time.Hour)
	insertPEFTDoc(t, pool, orgID, wsA, oldApproved, now)
	insertPEFTDoc(t, pool, orgID, wsB, newApproved, now)

	since := now.Add(-24 * time.Hour)
	out, err := repo.ListForPEFTExport(ctx, repository.PEFTExportFilter{
		OrganizationID: orgID,
		WorkspaceID:    &wsB,
		Since:          &since,
	})
	require.NoError(t, err)
	require.Len(t, out, 1)
	assert.Equal(t, wsB, out[0].WorkspaceID)
}

func TestListForPEFTExport_OrdersByApprovedAt(t *testing.T) {
	pool := integrationPool(t)
	repo := pgDocument.NewDocumentRepository(pool)
	ctx := context.Background()

	orgID := uuid.New()
	wsID := uuid.New()
	now := time.Now().UTC()
	seedOrgWS(t, pool, orgID, wsID, uuid.New(), now)
	t.Cleanup(func() { cleanupOrg(t, pool, orgID) })

	first := now.Add(-3 * time.Hour)
	second := now.Add(-1 * time.Hour)
	insertPEFTDoc(t, pool, orgID, wsID, second, now)
	insertPEFTDoc(t, pool, orgID, wsID, first, now)

	out, err := repo.ListForPEFTExport(ctx, repository.PEFTExportFilter{OrganizationID: orgID})
	require.NoError(t, err)
	require.Len(t, out, 2)
	assert.True(t, out[0].ApprovedAt.Before(*out[1].ApprovedAt) || out[0].ApprovedAt.Equal(*out[1].ApprovedAt))
}

func longBody() string {
	return "# Title\n\n" + strings.Repeat("x", 220)
}

func seedOrgWS(t *testing.T, pool *pgxpool.Pool, orgID, wsA, wsB uuid.UUID, now time.Time) {
	t.Helper()
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		INSERT INTO organizations (id, name, slug, created_at, updated_at)
		VALUES ($1, 'PEFT IT Org', $2, $3, $3)`,
		orgID, "peft-it-"+orgID.String()[:8], now)
	require.NoError(t, err)
	for _, ws := range []uuid.UUID{wsA, wsB} {
		_, err = pool.Exec(ctx, `
			INSERT INTO workspaces (id, organization_id, name, slug, created_at, updated_at)
			VALUES ($1, $2, 'PEFT IT WS', $3, $4, $4)`,
			ws, orgID, "peft-it-ws-"+ws.String()[:8], now)
		require.NoError(t, err)
	}
}

func insertPEFTDoc(t *testing.T, pool *pgxpool.Pool, orgID, wsID uuid.UUID, approvedAt, now time.Time) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO generated_documents (
			id, organization_id, workspace_id, title, document_type, language, status,
			markdown_body, provider_name, model_name, source_fingerprint,
			approval_status, approved_at, created_at, updated_at
		) VALUES ($1,$2,$3,'IT','product_spec','tr','succeeded',$4,'mock','mock','fp','approved',$5,$6,$6)`,
		uuid.New(), orgID, wsID, longBody(), approvedAt, now)
	require.NoError(t, err)
}

func cleanupOrg(t *testing.T, pool *pgxpool.Pool, orgID uuid.UUID) {
	t.Helper()
	ctx := context.Background()
	_, _ = pool.Exec(ctx, `DELETE FROM generated_documents WHERE organization_id = $1`, orgID)
	_, _ = pool.Exec(ctx, `DELETE FROM workspaces WHERE organization_id = $1`, orgID)
	_, _ = pool.Exec(ctx, `DELETE FROM organizations WHERE id = $1`, orgID)
}
