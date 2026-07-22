package usecase

import (
	"context"
	"testing"

	"github.com/google/uuid"
	profiledto "github.com/masterfabric-go/masterfabric/internal/application/projectprofile/dto"
	questdto "github.com/masterfabric-go/masterfabric/internal/application/questionnaire/dto"
	docRepo "github.com/masterfabric-go/masterfabric/internal/domain/document/repository"
	tenantModel "github.com/masterfabric-go/masterfabric/internal/domain/tenant/model"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestReadinessUseCase_Execute(t *testing.T) {
	orgID := uuid.New()
	wsID := uuid.New()
	qID := uuid.New()

	wsRepo := new(mockWorkspaceRepo)
	docRepoMock := new(mockDocumentRepo)
	wsRepo.On("GetByID", mock.Anything, wsID).Return(&tenantModel.Workspace{
		ID: wsID, OrganizationID: orgID,
	}, nil)
	docRepoMock.On("CountByWorkspace", mock.Anything, wsID).Return(&docRepo.WorkspaceDocumentStats{
		Succeeded: 2,
		Failed:    1,
	}, nil)

	uc := NewReadinessUseCase(
		stubCompleteness{result: &profiledto.CompletenessResult{Overall: 80}},
		stubMissing{result: &questdto.MissingInformationResult{
			Total:    20,
			Answered: 13,
			Missing: []questdto.MissingQuestionInfo{
				{QuestionID: qID, Category: "scope", Title: "Target users"},
			},
		}},
		docRepoMock,
		wsRepo,
	)

	result, err := uc.Execute(orgContext(orgID), wsID)
	require.NoError(t, err)
	assert.Equal(t, 78, result.Overall)
	assert.Equal(t, 80, result.Components.Profile)
	assert.Equal(t, 65, result.Components.Questionnaire)
	assert.Equal(t, 100, result.Components.Documents)
	assert.Equal(t, 2, result.SucceededDocumentCount)
	assert.Equal(t, 1, result.FailedDocumentCount)
	require.Len(t, result.MissingRequiredQuestions, 1)
	assert.Equal(t, qID, result.MissingRequiredQuestions[0].QuestionID)
	assert.False(t, result.ComputedAt.IsZero())
}

func TestReadinessUseCase_WrongOrg(t *testing.T) {
	orgID := uuid.New()
	otherOrg := uuid.New()
	wsID := uuid.New()

	wsRepo := new(mockWorkspaceRepo)
	wsRepo.On("GetByID", mock.Anything, wsID).Return(&tenantModel.Workspace{
		ID: wsID, OrganizationID: otherOrg,
	}, nil)

	uc := NewReadinessUseCase(
		stubCompleteness{},
		stubMissing{},
		new(mockDocumentRepo),
		wsRepo,
	)

	_, err := uc.Execute(orgContext(orgID), wsID)
	require.Error(t, err)
	assert.ErrorIs(t, err, domainErr.ErrForbidden)
}

func TestReadinessUseCase_MissingOrgContext(t *testing.T) {
	uc := NewReadinessUseCase(stubCompleteness{}, stubMissing{}, new(mockDocumentRepo), new(mockWorkspaceRepo))
	_, err := uc.Execute(context.Background(), uuid.New())
	require.Error(t, err)
	assert.ErrorIs(t, err, domainErr.ErrUnauthorized)
}
