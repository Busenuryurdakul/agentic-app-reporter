package questionnaire

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

var _ repository.SetRepository = (*SetRepository)(nil)

// SetRepository implements repository.SetRepository with PostgreSQL.
type SetRepository struct {
	db *pgxpool.Pool
}

// NewSetRepository creates a new SetRepository.
func NewSetRepository(db *pgxpool.Pool) *SetRepository {
	return &SetRepository{db: db}
}

const setColumns = `id, organization_id, key, title, description, is_default, active, created_at, updated_at`

func scanSet(row pgx.Row) (*model.QuestionnaireSet, error) {
	var s model.QuestionnaireSet
	err := row.Scan(&s.ID, &s.OrganizationID, &s.Key, &s.Title, &s.Description, &s.IsDefault, &s.Active, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// GetByID retrieves a questionnaire set by ID.
func (r *SetRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.QuestionnaireSet, error) {
	query := `SELECT ` + setColumns + ` FROM questionnaire_sets WHERE id = $1`
	set, err := scanSet(r.db.QueryRow(ctx, query, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "questionnaire set not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to get questionnaire set", err)
	}
	return set, nil
}

// GetByKey retrieves a questionnaire set by its unique key.
func (r *SetRepository) GetByKey(ctx context.Context, key string) (*model.QuestionnaireSet, error) {
	query := `SELECT ` + setColumns + ` FROM questionnaire_sets WHERE key = $1`
	set, err := scanSet(r.db.QueryRow(ctx, query, key))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "questionnaire set not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to get questionnaire set", err)
	}
	return set, nil
}

// GetDefault returns the default active questionnaire set visible to an
// organization. Organization-specific default sets take precedence over the
// global default set.
func (r *SetRepository) GetDefault(ctx context.Context, orgID uuid.UUID) (*model.QuestionnaireSet, error) {
	query := `
		SELECT ` + setColumns + `
		FROM questionnaire_sets
		WHERE active = TRUE AND is_default = TRUE AND (organization_id = $1 OR organization_id IS NULL)
		ORDER BY organization_id NULLS LAST
		LIMIT 1
	`
	set, err := scanSet(r.db.QueryRow(ctx, query, orgID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "no default questionnaire set configured", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to get default questionnaire set", err)
	}
	return set, nil
}

// List returns all active questionnaire sets visible to an organization
// (global sets plus any organization-scoped sets).
func (r *SetRepository) List(ctx context.Context, orgID uuid.UUID) ([]*model.QuestionnaireSet, error) {
	query := `
		SELECT ` + setColumns + `
		FROM questionnaire_sets
		WHERE active = TRUE AND (organization_id = $1 OR organization_id IS NULL)
		ORDER BY is_default DESC, title ASC
	`
	rows, err := r.db.Query(ctx, query, orgID)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list questionnaire sets", err)
	}
	defer rows.Close()

	var sets []*model.QuestionnaireSet
	for rows.Next() {
		s, err := scanSet(rows)
		if err != nil {
			return nil, domainErr.New(domainErr.ErrInternal, "failed to scan questionnaire set", err)
		}
		sets = append(sets, s)
	}
	return sets, rows.Err()
}
