package iam

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// UserAPIKeyRepo implements repository.UserAPIKeyRepository with PostgreSQL.
type UserAPIKeyRepo struct {
	db *pgxpool.Pool
}

// NewUserAPIKeyRepo creates a new UserAPIKeyRepo.
func NewUserAPIKeyRepo(db *pgxpool.Pool) *UserAPIKeyRepo {
	return &UserAPIKeyRepo{db: db}
}

func (r *UserAPIKeyRepo) Create(ctx context.Context, key *model.UserAPIKey) error {
	if key.ID == uuid.Nil {
		key.ID = uuid.New()
	}
	key.CreatedAt = time.Now().UTC()

	_, err := r.db.Exec(ctx,
		`INSERT INTO user_api_keys (id, user_id, key_hash, name, scopes, expires_at, is_active, last_used_at, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		key.ID, key.UserID, key.KeyHash, key.Name, key.Scopes, key.ExpiresAt, key.IsActive, key.LastUsedAt, key.CreatedAt,
	)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to create user api key", err)
	}
	return nil
}

func (r *UserAPIKeyRepo) GetByID(ctx context.Context, id uuid.UUID) (*model.UserAPIKey, error) {
	var k model.UserAPIKey
	err := r.db.QueryRow(ctx,
		`SELECT id, user_id, key_hash, name, scopes, expires_at, is_active, last_used_at, created_at
		 FROM user_api_keys WHERE id = $1`, id,
	).Scan(&k.ID, &k.UserID, &k.KeyHash, &k.Name, &k.Scopes, &k.ExpiresAt, &k.IsActive, &k.LastUsedAt, &k.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "api key not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to get user api key", err)
	}
	return &k, nil
}

func (r *UserAPIKeyRepo) GetByHash(ctx context.Context, hash string) (*model.UserAPIKey, error) {
	var k model.UserAPIKey
	err := r.db.QueryRow(ctx,
		`SELECT id, user_id, key_hash, name, scopes, expires_at, is_active, last_used_at, created_at
		 FROM user_api_keys WHERE key_hash = $1 AND is_active = true`, hash,
	).Scan(&k.ID, &k.UserID, &k.KeyHash, &k.Name, &k.Scopes, &k.ExpiresAt, &k.IsActive, &k.LastUsedAt, &k.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "api key not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to get user api key by hash", err)
	}
	return &k, nil
}

func (r *UserAPIKeyRepo) Revoke(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`UPDATE user_api_keys SET is_active = false WHERE id = $1`, id,
	)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to revoke user api key", err)
	}
	return nil
}

func (r *UserAPIKeyRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]*model.UserAPIKey, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, key_hash, name, scopes, expires_at, is_active, last_used_at, created_at
		 FROM user_api_keys WHERE user_id = $1 ORDER BY created_at DESC`, userID,
	)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list user api keys", err)
	}
	defer rows.Close()

	var keys []*model.UserAPIKey
	for rows.Next() {
		var k model.UserAPIKey
		if err := rows.Scan(&k.ID, &k.UserID, &k.KeyHash, &k.Name, &k.Scopes, &k.ExpiresAt, &k.IsActive, &k.LastUsedAt, &k.CreatedAt); err != nil {
			return nil, domainErr.New(domainErr.ErrInternal, "failed to scan user api key", err)
		}
		keys = append(keys, &k)
	}
	return keys, nil
}

func (r *UserAPIKeyRepo) TouchLastUsed(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`UPDATE user_api_keys SET last_used_at = NOW() WHERE id = $1`, id,
	)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to update api key last used", err)
	}
	return nil
}
