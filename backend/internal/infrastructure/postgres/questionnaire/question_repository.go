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

var _ repository.QuestionRepository = (*QuestionRepository)(nil)

// QuestionRepository implements repository.QuestionRepository with PostgreSQL.
type QuestionRepository struct {
	db *pgxpool.Pool
}

// NewQuestionRepository creates a new QuestionRepository.
func NewQuestionRepository(db *pgxpool.Pool) *QuestionRepository {
	return &QuestionRepository{db: db}
}

const questionColumns = `
	id, set_id, key, category, title, description, input_type, required, display_order,
	validation_rules, visibility_rules, help_text, example_answer, active, created_at, updated_at`

func scanQuestion(row pgx.Row) (*model.Question, error) {
	var q model.Question
	err := row.Scan(
		&q.ID, &q.SetID, &q.Key, &q.Category, &q.Title, &q.Description, &q.InputType, &q.Required, &q.DisplayOrder,
		&q.ValidationRules, &q.VisibilityRules, &q.HelpText, &q.ExampleAnswer, &q.Active, &q.CreatedAt, &q.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &q, nil
}

const optionColumns = `id, question_id, value, label, display_order, created_at`

func scanOption(rows pgx.Rows) (*model.QuestionOption, error) {
	var o model.QuestionOption
	if err := rows.Scan(&o.ID, &o.QuestionID, &o.Value, &o.Label, &o.DisplayOrder, &o.CreatedAt); err != nil {
		return nil, err
	}
	return &o, nil
}

// GetByID retrieves a single question (with its options) by ID.
func (r *QuestionRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Question, error) {
	query := `SELECT ` + questionColumns + ` FROM questions WHERE id = $1`
	q, err := scanQuestion(r.db.QueryRow(ctx, query, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "question not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to get question", err)
	}

	options, err := r.listOptions(ctx, []uuid.UUID{q.ID})
	if err != nil {
		return nil, err
	}
	q.Options = options[q.ID]

	return q, nil
}

// ListBySetID lists all active questions (with their options) for a set,
// ordered by category and display order.
func (r *QuestionRepository) ListBySetID(ctx context.Context, setID uuid.UUID) ([]*model.Question, error) {
	return r.listBySet(ctx, setID, false)
}

// ListRequiredActiveBySetID lists only the required, active questions for a set.
func (r *QuestionRepository) ListRequiredActiveBySetID(ctx context.Context, setID uuid.UUID) ([]*model.Question, error) {
	return r.listBySet(ctx, setID, true)
}

func (r *QuestionRepository) listBySet(ctx context.Context, setID uuid.UUID, requiredOnly bool) ([]*model.Question, error) {
	query := `SELECT ` + questionColumns + ` FROM questions WHERE set_id = $1 AND active = TRUE`
	if requiredOnly {
		query += ` AND required = TRUE`
	}
	query += ` ORDER BY display_order ASC, category ASC`

	rows, err := r.db.Query(ctx, query, setID)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list questions", err)
	}
	defer rows.Close()

	var questions []*model.Question
	ids := make([]uuid.UUID, 0)
	for rows.Next() {
		q, err := scanQuestion(rows)
		if err != nil {
			return nil, domainErr.New(domainErr.ErrInternal, "failed to scan question", err)
		}
		questions = append(questions, q)
		ids = append(ids, q.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list questions", err)
	}

	if len(ids) == 0 {
		return questions, nil
	}

	optionsByQuestion, err := r.listOptions(ctx, ids)
	if err != nil {
		return nil, err
	}
	for _, q := range questions {
		q.Options = optionsByQuestion[q.ID]
	}

	return questions, nil
}

func (r *QuestionRepository) listOptions(ctx context.Context, questionIDs []uuid.UUID) (map[uuid.UUID][]*model.QuestionOption, error) {
	result := make(map[uuid.UUID][]*model.QuestionOption)
	if len(questionIDs) == 0 {
		return result, nil
	}

	query := `SELECT ` + optionColumns + ` FROM question_options WHERE question_id = ANY($1) ORDER BY display_order ASC`
	rows, err := r.db.Query(ctx, query, questionIDs)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list question options", err)
	}
	defer rows.Close()

	for rows.Next() {
		opt, err := scanOption(rows)
		if err != nil {
			return nil, domainErr.New(domainErr.ErrInternal, "failed to scan question option", err)
		}
		result[opt.QuestionID] = append(result[opt.QuestionID], opt)
	}
	return result, rows.Err()
}
