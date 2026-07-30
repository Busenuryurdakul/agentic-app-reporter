package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/iam/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	iamRepo "github.com/masterfabric-go/masterfabric/internal/domain/iam/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// ManageUserAPIKeysUseCase handles user-scoped API key CRUD.
type ManageUserAPIKeysUseCase struct {
	keyRepo iamRepo.UserAPIKeyRepository
}

// NewManageUserAPIKeysUseCase creates a new ManageUserAPIKeysUseCase.
func NewManageUserAPIKeysUseCase(keyRepo iamRepo.UserAPIKeyRepository) *ManageUserAPIKeysUseCase {
	return &ManageUserAPIKeysUseCase{keyRepo: keyRepo}
}

// CreateKey creates a new API key for the authenticated user.
func (uc *ManageUserAPIKeysUseCase) CreateKey(ctx context.Context, userID uuid.UUID, req dto.CreateUserAPIKeyRequest) (*dto.UserAPIKeyResponse, error) {
	rawKey, err := generateUserAPIKey()
	if err != nil {
		return nil, fmt.Errorf("generate user api key: %w", err)
	}

	scopes, err := NormalizeUserAPIKeyScopes(req.Scopes)
	if err != nil {
		return nil, err
	}
	scopeBytes, err := encodeUserAPIKeyScopes(scopes)
	if err != nil {
		return nil, err
	}

	var expiresAt *time.Time
	if req.ExpiresAt != nil && *req.ExpiresAt != "" {
		parsed, parseErr := time.Parse(time.RFC3339, *req.ExpiresAt)
		if parseErr != nil {
			return nil, domainErr.New(domainErr.ErrBadRequest, "expires_at must be RFC3339", parseErr)
		}
		parsed = parsed.UTC()
		if !parsed.After(time.Now().UTC()) {
			return nil, domainErr.New(domainErr.ErrBadRequest, "expires_at must be in the future", nil)
		}
		expiresAt = &parsed
	}

	key := &model.UserAPIKey{
		UserID:    userID,
		KeyHash:   hashUserAPIKey(rawKey),
		Name:      req.Name,
		Scopes:    scopeBytes,
		ExpiresAt: expiresAt,
		IsActive:  true,
	}

	if err := uc.keyRepo.Create(ctx, key); err != nil {
		return nil, err
	}

	return &dto.UserAPIKeyResponse{
		ID:        key.ID,
		UserID:    key.UserID,
		Name:      key.Name,
		Scopes:    scopes,
		Key:       rawKey,
		ExpiresAt: key.ExpiresAt,
		IsActive:  key.IsActive,
		CreatedAt: key.CreatedAt,
	}, nil
}

// RevokeKey revokes a user's API key after ownership check.
func (uc *ManageUserAPIKeysUseCase) RevokeKey(ctx context.Context, userID, keyID uuid.UUID) error {
	key, err := uc.keyRepo.GetByID(ctx, keyID)
	if err != nil {
		return err
	}
	if key.UserID != userID {
		return domainErr.New(domainErr.ErrForbidden, "api key does not belong to user", nil)
	}
	return uc.keyRepo.Revoke(ctx, keyID)
}

// ListKeys lists API keys for a user (never returns raw key material).
func (uc *ManageUserAPIKeysUseCase) ListKeys(ctx context.Context, userID uuid.UUID) ([]*dto.UserAPIKeyResponse, error) {
	keys, err := uc.keyRepo.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	result := make([]*dto.UserAPIKeyResponse, 0, len(keys))
	for _, k := range keys {
		result = append(result, &dto.UserAPIKeyResponse{
			ID:         k.ID,
			UserID:     k.UserID,
			Name:       k.Name,
			Scopes:     decodeUserAPIKeyScopes(k.Scopes),
			ExpiresAt:  k.ExpiresAt,
			IsActive:   k.IsActive,
			LastUsedAt: k.LastUsedAt,
			CreatedAt:  k.CreatedAt,
		})
	}
	return result, nil
}
