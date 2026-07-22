package usecase

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/tenant/dto"
	iamModel "github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/tenant/model"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/events"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

type mockOrgUserRepo struct {
	mock.Mock
}

func (m *mockOrgUserRepo) Add(ctx context.Context, orgUser *iamModel.OrganizationUser) error {
	return m.Called(ctx, orgUser).Error(0)
}

func (m *mockOrgUserRepo) Remove(ctx context.Context, orgID, userID uuid.UUID) error {
	return m.Called(ctx, orgID, userID).Error(0)
}

func (m *mockOrgUserRepo) GetByOrgAndUser(ctx context.Context, orgID, userID uuid.UUID) (*iamModel.OrganizationUser, error) {
	args := m.Called(ctx, orgID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*iamModel.OrganizationUser), args.Error(1)
}

func (m *mockOrgUserRepo) ListByOrg(ctx context.Context, orgID uuid.UUID, offset, limit int) ([]*iamModel.OrganizationUser, int, error) {
	args := m.Called(ctx, orgID, offset, limit)
	return args.Get(0).([]*iamModel.OrganizationUser), args.Int(1), args.Error(2)
}

func (m *mockOrgUserRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]*iamModel.OrganizationUser, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*iamModel.OrganizationUser), args.Error(1)
}

type mockRoleRepo struct {
	mock.Mock
}

func (m *mockRoleRepo) Create(ctx context.Context, role *iamModel.Role) error {
	return m.Called(ctx, role).Error(0)
}

func (m *mockRoleRepo) GetByID(ctx context.Context, id uuid.UUID) (*iamModel.Role, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*iamModel.Role), args.Error(1)
}

func (m *mockRoleRepo) GetByName(ctx context.Context, scopeType iamModel.ScopeType, scopeID uuid.UUID, name string) (*iamModel.Role, error) {
	args := m.Called(ctx, scopeType, scopeID, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*iamModel.Role), args.Error(1)
}

func (m *mockRoleRepo) ListByScope(ctx context.Context, scopeType iamModel.ScopeType, scopeID uuid.UUID) ([]*iamModel.Role, error) {
	args := m.Called(ctx, scopeType, scopeID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*iamModel.Role), args.Error(1)
}

func (m *mockRoleRepo) Update(ctx context.Context, role *iamModel.Role) error {
	return m.Called(ctx, role).Error(0)
}

func (m *mockRoleRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}

func (m *mockRoleRepo) AddPermission(ctx context.Context, roleID uuid.UUID, permission string) error {
	return m.Called(ctx, roleID, permission).Error(0)
}

func (m *mockRoleRepo) RemovePermission(ctx context.Context, roleID uuid.UUID, permission string) error {
	return m.Called(ctx, roleID, permission).Error(0)
}

func (m *mockRoleRepo) GetPermissions(ctx context.Context, roleID uuid.UUID) ([]string, error) {
	args := m.Called(ctx, roleID)
	return args.Get(0).([]string), args.Error(1)
}

func (m *mockRoleRepo) AssignRoleToUser(ctx context.Context, userRole *iamModel.UserRole) error {
	return m.Called(ctx, userRole).Error(0)
}

func (m *mockRoleRepo) RemoveRoleFromUser(ctx context.Context, userID, roleID uuid.UUID) error {
	return m.Called(ctx, userID, roleID).Error(0)
}

func (m *mockRoleRepo) GetUserRoles(ctx context.Context, userID, orgID uuid.UUID) ([]*iamModel.UserRole, error) {
	args := m.Called(ctx, userID, orgID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*iamModel.UserRole), args.Error(1)
}

func (m *mockRoleRepo) GetUserPermissions(ctx context.Context, userID, orgID uuid.UUID) ([]string, error) {
	args := m.Called(ctx, userID, orgID)
	return args.Get(0).([]string), args.Error(1)
}

func TestCreateOrgUseCase_AssignsMembershipAndOrgAdmin(t *testing.T) {
	orgRepo := new(mockOrgRepo)
	orgUserRepo := new(mockOrgUserRepo)
	roleRepo := new(mockRoleRepo)
	eventBus := &mockEventBus{}

	userID := uuid.New()
	roleID := uuid.New()

	orgRepo.On("GetBySlug", mock.Anything, "acme").Return(nil, domainErr.ErrNotFound)
	orgRepo.On("Create", mock.Anything, mock.AnythingOfType("*model.Organization")).
		Run(func(args mock.Arguments) {
			org := args.Get(1).(*model.Organization)
			// Mirror postgres OrgRepo.Create: assign ID when caller leaves it empty.
			if org.ID == uuid.Nil {
				org.ID = uuid.New()
			}
		}).
		Return(nil)

	orgUserRepo.On("Add", mock.Anything, mock.MatchedBy(func(ou *iamModel.OrganizationUser) bool {
		return ou.UserID == userID && ou.Status == iamModel.OrgUserStatusActive
	})).Return(nil)

	roleRepo.On("GetByName", mock.Anything, iamModel.ScopeTypeOrganization, SystemRoleScopeID, "org_admin").
		Return(&iamModel.Role{ID: roleID, Name: "org_admin"}, nil)

	roleRepo.On("AssignRoleToUser", mock.Anything, mock.MatchedBy(func(ur *iamModel.UserRole) bool {
		return ur.UserID == userID && ur.RoleID == roleID && ur.OrganizationID != uuid.Nil
	})).Return(nil)

	uc := NewCreateOrgUseCase(orgRepo, orgUserRepo, roleRepo, eventBus)
	ctx := context.WithValue(context.Background(), middleware.ContextKeyUserID, userID)

	result, err := uc.Execute(ctx, dto.CreateOrgRequest{Name: "Acme", Slug: "acme"})

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "Acme", result.Name)
	assert.Equal(t, "acme", result.Slug)

	orgRepo.AssertExpectations(t)
	orgUserRepo.AssertExpectations(t)
	roleRepo.AssertExpectations(t)
	assert.Len(t, eventBus.publishedEvents, 1)
}

func TestCreateOrgUseCase_RequiresAuth(t *testing.T) {
	uc := NewCreateOrgUseCase(new(mockOrgRepo), new(mockOrgUserRepo), new(mockRoleRepo), &mockEventBus{})
	_, err := uc.Execute(context.Background(), dto.CreateOrgRequest{Name: "Acme", Slug: "acme"})
	require.Error(t, err)
	assert.ErrorIs(t, err, domainErr.ErrUnauthorized)
}

// Ensure mockEventBus still satisfies events.EventBus in this file's package.
var _ events.EventBus = (*mockEventBus)(nil)
