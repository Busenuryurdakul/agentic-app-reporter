package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/projectprofile/model"
	tenantModel "github.com/masterfabric-go/masterfabric/internal/domain/tenant/model"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/stretchr/testify/mock"
)

type mockWorkspaceRepo struct {
	mock.Mock
}

func (m *mockWorkspaceRepo) Create(ctx context.Context, workspace *tenantModel.Workspace) error {
	return m.Called(ctx, workspace).Error(0)
}

func (m *mockWorkspaceRepo) GetByID(ctx context.Context, id uuid.UUID) (*tenantModel.Workspace, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*tenantModel.Workspace), args.Error(1)
}

func (m *mockWorkspaceRepo) GetBySlug(ctx context.Context, orgID uuid.UUID, slug string) (*tenantModel.Workspace, error) {
	args := m.Called(ctx, orgID, slug)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*tenantModel.Workspace), args.Error(1)
}

func (m *mockWorkspaceRepo) ListByOrganization(ctx context.Context, orgID uuid.UUID) ([]*tenantModel.Workspace, error) {
	args := m.Called(ctx, orgID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*tenantModel.Workspace), args.Error(1)
}

func (m *mockWorkspaceRepo) Update(ctx context.Context, workspace *tenantModel.Workspace) error {
	return m.Called(ctx, workspace).Error(0)
}

func (m *mockWorkspaceRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}

type mockProfileRepo struct {
	mock.Mock
}

func (m *mockProfileRepo) GetByWorkspaceID(ctx context.Context, workspaceID uuid.UUID) (*model.Profile, error) {
	args := m.Called(ctx, workspaceID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Profile), args.Error(1)
}

func (m *mockProfileRepo) Upsert(ctx context.Context, profile *model.Profile) error {
	return m.Called(ctx, profile).Error(0)
}

func orgContext(orgID uuid.UUID) context.Context {
	return context.WithValue(context.Background(), middleware.ContextKeyTenantID, orgID)
}
