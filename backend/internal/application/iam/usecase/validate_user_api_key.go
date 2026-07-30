package usecase

import (
	"context"
	"time"

	"github.com/masterfabric-go/masterfabric/internal/domain/iam/repository"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// ValidateUserAPIKeyUseCase validates a raw user API key and returns auth claims.
type ValidateUserAPIKeyUseCase struct {
	keyRepo  repository.UserAPIKeyRepository
	userRepo repository.UserRepository
}

// NewValidateUserAPIKeyUseCase creates a new ValidateUserAPIKeyUseCase.
func NewValidateUserAPIKeyUseCase(keyRepo repository.UserAPIKeyRepository, userRepo repository.UserRepository) *ValidateUserAPIKeyUseCase {
	return &ValidateUserAPIKeyUseCase{keyRepo: keyRepo, userRepo: userRepo}
}

// Execute validates the API key and returns JWT-compatible claims for middleware.
func (uc *ValidateUserAPIKeyUseCase) ValidateUserAPIKey(ctx context.Context, rawKey string) (*service.TokenClaims, error) {
	if !IsUserAPIKey(rawKey) {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "invalid api key format", nil)
	}

	key, err := uc.keyRepo.GetByHash(ctx, hashUserAPIKey(rawKey))
	if err != nil {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "invalid api key", nil)
	}

	if key.ExpiresAt != nil && key.ExpiresAt.Before(time.Now().UTC()) {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "api key expired", nil)
	}

	user, err := uc.userRepo.GetByID(ctx, key.UserID)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "invalid api key", nil)
	}
	if !user.IsActive() {
		return nil, domainErr.New(domainErr.ErrForbidden, "account is not active", nil)
	}

	// Fire-and-forget last-used update; do not block auth on audit write.
	keyID := key.ID
	go func() {
		_ = uc.keyRepo.TouchLastUsed(context.Background(), keyID)
	}()

	return &service.TokenClaims{
		UserID:      key.UserID,
		Email:       user.Email,
		Permissions: decodeUserAPIKeyScopes(key.Scopes),
	}, nil
}
