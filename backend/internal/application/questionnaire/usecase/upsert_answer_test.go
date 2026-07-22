package usecase

import (
	"encoding/json"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/questionnaire/dto"
	qmodel "github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/model"
	tenantModel "github.com/masterfabric-go/masterfabric/internal/domain/tenant/model"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestUpsertAnswerUseCase_Create(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	questionID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}
	question := &qmodel.Question{ID: questionID, Active: true}

	workspaceRepo := new(mockWorkspaceRepo)
	questionRepo := new(mockQuestionRepo)
	answerRepo := new(mockAnswerRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)
	questionRepo.On("GetByID", mock.Anything, questionID).Return(question, nil)
	answerRepo.On("GetByWorkspaceAndQuestion", mock.Anything, workspaceID, questionID).Return(nil, domainErr.ErrNotFound)
	answerRepo.On("Upsert", mock.Anything, mock.AnythingOfType("*model.Answer")).Return(nil)

	info, err := NewUpsertAnswerUseCase(answerRepo, questionRepo, workspaceRepo).Execute(
		orgContext(orgID),
		workspaceID,
		questionID,
		dto.UpsertAnswerRequest{Value: json.RawMessage(`"Reporter"`)},
	)

	require.NoError(t, err)
	require.NotNil(t, info)
	assert.Equal(t, orgID, info.OrganizationID)
	assert.Equal(t, workspaceID, info.WorkspaceID)
	assert.Equal(t, questionID, info.QuestionID)
	assert.JSONEq(t, `"Reporter"`, string(info.Value))
	answerRepo.AssertExpectations(t)
}

func TestUpsertAnswerUseCase_UpdateExisting(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	questionID := uuid.New()
	answerID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}
	question := &qmodel.Question{ID: questionID, Active: true}
	existing := &qmodel.Answer{
		ID:             answerID,
		OrganizationID: orgID,
		WorkspaceID:    workspaceID,
		QuestionID:     questionID,
		Value:          json.RawMessage(`"Old"`),
	}

	workspaceRepo := new(mockWorkspaceRepo)
	questionRepo := new(mockQuestionRepo)
	answerRepo := new(mockAnswerRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)
	questionRepo.On("GetByID", mock.Anything, questionID).Return(question, nil)
	answerRepo.On("GetByWorkspaceAndQuestion", mock.Anything, workspaceID, questionID).Return(existing, nil)
	answerRepo.On("Upsert", mock.Anything, mock.MatchedBy(func(a *qmodel.Answer) bool {
		return a.ID == answerID && string(a.Value) == `"New"`
	})).Return(nil)

	info, err := NewUpsertAnswerUseCase(answerRepo, questionRepo, workspaceRepo).Execute(
		orgContext(orgID),
		workspaceID,
		questionID,
		dto.UpsertAnswerRequest{Value: json.RawMessage(`"New"`)},
	)

	require.NoError(t, err)
	assert.Equal(t, answerID, info.ID)
	assert.JSONEq(t, `"New"`, string(info.Value))
}

func TestUpsertAnswerUseCase_QuestionNotFound(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	questionID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}

	workspaceRepo := new(mockWorkspaceRepo)
	questionRepo := new(mockQuestionRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)
	questionRepo.On("GetByID", mock.Anything, questionID).Return(nil, domainErr.New(domainErr.ErrNotFound, "question not found", nil))

	_, err := NewUpsertAnswerUseCase(new(mockAnswerRepo), questionRepo, workspaceRepo).Execute(
		orgContext(orgID),
		workspaceID,
		questionID,
		dto.UpsertAnswerRequest{Value: json.RawMessage(`"x"`)},
	)

	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrNotFound))
}

func TestUpsertAnswerUseCase_WrongOrg(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: uuid.New()}

	workspaceRepo := new(mockWorkspaceRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)

	_, err := NewUpsertAnswerUseCase(new(mockAnswerRepo), new(mockQuestionRepo), workspaceRepo).Execute(
		orgContext(orgID),
		workspaceID,
		uuid.New(),
		dto.UpsertAnswerRequest{Value: json.RawMessage(`"x"`)},
	)

	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrForbidden))
}

func TestUpsertAnswerUseCase_AllowsEmptyValue(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	questionID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}
	question := &qmodel.Question{ID: questionID, Active: true}

	workspaceRepo := new(mockWorkspaceRepo)
	questionRepo := new(mockQuestionRepo)
	answerRepo := new(mockAnswerRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)
	questionRepo.On("GetByID", mock.Anything, questionID).Return(question, nil)
	answerRepo.On("GetByWorkspaceAndQuestion", mock.Anything, workspaceID, questionID).Return(nil, domainErr.ErrNotFound)
	answerRepo.On("Upsert", mock.Anything, mock.MatchedBy(func(a *qmodel.Answer) bool {
		return qmodel.IsEmptyValue(a.Value)
	})).Return(nil)

	info, err := NewUpsertAnswerUseCase(answerRepo, questionRepo, workspaceRepo).Execute(
		orgContext(orgID),
		workspaceID,
		questionID,
		dto.UpsertAnswerRequest{Value: json.RawMessage(`null`)},
	)

	require.NoError(t, err)
	assert.True(t, qmodel.IsEmptyValue(info.Value))
}
