package projectprofile

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/masterfabric-go/masterfabric/internal/domain/projectprofile/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/projectprofile/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

var _ repository.ProfileRepository = (*ProfileRepository)(nil)

// ProfileRepository implements repository.ProfileRepository with PostgreSQL.
type ProfileRepository struct {
	db *pgxpool.Pool
}

// NewProfileRepository creates a new ProfileRepository.
func NewProfileRepository(db *pgxpool.Pool) *ProfileRepository {
	return &ProfileRepository{db: db}
}

const profileColumns = `
	id, organization_id, workspace_id, project_name, project_description,
	product_type, target_users, main_problem, main_use_cases, project_status,
	preferred_document_language, frontend, backend, data, infrastructure, ai,
	development_standards, created_at, updated_at`

func scanProfile(row pgx.Row) (*model.Profile, error) {
	var p model.Profile
	err := row.Scan(
		&p.ID,
		&p.OrganizationID,
		&p.WorkspaceID,
		&p.ProjectName,
		&p.ProjectDescription,
		&p.ProductType,
		&p.TargetUsers,
		&p.MainProblem,
		&p.MainUseCases,
		&p.ProjectStatus,
		&p.PreferredDocumentLanguage,
		&p.Frontend,
		&p.Backend,
		&p.Data,
		&p.Infrastructure,
		&p.AI,
		&p.DevelopmentStandards,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// GetByWorkspaceID retrieves the project profile for a workspace.
func (r *ProfileRepository) GetByWorkspaceID(ctx context.Context, workspaceID uuid.UUID) (*model.Profile, error) {
	query := `SELECT ` + profileColumns + ` FROM project_profiles WHERE workspace_id = $1`
	profile, err := scanProfile(r.db.QueryRow(ctx, query, workspaceID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "project profile not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to get project profile", err)
	}
	return profile, nil
}

// Upsert creates the profile if it does not exist for the workspace, or
// updates the existing one otherwise, keyed on the workspace_id unique
// constraint.
func (r *ProfileRepository) Upsert(ctx context.Context, profile *model.Profile) error {
	if profile.ID == uuid.Nil {
		profile.ID = uuid.New()
	}
	now := time.Now().UTC()
	if profile.CreatedAt.IsZero() {
		profile.CreatedAt = now
	}
	profile.UpdatedAt = now

	query := `
		INSERT INTO project_profiles (
			id, organization_id, workspace_id, project_name, project_description,
			product_type, target_users, main_problem, main_use_cases, project_status,
			preferred_document_language, frontend, backend, data, infrastructure, ai,
			development_standards, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
		)
		ON CONFLICT (workspace_id) DO UPDATE SET
			project_name = EXCLUDED.project_name,
			project_description = EXCLUDED.project_description,
			product_type = EXCLUDED.product_type,
			target_users = EXCLUDED.target_users,
			main_problem = EXCLUDED.main_problem,
			main_use_cases = EXCLUDED.main_use_cases,
			project_status = EXCLUDED.project_status,
			preferred_document_language = EXCLUDED.preferred_document_language,
			frontend = EXCLUDED.frontend,
			backend = EXCLUDED.backend,
			data = EXCLUDED.data,
			infrastructure = EXCLUDED.infrastructure,
			ai = EXCLUDED.ai,
			development_standards = EXCLUDED.development_standards,
			updated_at = EXCLUDED.updated_at
		RETURNING id, created_at
	`
	row := r.db.QueryRow(ctx, query,
		profile.ID,
		profile.OrganizationID,
		profile.WorkspaceID,
		profile.ProjectName,
		profile.ProjectDescription,
		profile.ProductType,
		profile.TargetUsers,
		profile.MainProblem,
		profile.MainUseCases,
		profile.ProjectStatus,
		profile.PreferredDocumentLanguage,
		normalizeSection(profile.Frontend),
		normalizeSection(profile.Backend),
		normalizeSection(profile.Data),
		normalizeSection(profile.Infrastructure),
		normalizeSection(profile.AI),
		normalizeSection(profile.DevelopmentStandards),
		profile.CreatedAt,
		profile.UpdatedAt,
	)
	if err := row.Scan(&profile.ID, &profile.CreatedAt); err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to upsert project profile", err)
	}
	return nil
}

// normalizeSection ensures a JSONB section column is never sent as an empty
// byte slice (which pgx/postgres would reject as invalid JSON).
func normalizeSection(raw []byte) []byte {
	if len(raw) == 0 {
		return model.EmptyJSONObject
	}
	return raw
}
