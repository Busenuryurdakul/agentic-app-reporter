package usecase

import (
	"archive/zip"
	"bytes"
	"context"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/export/dto"
	docModel "github.com/masterfabric-go/masterfabric/internal/domain/document/model"
	docRepo "github.com/masterfabric-go/masterfabric/internal/domain/document/repository"
	tenantModel "github.com/masterfabric-go/masterfabric/internal/domain/tenant/model"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
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

func orgContext(orgID uuid.UUID) context.Context {
	return context.WithValue(context.Background(), middleware.ContextKeyTenantID, orgID)
}

func TestExportPackage_DefaultPrefersApproved(t *testing.T) {
	orgID := uuid.New()
	wsID := uuid.New()
	approvedID := uuid.New()
	draftID := uuid.New()

	wsRepo := new(mockWorkspaceRepo)
	docRepoMock := new(mockDocumentRepo)
	wsRepo.On("GetByID", mock.Anything, wsID).Return(&tenantModel.Workspace{ID: wsID, OrganizationID: orgID}, nil)
	docRepoMock.On("ListByWorkspace", mock.Anything, wsID, dto.MaxDocuments).Return([]*docModel.GeneratedDocument{
		{
			ID: draftID, OrganizationID: orgID, WorkspaceID: wsID,
			Title: "Draft Doc", Status: docModel.StatusSucceeded, ApprovalStatus: docModel.ApprovalDraft,
			Language: "tr", MarkdownBody: "# Draft\n",
		},
		{
			ID: approvedID, OrganizationID: orgID, WorkspaceID: wsID,
			Title: "Approved Doc", Status: docModel.StatusSucceeded, ApprovalStatus: docModel.ApprovalApproved,
			Language: "tr", MarkdownBody: "# Approved\n",
		},
	}, nil)

	out, err := NewExportPackageUseCase(docRepoMock, wsRepo).Execute(orgContext(orgID), wsID, dto.ExportPackageRequest{})
	require.NoError(t, err)
	assert.Equal(t, 1, out.DocumentCount)
	assert.Contains(t, out.ContentType, "text/markdown")
	assert.Contains(t, string(out.Body), "Approved Doc")
	assert.Contains(t, string(out.Body), "approval_status: \"approved\"")
	assert.NotContains(t, string(out.Body), "Draft Doc")
}

func TestExportPackage_FallbackToSucceeded(t *testing.T) {
	orgID := uuid.New()
	wsID := uuid.New()
	docID := uuid.New()

	wsRepo := new(mockWorkspaceRepo)
	docRepoMock := new(mockDocumentRepo)
	wsRepo.On("GetByID", mock.Anything, wsID).Return(&tenantModel.Workspace{ID: wsID, OrganizationID: orgID}, nil)
	docRepoMock.On("ListByWorkspace", mock.Anything, wsID, dto.MaxDocuments).Return([]*docModel.GeneratedDocument{
		{
			ID: docID, OrganizationID: orgID, WorkspaceID: wsID,
			Title: "Only Succeeded", Status: docModel.StatusSucceeded, ApprovalStatus: docModel.ApprovalDraft,
			Language: "en", MarkdownBody: "body",
		},
		{
			ID: uuid.New(), OrganizationID: orgID, WorkspaceID: wsID,
			Title: "Failed", Status: docModel.StatusFailed, ApprovalStatus: docModel.ApprovalDraft,
			Language: "en", MarkdownBody: "",
		},
	}, nil)

	out, err := NewExportPackageUseCase(docRepoMock, wsRepo).Execute(orgContext(orgID), wsID, dto.ExportPackageRequest{})
	require.NoError(t, err)
	assert.Equal(t, 1, out.DocumentCount)
	assert.Contains(t, string(out.Body), "Only Succeeded")
}

func TestExportPackage_ByIDsBuildsZip(t *testing.T) {
	orgID := uuid.New()
	wsID := uuid.New()
	id1 := uuid.New()
	id2 := uuid.New()

	wsRepo := new(mockWorkspaceRepo)
	docRepoMock := new(mockDocumentRepo)
	wsRepo.On("GetByID", mock.Anything, wsID).Return(&tenantModel.Workspace{ID: wsID, OrganizationID: orgID}, nil)
	docRepoMock.On("GetByID", mock.Anything, id1).Return(&docModel.GeneratedDocument{
		ID: id1, OrganizationID: orgID, WorkspaceID: wsID,
		Title: "One", Status: docModel.StatusSucceeded, Language: "tr", MarkdownBody: "a",
	}, nil)
	docRepoMock.On("GetByID", mock.Anything, id2).Return(&docModel.GeneratedDocument{
		ID: id2, OrganizationID: orgID, WorkspaceID: wsID,
		Title: "Two", Status: docModel.StatusSucceeded, Language: "tr", MarkdownBody: "b",
	}, nil)

	out, err := NewExportPackageUseCase(docRepoMock, wsRepo).Execute(orgContext(orgID), wsID, dto.ExportPackageRequest{
		DocumentIDs: []uuid.UUID{id1, id2},
		Format:      dto.FormatMarkdownZip,
	})
	require.NoError(t, err)
	assert.Equal(t, 2, out.DocumentCount)
	assert.Equal(t, "application/zip", out.ContentType)
	assert.True(t, strings.HasSuffix(out.Filename, ".zip"))

	zr, err := zip.NewReader(bytes.NewReader(out.Body), int64(len(out.Body)))
	require.NoError(t, err)
	require.Len(t, zr.File, 2)
}

func TestExportPackage_EmptyNotFound(t *testing.T) {
	orgID := uuid.New()
	wsID := uuid.New()
	wsRepo := new(mockWorkspaceRepo)
	docRepoMock := new(mockDocumentRepo)
	wsRepo.On("GetByID", mock.Anything, wsID).Return(&tenantModel.Workspace{ID: wsID, OrganizationID: orgID}, nil)
	docRepoMock.On("ListByWorkspace", mock.Anything, wsID, dto.MaxDocuments).Return([]*docModel.GeneratedDocument{}, nil)

	_, err := NewExportPackageUseCase(docRepoMock, wsRepo).Execute(orgContext(orgID), wsID, dto.ExportPackageRequest{})
	require.Error(t, err)
	assert.ErrorIs(t, err, domainErr.ErrNotFound)
}

func TestRenderMarkdownExport_HasFrontMatterNoPrompt(t *testing.T) {
	doc := &docModel.GeneratedDocument{
		ID: uuid.New(), Title: "T", Language: "tr", Status: docModel.StatusSucceeded,
		ApprovalStatus: docModel.ApprovalApproved, MarkdownBody: "# Hello",
		ProviderName: "mock", ModelName: "m",
	}
	body := renderMarkdownExport(doc, doc.CreatedAt)
	assert.True(t, strings.HasPrefix(body, "---\n"))
	assert.Contains(t, body, "# Hello")
	assert.NotContains(t, strings.ToLower(body), "prompt")
}
