package usecase_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/iam/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/iam/usecase"
	iamModel "github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type memoryUserAPIKeyRepo struct {
	keys map[uuid.UUID]*iamModel.UserAPIKey
}

func (m *memoryUserAPIKeyRepo) Create(_ context.Context, key *iamModel.UserAPIKey) error {
	if m.keys == nil {
		m.keys = make(map[uuid.UUID]*iamModel.UserAPIKey)
	}
	if key.ID == uuid.Nil {
		key.ID = uuid.New()
	}
	copyKey := *key
	m.keys[key.ID] = &copyKey
	return nil
}

func (m *memoryUserAPIKeyRepo) GetByID(_ context.Context, id uuid.UUID) (*iamModel.UserAPIKey, error) {
	key, ok := m.keys[id]
	if !ok {
		return nil, domainErr.New(domainErr.ErrNotFound, "api key not found", nil)
	}
	copyKey := *key
	return &copyKey, nil
}

func (m *memoryUserAPIKeyRepo) GetByHash(_ context.Context, hash string) (*iamModel.UserAPIKey, error) {
	for _, key := range m.keys {
		if key.KeyHash == hash && key.IsActive {
			copyKey := *key
			return &copyKey, nil
		}
	}
	return nil, domainErr.New(domainErr.ErrNotFound, "api key not found", nil)
}

func (m *memoryUserAPIKeyRepo) Revoke(_ context.Context, id uuid.UUID) error {
	key, ok := m.keys[id]
	if !ok {
		return domainErr.New(domainErr.ErrNotFound, "api key not found", nil)
	}
	key.IsActive = false
	return nil
}

func (m *memoryUserAPIKeyRepo) ListByUser(_ context.Context, userID uuid.UUID) ([]*iamModel.UserAPIKey, error) {
	var out []*iamModel.UserAPIKey
	for _, key := range m.keys {
		if key.UserID == userID {
			copyKey := *key
			out = append(out, &copyKey)
		}
	}
	return out, nil
}

func (m *memoryUserAPIKeyRepo) TouchLastUsed(context.Context, uuid.UUID) error {
	return nil
}

func TestManageUserAPIKeys_CreateListRevoke(t *testing.T) {
	t.Parallel()

	repo := &memoryUserAPIKeyRepo{}
	uc := usecase.NewManageUserAPIKeysUseCase(repo)
	userID := uuid.New()

	created, err := uc.CreateKey(context.Background(), userID, dto.CreateUserAPIKeyRequest{Name: "cursor"})
	require.NoError(t, err)
	require.NotEmpty(t, created.Key)
	assert.True(t, usecase.IsUserAPIKey(created.Key))
	assert.Equal(t, "cursor", created.Name)

	listed, err := uc.ListKeys(context.Background(), userID)
	require.NoError(t, err)
	require.Len(t, listed, 1)
	assert.Empty(t, listed[0].Key)

	otherUser := uuid.New()
	err = uc.RevokeKey(context.Background(), otherUser, created.ID)
	require.Error(t, err)

	err = uc.RevokeKey(context.Background(), userID, created.ID)
	require.NoError(t, err)
}
