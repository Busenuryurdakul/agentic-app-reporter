package usecase

import (
	"context"

	"github.com/google/uuid"
	profiledto "github.com/masterfabric-go/masterfabric/internal/application/projectprofile/dto"
	questdto "github.com/masterfabric-go/masterfabric/internal/application/questionnaire/dto"
	docModel "github.com/masterfabric-go/masterfabric/internal/domain/document/model"
	docRepo "github.com/masterfabric-go/masterfabric/internal/domain/document/repository"
	tenantModel "github.com/masterfabric-go/masterfabric/internal/domain/tenant/model"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/stretchr/testify/mock"
)

type mockWorkspaceRepo struct{ mock.Mock }

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

type mockDocumentRepo struct{ mock.Mock }

func (m *mockDocumentRepo) Create(ctx context.Context, doc *docModel.GeneratedDocument) error {
	return m.Called(ctx, doc).Error(0)
}
func (m *mockDocumentRepo) GetByID(ctx context.Context, id uuid.UUID) (*docModel.GeneratedDocument, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*docModel.GeneratedDocument), args.Error(1)
}
func (m *mockDocumentRepo) ListByWorkspace(ctx context.Context, workspaceID uuid.UUID, limit int) ([]*docModel.GeneratedDocument, error) {
	args := m.Called(ctx, workspaceID, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*docModel.GeneratedDocument), args.Error(1)
}
func (m *mockDocumentRepo) CountByWorkspace(ctx context.Context, workspaceID uuid.UUID) (*docRepo.WorkspaceDocumentStats, error) {
	args := m.Called(ctx, workspaceID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*docRepo.WorkspaceDocumentStats), args.Error(1)
}
func (m *mockDocumentRepo) CountProvidersByWorkspace(ctx context.Context, workspaceID uuid.UUID) ([]docRepo.ProviderCount, error) {
	args := m.Called(ctx, workspaceID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]docRepo.ProviderCount), args.Error(1)
}
func (m *mockDocumentRepo) UpdateApproval(ctx context.Context, doc *docModel.GeneratedDocument) error {
	return m.Called(ctx, doc).Error(0)
}

type stubCompleteness struct {
	result *profiledto.CompletenessResult
	err    error
}

func (s stubCompleteness) Execute(ctx context.Context, workspaceID uuid.UUID) (*profiledto.CompletenessResult, error) {
	return s.result, s.err
}

type stubMissing struct {
	result *questdto.MissingInformationResult
	err    error
}

func (s stubMissing) Execute(ctx context.Context, workspaceID uuid.UUID) (*questdto.MissingInformationResult, error) {
	return s.result, s.err
}

func orgContext(orgID uuid.UUID) context.Context {
	return context.WithValue(context.Background(), middleware.ContextKeyTenantID, orgID)
}
