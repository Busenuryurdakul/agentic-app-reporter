package main

// seed_questionnaire.go - seeds the default "studio-default" questionnaire
// set used by the AI Development Configuration Studio. Invoked from
// seed.go's main().

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/seedcatalog"
)

// studioDefaultSetKey is the well-known key of the built-in questionnaire set.
const studioDefaultSetKey = "studio-default"

// SeedQuestionnaires upserts the built-in "studio-default" questionnaire set,
// its questions, and options. Matching is by stable question key so existing
// answer rows keep their question_id. Questions not present in the catalog are
// deactivated (never deleted). Safe to run multiple times.
func SeedQuestionnaires(ctx context.Context, db *pgxpool.Pool) error {
	questions, err := seedcatalog.LoadStudioDefault()
	if err != nil {
		return err
	}

	setID, err := upsertQuestionnaireSet(ctx, db, studioDefaultSetKey,
		"AI Development Configuration Studio - Varsayılan Soru Seti",
		"Proje profili ve teknik yapılandırma bilgilerini toplamak için varsayılan soru seti.",
	)
	if err != nil {
		return fmt.Errorf("upsert questionnaire set: %w", err)
	}

	activeKeys := make([]string, 0, len(questions))
	for _, q := range questions {
		questionID, err := upsertQuestionByKey(ctx, db, setID, q)
		if err != nil {
			return fmt.Errorf("upsert question %q: %w", q.Key, err)
		}
		activeKeys = append(activeKeys, q.Key)

		if err := replaceQuestionOptions(ctx, db, questionID, q.Options); err != nil {
			return fmt.Errorf("replace options for question %q: %w", q.Key, err)
		}
	}

	if err := deactivateMissingQuestions(ctx, db, setID, activeKeys); err != nil {
		return fmt.Errorf("deactivate obsolete questions: %w", err)
	}

	fmt.Printf("  ✓ Seeded questionnaire set: %s (%d questions)\n", studioDefaultSetKey, len(questions))
	return nil
}

func upsertQuestionnaireSet(ctx context.Context, db *pgxpool.Pool, key, title, description string) (uuid.UUID, error) {
	var id uuid.UUID
	err := db.QueryRow(ctx, `
		INSERT INTO questionnaire_sets (id, organization_id, key, title, description, is_default, active, created_at, updated_at)
		VALUES ($1, NULL, $2, $3, $4, TRUE, TRUE, NOW(), NOW())
		ON CONFLICT (key) DO UPDATE SET
			title = EXCLUDED.title,
			description = EXCLUDED.description,
			is_default = TRUE,
			active = TRUE,
			updated_at = NOW()
		RETURNING id
	`, uuid.New(), key, title, description).Scan(&id)
	if err != nil {
		return uuid.Nil, err
	}
	return id, nil
}

func upsertQuestionByKey(ctx context.Context, db *pgxpool.Pool, setID uuid.UUID, q seedcatalog.Question) (uuid.UUID, error) {
	visibility := seedcatalog.VisibilityRulesJSON(q.ConditionalRule)

	var existingID uuid.UUID
	err := db.QueryRow(ctx, `
		SELECT id FROM questions WHERE set_id = $1 AND key = $2
	`, setID, q.Key).Scan(&existingID)

	if err == nil {
		_, updateErr := db.Exec(ctx, `
			UPDATE questions
			SET category = $2,
			    title = $3,
			    description = $4,
			    input_type = $5,
			    required = $6,
			    display_order = $7,
			    visibility_rules = $8::jsonb,
			    help_text = $9,
			    example_answer = $10,
			    active = TRUE,
			    updated_at = NOW()
			WHERE id = $1
		`, existingID, q.Category, q.Title, q.Description, q.Type, q.Required, q.Order, string(visibility), "", "")
		if updateErr != nil {
			return uuid.Nil, updateErr
		}
		return existingID, nil
	}
	if err != pgx.ErrNoRows {
		return uuid.Nil, err
	}

	newID := uuid.New()
	_, err = db.Exec(ctx, `
		INSERT INTO questions (
			id, set_id, key, category, title, description, input_type, required, display_order,
			validation_rules, visibility_rules, help_text, example_answer, active, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, '{}'::jsonb, $10::jsonb, $11, $12, TRUE, NOW(), NOW()
		)
	`, newID, setID, q.Key, q.Category, q.Title, q.Description, q.Type, q.Required, q.Order, string(visibility), "", "")
	if err != nil {
		return uuid.Nil, err
	}
	return newID, nil
}

func deactivateMissingQuestions(ctx context.Context, db *pgxpool.Pool, setID uuid.UUID, activeKeys []string) error {
	_, err := db.Exec(ctx, `
		UPDATE questions
		SET active = FALSE, updated_at = NOW()
		WHERE set_id = $1
		  AND active = TRUE
		  AND NOT (key = ANY($2))
	`, setID, activeKeys)
	return err
}

// replaceQuestionOptions deletes and re-inserts a question's options, which
// keeps this seed idempotent without requiring a unique constraint on
// (question_id, value).
func replaceQuestionOptions(ctx context.Context, db *pgxpool.Pool, questionID uuid.UUID, options []seedcatalog.Option) error {
	if _, err := db.Exec(ctx, `DELETE FROM question_options WHERE question_id = $1`, questionID); err != nil {
		return err
	}

	for i, opt := range options {
		_, err := db.Exec(ctx, `
			INSERT INTO question_options (id, question_id, value, label, display_order, created_at)
			VALUES ($1, $2, $3, $4, $5, NOW())
		`, uuid.New(), questionID, opt.Value, opt.Label, i+1)
		if err != nil {
			return err
		}
	}
	return nil
}
