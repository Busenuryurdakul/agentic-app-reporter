package router

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type wiringAuthStub struct{}

func (wiringAuthStub) HashPassword(password string) (string, error) { return password, nil }
func (wiringAuthStub) VerifyPassword(hashedPassword, password string) error {
	if hashedPassword != password {
		return assert.AnError
	}
	return nil
}
func (wiringAuthStub) GenerateToken(ctx context.Context, claims service.TokenClaims) (string, error) {
	return "token", nil
}
func (wiringAuthStub) ValidateToken(ctx context.Context, token string) (*service.TokenClaims, error) {
	return &service.TokenClaims{}, nil
}

type wiringRBACStub struct{}

func (wiringRBACStub) HasPermission(ctx context.Context, userID, orgID uuid.UUID, permission string) (bool, error) {
	return false, nil
}
func (wiringRBACStub) HasAnyPermission(ctx context.Context, userID, orgID uuid.UUID, permissions []string) (bool, error) {
	return false, nil
}
func (wiringRBACStub) GetUserPermissions(ctx context.Context, userID, orgID uuid.UUID) ([]string, error) {
	return nil, nil
}
func (wiringRBACStub) InvalidateCache(ctx context.Context, userID, orgID uuid.UUID) error {
	return nil
}

func TestValidateSecureAuthWiring_AllowsNilInNonProduction(t *testing.T) {
	err := ValidateSecureAuthWiring(Dependencies{}, false)
	require.NoError(t, err)
}

func TestValidateSecureAuthWiring_RequiresAuthAndRBACInProduction(t *testing.T) {
	err := ValidateSecureAuthWiring(Dependencies{}, true)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "AuthService")

	err = ValidateSecureAuthWiring(Dependencies{AuthService: wiringAuthStub{}}, true)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "RBACService")

	err = ValidateSecureAuthWiring(Dependencies{
		AuthService: wiringAuthStub{},
		RBACService: wiringRBACStub{},
	}, true)
	require.NoError(t, err)
}
