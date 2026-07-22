package usecase

import (
	"testing"
	"time"

	"github.com/google/uuid"
	docModel "github.com/masterfabric-go/masterfabric/internal/domain/document/model"
	docRepo "github.com/masterfabric-go/masterfabric/internal/domain/document/repository"
	tenantModel "github.com/masterfabric-go/masterfabric/internal/domain/tenant/model"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestObserveSummaryUseCase_Execute(t *testing.T) {
	orgID := uuid.New()
	wsID := uuid.New()
	docID := uuid.New()
	successAt := time.Date(2026, 7, 22, 10, 0, 0, 0, time.UTC)
	failAt := time.Date(2026, 7, 21, 10, 0, 0, 0, time.UTC)

	wsRepo := new(mockWorkspaceRepo)
	docRepoMock := new(mockDocumentRepo)
	wsRepo.On("GetByID", mock.Anything, wsID).Return(&tenantModel.Workspace{
		ID: wsID, OrganizationID: orgID,
	}, nil)
	docRepoMock.On("CountByWorkspace", mock.Anything, wsID).Return(&docRepo.WorkspaceDocumentStats{
		Succeeded:     3,
		Failed:        1,
		Pending:       0,
		LastSuccessAt: &successAt,
		LastFailureAt: &failAt,
	}, nil)
	docRepoMock.On("CountProvidersByWorkspace", mock.Anything, wsID).Return([]docRepo.ProviderCount{
		{Name: "mock", Count: 4},
	}, nil)
	docRepoMock.On("ListByWorkspace", mock.Anything, wsID, 10).Return([]*docModel.GeneratedDocument{
		{
			ID:           docID,
			WorkspaceID:  wsID,
			Title:        "Studio Doc",
			DocumentType: docModel.DocumentTypeStudioMarkdown,
			Language:     "tr",
			Status:       docModel.StatusSucceeded,
			ProviderName: "mock",
			ModelName:    "mock-model",
			MarkdownBody: "SECRET BODY MUST NOT LEAK",
			CreatedAt:    successAt,
			UpdatedAt:    successAt,
		},
	}, nil)

	result, err := NewObserveSummaryUseCase(docRepoMock, wsRepo).Execute(orgContext(orgID), wsID, 0)
	require.NoError(t, err)
	assert.Equal(t, 3, result.Totals.Succeeded)
	assert.Equal(t, 1, result.Totals.Failed)
	assert.Equal(t, 0, result.Totals.Pending)
	require.NotNil(t, result.LastSuccessAt)
	assert.Equal(t, successAt, *result.LastSuccessAt)
	require.Len(t, result.Providers, 1)
	assert.Equal(t, "mock", result.Providers[0].Name)
	require.Len(t, result.Recent, 1)
	assert.Equal(t, docID, result.Recent[0].ID)
	assert.Equal(t, "Studio Doc", result.Recent[0].Title)
	assert.Equal(t, docModel.DocumentTypeStudioMarkdown, result.Recent[0].DocumentType)
	assert.Equal(t, docModel.StatusSucceeded, result.Recent[0].Status)
	// Recent DTO has no markdown_body field; quality is derived without leaking body.
	assert.False(t, result.Recent[0].Quality.HasHeading)
	assert.False(t, result.Recent[0].Quality.MinLengthOK)
	assert.True(t, result.Recent[0].Quality.LanguageDeclared)
	assert.Equal(t, 20, result.Recent[0].Quality.QualityScore)
}

func TestObserveSummaryUseCase_WrongOrg(t *testing.T) {
	orgID := uuid.New()
	wsID := uuid.New()
	wsRepo := new(mockWorkspaceRepo)
	wsRepo.On("GetByID", mock.Anything, wsID).Return(&tenantModel.Workspace{
		ID: wsID, OrganizationID: uuid.New(),
	}, nil)

	_, err := NewObserveSummaryUseCase(new(mockDocumentRepo), wsRepo).Execute(orgContext(orgID), wsID, 5)
	require.Error(t, err)
	assert.ErrorIs(t, err, domainErr.ErrForbidden)
}
