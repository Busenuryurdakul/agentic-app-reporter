package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/model"
)

// SetRepository defines the interface for questionnaire set persistence.
type SetRepository interface {
	// GetByID retrieves a questionnaire set by ID.
	GetByID(ctx context.Context, id uuid.UUID) (*model.QuestionnaireSet, error)

	// GetByKey retrieves a questionnaire set by its unique key.
	GetByKey(ctx context.Context, key string) (*model.QuestionnaireSet, error)

	// GetDefault returns the default active questionnaire set visible to an
	// organization (global default sets have a nil organization scope).
	GetDefault(ctx context.Context, orgID uuid.UUID) (*model.QuestionnaireSet, error)

	// List returns all active questionnaire sets visible to an organization.
	List(ctx context.Context, orgID uuid.UUID) ([]*model.QuestionnaireSet, error)
}
