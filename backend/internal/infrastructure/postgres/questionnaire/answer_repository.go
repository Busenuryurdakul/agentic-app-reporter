package questionnaire

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

var _ repository.AnswerRepository = (*AnswerRepository)(nil)

// AnswerRepository implements repository.AnswerRepository with PostgreSQL.
type AnswerRepository struct {
	db *pgxpool.Pool
}

// NewAnswerRepository creates a new AnswerRepository.
func NewAnswerRepository(db *pgxpool.Pool) *AnswerRepository {
	return &AnswerRepository{db: db}
}

const answerColumns = `id, organization_id, workspace_id, question_id, value, created_at, updated_at`

func scanAnswer(row pgx.Row) (*model.Answer, error) {
	var a model.Answer
	err := row.Scan(&a.ID, &a.OrganizationID, &a.WorkspaceID, &a.QuestionID, &a.Value, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

// GetByWorkspaceAndQuestion retrieves a single answer.
func (r *AnswerRepository) GetByWorkspaceAndQuestion(ctx context.Context, workspaceID, questionID uuid.UUID) (*model.Answer, error) {
	query := `SELECT ` + answerColumns + ` FROM answers WHERE workspace_id = $1 AND question_id = $2`
	answer, err := scanAnswer(r.db.QueryRow(ctx, query, workspaceID, questionID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "answer not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to get answer", err)
	}
	return answer, nil
}

// ListByWorkspace lists all answers recorded for a workspace.
func (r *AnswerRepository) ListByWorkspace(ctx context.Context, workspaceID uuid.UUID) ([]*model.Answer, error) {
	query := `SELECT ` + answerColumns + ` FROM answers WHERE workspace_id = $1`
	rows, err := r.db.Query(ctx, query, workspaceID)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list answers", err)
	}
	defer rows.Close()

	var answers []*model.Answer
	for rows.Next() {
		a, err := scanAnswer(rows)
		if err != nil {
			return nil, domainErr.New(domainErr.ErrInternal, "failed to scan answer", err)
		}
		answers = append(answers, a)
	}
	return answers, rows.Err()
}

// Upsert creates or updates a single answer, keyed on (workspace_id, question_id).
func (r *AnswerRepository) Upsert(ctx context.Context, answer *model.Answer) error {
	if answer.ID == uuid.Nil {
		answer.ID = uuid.New()
	}
	now := time.Now().UTC()
	if answer.CreatedAt.IsZero() {
		answer.CreatedAt = now
	}
	answer.UpdatedAt = now

	value := answer.Value
	if len(value) == 0 {
		value = []byte("null")
	}

	query := `
		INSERT INTO answers (id, organization_id, workspace_id, question_id, value, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (workspace_id, question_id) DO UPDATE SET
			value = EXCLUDED.value,
			updated_at = EXCLUDED.updated_at
		RETURNING id, organization_id, created_at
	`
	row := r.db.QueryRow(ctx, query,
		answer.ID, answer.OrganizationID, answer.WorkspaceID, answer.QuestionID, value, answer.CreatedAt, answer.UpdatedAt,
	)
	if err := row.Scan(&answer.ID, &answer.OrganizationID, &answer.CreatedAt); err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to upsert answer", err)
	}
	return nil
}

// BulkUpsert creates or updates multiple answers within a single transaction.
func (r *AnswerRepository) BulkUpsert(ctx context.Context, answers []*model.Answer) error {
	if len(answers) == 0 {
		return nil
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to begin transaction", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	now := time.Now().UTC()
	query := `
		INSERT INTO answers (id, organization_id, workspace_id, question_id, value, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (workspace_id, question_id) DO UPDATE SET
			value = EXCLUDED.value,
			updated_at = EXCLUDED.updated_at
		RETURNING id, organization_id, created_at
	`

	for _, answer := range answers {
		if answer.ID == uuid.Nil {
			answer.ID = uuid.New()
		}
		if answer.CreatedAt.IsZero() {
			answer.CreatedAt = now
		}
		answer.UpdatedAt = now

		value := answer.Value
		if len(value) == 0 {
			value = []byte("null")
		}

		row := tx.QueryRow(ctx, query,
			answer.ID, answer.OrganizationID, answer.WorkspaceID, answer.QuestionID, value, answer.CreatedAt, answer.UpdatedAt,
		)
		if err := row.Scan(&answer.ID, &answer.OrganizationID, &answer.CreatedAt); err != nil {
			return domainErr.New(domainErr.ErrInternal, "failed to bulk upsert answers", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to commit answers transaction", err)
	}
	return nil
}
