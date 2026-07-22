package usecase

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	docModel "github.com/masterfabric-go/masterfabric/internal/domain/document/model"
	tenantModel "github.com/masterfabric-go/masterfabric/internal/domain/tenant/model"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestApproveDocument_Succeeds(t *testing.T) {
	orgID := uuid.New()
	wsID := uuid.New()
	docID := uuid.New()
	userID := uuid.New()

	wsRepo := new(mockWorkspaceRepo)
	docRepo := new(mockDocumentRepo)
	wsRepo.On("GetByID", mock.Anything, wsID).Return(&tenantModel.Workspace{
		ID: wsID, OrganizationID: orgID,
	}, nil)
	docRepo.On("GetByID", mock.Anything, docID).Return(&docModel.GeneratedDocument{
		ID: docID, OrganizationID: orgID, WorkspaceID: wsID,
		Status: docModel.StatusSucceeded, ApprovalStatus: docModel.ApprovalDraft,
		Title: "Doc", Language: "tr",
	}, nil)
	docRepo.On("UpdateApproval", mock.Anything, mock.AnythingOfType("*model.GeneratedDocument")).
		Run(func(args mock.Arguments) {
			doc := args.Get(1).(*docModel.GeneratedDocument)
			assert.Equal(t, docModel.ApprovalApproved, doc.ApprovalStatus)
			require.NotNil(t, doc.ApprovedAt)
			require.NotNil(t, doc.ApprovedBy)
			assert.Equal(t, userID, *doc.ApprovedBy)
		}).
		Return(nil)

	ctx := context.WithValue(orgContext(orgID), middleware.ContextKeyUserID, userID)
	out, err := NewApproveDocumentUseCase(docRepo, wsRepo).Execute(ctx, wsID, docID)
	require.NoError(t, err)
	assert.Equal(t, docModel.ApprovalApproved, out.ApprovalStatus)
	require.NotNil(t, out.ApprovedAt)
	require.NotNil(t, out.ApprovedBy)
	assert.Equal(t, userID, *out.ApprovedBy)
}

func TestApproveDocument_IdempotentWhenAlreadyApproved(t *testing.T) {
	orgID := uuid.New()
	wsID := uuid.New()
	docID := uuid.New()
	approvedAt := time.Date(2026, 7, 1, 12, 0, 0, 0, time.UTC)
	approver := uuid.New()

	wsRepo := new(mockWorkspaceRepo)
	docRepo := new(mockDocumentRepo)
	wsRepo.On("GetByID", mock.Anything, wsID).Return(&tenantModel.Workspace{
		ID: wsID, OrganizationID: orgID,
	}, nil)
	docRepo.On("GetByID", mock.Anything, docID).Return(&docModel.GeneratedDocument{
		ID: docID, OrganizationID: orgID, WorkspaceID: wsID,
		Status: docModel.StatusSucceeded, ApprovalStatus: docModel.ApprovalApproved,
		ApprovedAt: &approvedAt, ApprovedBy: &approver,
	}, nil)

	out, err := NewApproveDocumentUseCase(docRepo, wsRepo).Execute(orgContext(orgID), wsID, docID)
	require.NoError(t, err)
	assert.Equal(t, docModel.ApprovalApproved, out.ApprovalStatus)
	docRepo.AssertNotCalled(t, "UpdateApproval", mock.Anything, mock.Anything)
}

func TestApproveDocument_RejectsNonSucceeded(t *testing.T) {
	orgID := uuid.New()
	wsID := uuid.New()
	docID := uuid.New()

	wsRepo := new(mockWorkspaceRepo)
	docRepo := new(mockDocumentRepo)
	wsRepo.On("GetByID", mock.Anything, wsID).Return(&tenantModel.Workspace{
		ID: wsID, OrganizationID: orgID,
	}, nil)
	docRepo.On("GetByID", mock.Anything, docID).Return(&docModel.GeneratedDocument{
		ID: docID, OrganizationID: orgID, WorkspaceID: wsID,
		Status: docModel.StatusFailed, ApprovalStatus: docModel.ApprovalDraft,
	}, nil)

	_, err := NewApproveDocumentUseCase(docRepo, wsRepo).Execute(orgContext(orgID), wsID, docID)
	require.Error(t, err)
	assert.ErrorIs(t, err, domainErr.ErrBadRequest)
}

func TestApproveDocument_ForeignWorkspaceForbidden(t *testing.T) {
	orgID := uuid.New()
	wsID := uuid.New()
	docID := uuid.New()

	wsRepo := new(mockWorkspaceRepo)
	docRepo := new(mockDocumentRepo)
	wsRepo.On("GetByID", mock.Anything, wsID).Return(&tenantModel.Workspace{
		ID: wsID, OrganizationID: orgID,
	}, nil)
	docRepo.On("GetByID", mock.Anything, docID).Return(&docModel.GeneratedDocument{
		ID: docID, OrganizationID: orgID, WorkspaceID: uuid.New(),
		Status: docModel.StatusSucceeded,
	}, nil)

	_, err := NewApproveDocumentUseCase(docRepo, wsRepo).Execute(orgContext(orgID), wsID, docID)
	require.Error(t, err)
	assert.ErrorIs(t, err, domainErr.ErrForbidden)
}
