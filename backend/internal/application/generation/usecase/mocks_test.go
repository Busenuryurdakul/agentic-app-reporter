package usecase

import (
	"context"

	"github.com/google/uuid"
	profileModel "github.com/masterfabric-go/masterfabric/internal/domain/projectprofile/model"
	qmodel "github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/model"
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

type mockProfileRepo struct{ mock.Mock }

func (m *mockProfileRepo) GetByWorkspaceID(ctx context.Context, workspaceID uuid.UUID) (*profileModel.Profile, error) {
	args := m.Called(ctx, workspaceID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*profileModel.Profile), args.Error(1)
}
func (m *mockProfileRepo) Upsert(ctx context.Context, profile *profileModel.Profile) error {
	return m.Called(ctx, profile).Error(0)
}

type mockSetRepo struct{ mock.Mock }

func (m *mockSetRepo) GetByID(ctx context.Context, id uuid.UUID) (*qmodel.QuestionnaireSet, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*qmodel.QuestionnaireSet), args.Error(1)
}
func (m *mockSetRepo) GetByKey(ctx context.Context, key string) (*qmodel.QuestionnaireSet, error) {
	args := m.Called(ctx, key)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*qmodel.QuestionnaireSet), args.Error(1)
}
func (m *mockSetRepo) GetDefault(ctx context.Context, orgID uuid.UUID) (*qmodel.QuestionnaireSet, error) {
	args := m.Called(ctx, orgID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*qmodel.QuestionnaireSet), args.Error(1)
}
func (m *mockSetRepo) List(ctx context.Context, orgID uuid.UUID) ([]*qmodel.QuestionnaireSet, error) {
	args := m.Called(ctx, orgID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*qmodel.QuestionnaireSet), args.Error(1)
}

type mockQuestionRepo struct{ mock.Mock }

func (m *mockQuestionRepo) GetByID(ctx context.Context, id uuid.UUID) (*qmodel.Question, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*qmodel.Question), args.Error(1)
}
func (m *mockQuestionRepo) ListBySetID(ctx context.Context, setID uuid.UUID) ([]*qmodel.Question, error) {
	args := m.Called(ctx, setID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*qmodel.Question), args.Error(1)
}
func (m *mockQuestionRepo) ListRequiredActiveBySetID(ctx context.Context, setID uuid.UUID) ([]*qmodel.Question, error) {
	args := m.Called(ctx, setID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*qmodel.Question), args.Error(1)
}

type mockAnswerRepo struct{ mock.Mock }

func (m *mockAnswerRepo) GetByWorkspaceAndQuestion(ctx context.Context, workspaceID, questionID uuid.UUID) (*qmodel.Answer, error) {
	args := m.Called(ctx, workspaceID, questionID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*qmodel.Answer), args.Error(1)
}
func (m *mockAnswerRepo) ListByWorkspace(ctx context.Context, workspaceID uuid.UUID) ([]*qmodel.Answer, error) {
	args := m.Called(ctx, workspaceID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*qmodel.Answer), args.Error(1)
}
func (m *mockAnswerRepo) Upsert(ctx context.Context, answer *qmodel.Answer) error {
	return m.Called(ctx, answer).Error(0)
}
func (m *mockAnswerRepo) BulkUpsert(ctx context.Context, answers []*qmodel.Answer) error {
	return m.Called(ctx, answers).Error(0)
}

func orgContext(orgID uuid.UUID) context.Context {
	return context.WithValue(context.Background(), middleware.ContextKeyTenantID, orgID)
}
