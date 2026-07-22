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

func TestBulkUpsertAnswersUseCase_Success(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	q1 := uuid.New()
	q2 := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}

	workspaceRepo := new(mockWorkspaceRepo)
	answerRepo := new(mockAnswerRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)
	answerRepo.On("BulkUpsert", mock.Anything, mock.MatchedBy(func(answers []*qmodel.Answer) bool {
		return len(answers) == 2 &&
			answers[0].QuestionID == q1 &&
			answers[1].QuestionID == q2 &&
			answers[0].OrganizationID == orgID &&
			answers[0].WorkspaceID == workspaceID
	})).Return(nil)

	result, err := NewBulkUpsertAnswersUseCase(answerRepo, workspaceRepo).Execute(orgContext(orgID), workspaceID, dto.BulkUpsertAnswersRequest{
		Answers: []dto.BulkAnswerItem{
			{QuestionID: q1, Value: json.RawMessage(`"A"`)},
			{QuestionID: q2, Value: json.RawMessage(`true`)},
		},
	})

	require.NoError(t, err)
	require.Len(t, result, 2)
	assert.Equal(t, q1, result[0].QuestionID)
	assert.Equal(t, q2, result[1].QuestionID)
	answerRepo.AssertExpectations(t)
}

func TestBulkUpsertAnswersUseCase_EmptyList(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}

	workspaceRepo := new(mockWorkspaceRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)

	_, err := NewBulkUpsertAnswersUseCase(new(mockAnswerRepo), workspaceRepo).Execute(orgContext(orgID), workspaceID, dto.BulkUpsertAnswersRequest{
		Answers: []dto.BulkAnswerItem{},
	})

	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrValidation))
	assert.Contains(t, err.Error(), "at least one answer is required")
}

func TestBulkUpsertAnswersUseCase_NilQuestionID(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}

	workspaceRepo := new(mockWorkspaceRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)

	_, err := NewBulkUpsertAnswersUseCase(new(mockAnswerRepo), workspaceRepo).Execute(orgContext(orgID), workspaceID, dto.BulkUpsertAnswersRequest{
		Answers: []dto.BulkAnswerItem{
			{QuestionID: uuid.Nil, Value: json.RawMessage(`"x"`)},
		},
	})

	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrValidation))
	assert.Contains(t, err.Error(), "question_id is required")
}

func TestBulkUpsertAnswersUseCase_WrongOrg(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: uuid.New()}

	workspaceRepo := new(mockWorkspaceRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)

	_, err := NewBulkUpsertAnswersUseCase(new(mockAnswerRepo), workspaceRepo).Execute(orgContext(orgID), workspaceID, dto.BulkUpsertAnswersRequest{
		Answers: []dto.BulkAnswerItem{{QuestionID: uuid.New(), Value: json.RawMessage(`"x"`)}},
	})

	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrForbidden))
}

func TestBulkUpsertAnswersUseCase_IdempotentUpsertShape(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	q1 := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}

	workspaceRepo := new(mockWorkspaceRepo)
	answerRepo := new(mockAnswerRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)
	// Bulk always builds fresh Answer rows and delegates uniqueness to BulkUpsert.
	answerRepo.On("BulkUpsert", mock.Anything, mock.MatchedBy(func(answers []*qmodel.Answer) bool {
		return len(answers) == 1 && answers[0].QuestionID == q1 && answers[0].ID != uuid.Nil
	})).Return(nil)

	result, err := NewBulkUpsertAnswersUseCase(answerRepo, workspaceRepo).Execute(orgContext(orgID), workspaceID, dto.BulkUpsertAnswersRequest{
		Answers: []dto.BulkAnswerItem{{QuestionID: q1, Value: json.RawMessage(`"again"`)}},
	})

	require.NoError(t, err)
	require.Len(t, result, 1)
	assert.Equal(t, q1, result[0].QuestionID)
}
