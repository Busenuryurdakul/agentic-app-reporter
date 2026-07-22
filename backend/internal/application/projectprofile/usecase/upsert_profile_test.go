package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/projectprofile/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/projectprofile/model"
	tenantModel "github.com/masterfabric-go/masterfabric/internal/domain/tenant/model"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestUpsertProfileUseCase_CreateWhenMissing(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}

	profileRepo := new(mockProfileRepo)
	workspaceRepo := new(mockWorkspaceRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)
	profileRepo.On("GetByWorkspaceID", mock.Anything, workspaceID).Return(nil, domainErr.ErrNotFound)
	profileRepo.On("Upsert", mock.Anything, mock.AnythingOfType("*model.Profile")).Return(nil).Run(func(args mock.Arguments) {
		p := args.Get(1).(*model.Profile)
		assert.Equal(t, orgID, p.OrganizationID)
		assert.Equal(t, workspaceID, p.WorkspaceID)
		assert.Equal(t, "Reporter", p.ProjectName)
		assert.Equal(t, string(model.ProjectStatusPlanned), p.ProjectStatus)
		assert.Equal(t, string(model.DocumentLanguageTR), p.PreferredDocumentLanguage)
	})

	info, err := NewUpsertProfileUseCase(profileRepo, workspaceRepo).Execute(orgContext(orgID), workspaceID, dto.UpsertProfileRequest{
		ProjectName: "Reporter",
	})

	require.NoError(t, err)
	require.NotNil(t, info)
	assert.Equal(t, "Reporter", info.ProjectName)
	assert.Equal(t, string(model.ProjectStatusPlanned), info.ProjectStatus)
	assert.Equal(t, string(model.DocumentLanguageTR), info.PreferredDocumentLanguage)
	profileRepo.AssertExpectations(t)
}

func TestUpsertProfileUseCase_PartialUpdate(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}
	existing := model.NewEmpty(orgID, workspaceID)
	existing.ID = uuid.New()
	existing.ProjectName = "Old Name"
	existing.ProjectDescription = "Keep me"
	existing.Frontend = json.RawMessage(`{"framework":"next"}`)

	profileRepo := new(mockProfileRepo)
	workspaceRepo := new(mockWorkspaceRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)
	profileRepo.On("GetByWorkspaceID", mock.Anything, workspaceID).Return(existing, nil)
	profileRepo.On("Upsert", mock.Anything, mock.AnythingOfType("*model.Profile")).Return(nil).Run(func(args mock.Arguments) {
		p := args.Get(1).(*model.Profile)
		assert.Equal(t, "New Name", p.ProjectName)
		assert.Equal(t, "Keep me", p.ProjectDescription)
		assert.JSONEq(t, `{"framework":"next"}`, string(p.Frontend))
	})

	info, err := NewUpsertProfileUseCase(profileRepo, workspaceRepo).Execute(orgContext(orgID), workspaceID, dto.UpsertProfileRequest{
		ProjectName: "New Name",
		// Empty string must not clear description.
		ProjectDescription: "",
		// Absent/null frontend must not clear existing section.
		Frontend: nil,
	})

	require.NoError(t, err)
	assert.Equal(t, "New Name", info.ProjectName)
	assert.Equal(t, "Keep me", info.ProjectDescription)
	profileRepo.AssertExpectations(t)
}

func TestUpsertProfileUseCase_InvalidDocumentLanguage(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()

	_, err := NewUpsertProfileUseCase(new(mockProfileRepo), new(mockWorkspaceRepo)).
		Execute(orgContext(orgID), workspaceID, dto.UpsertProfileRequest{PreferredDocumentLanguage: "de"})

	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrValidation))
}

func TestUpsertProfileUseCase_AcceptsEnglishLanguage(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}
	existing := model.NewEmpty(orgID, workspaceID)
	existing.ID = uuid.New()

	profileRepo := new(mockProfileRepo)
	workspaceRepo := new(mockWorkspaceRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)
	profileRepo.On("GetByWorkspaceID", mock.Anything, workspaceID).Return(existing, nil)
	profileRepo.On("Upsert", mock.Anything, mock.AnythingOfType("*model.Profile")).Return(nil)

	info, err := NewUpsertProfileUseCase(profileRepo, workspaceRepo).Execute(orgContext(orgID), workspaceID, dto.UpsertProfileRequest{
		PreferredDocumentLanguage: "en",
	})

	require.NoError(t, err)
	assert.Equal(t, "en", info.PreferredDocumentLanguage)
}

func TestUpsertProfileUseCase_WrongOrg(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: uuid.New()}

	workspaceRepo := new(mockWorkspaceRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)

	_, err := NewUpsertProfileUseCase(new(mockProfileRepo), workspaceRepo).
		Execute(orgContext(orgID), workspaceID, dto.UpsertProfileRequest{ProjectName: "X"})

	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrForbidden))
}

func TestUpsertProfileUseCase_WorkspaceNotFound(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()

	workspaceRepo := new(mockWorkspaceRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(nil, domainErr.ErrNotFound)

	_, err := NewUpsertProfileUseCase(new(mockProfileRepo), workspaceRepo).
		Execute(orgContext(orgID), workspaceID, dto.UpsertProfileRequest{ProjectName: "X"})

	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrNotFound))
}

func TestUpsertProfileUseCase_MissingOrgContext(t *testing.T) {
	_, err := NewUpsertProfileUseCase(new(mockProfileRepo), new(mockWorkspaceRepo)).
		Execute(context.Background(), uuid.New(), dto.UpsertProfileRequest{ProjectName: "X"})

	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrUnauthorized))
}
