package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
)

// UserAPIKeyRepository persists user-scoped API keys.
type UserAPIKeyRepository interface {
	Create(ctx context.Context, key *model.UserAPIKey) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.UserAPIKey, error)
	GetByHash(ctx context.Context, hash string) (*model.UserAPIKey, error)
	Revoke(ctx context.Context, id uuid.UUID) error
	ListByUser(ctx context.Context, userID uuid.UUID) ([]*model.UserAPIKey, error)
	TouchLastUsed(ctx context.Context, id uuid.UUID) error
}
