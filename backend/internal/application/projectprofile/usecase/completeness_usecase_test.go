package usecase

import (
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/projectprofile/model"
	tenantModel "github.com/masterfabric-go/masterfabric/internal/domain/tenant/model"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestCompletenessUseCase_EmptyWhenProfileMissing(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}

	profileRepo := new(mockProfileRepo)
	workspaceRepo := new(mockWorkspaceRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)
	profileRepo.On("GetByWorkspaceID", mock.Anything, workspaceID).Return(nil, domainErr.ErrNotFound)

	result, err := NewCompletenessUseCase(profileRepo, workspaceRepo).Execute(orgContext(orgID), workspaceID)

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, 0, result.Overall)
	assert.Len(t, result.Missing, 12)
}

func TestCompletenessUseCase_WrongOrg(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: uuid.New()}

	workspaceRepo := new(mockWorkspaceRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)

	_, err := NewCompletenessUseCase(new(mockProfileRepo), workspaceRepo).Execute(orgContext(orgID), workspaceID)

	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrForbidden))
}

func TestCompletenessUseCase_UsesExistingProfile(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}
	profile := model.NewEmpty(orgID, workspaceID)
	profile.ProjectName = "Reporter"
	profile.ProjectDescription = "Docs"

	profileRepo := new(mockProfileRepo)
	workspaceRepo := new(mockWorkspaceRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)
	profileRepo.On("GetByWorkspaceID", mock.Anything, workspaceID).Return(profile, nil)

	result, err := NewCompletenessUseCase(profileRepo, workspaceRepo).Execute(orgContext(orgID), workspaceID)

	require.NoError(t, err)
	assert.Equal(t, 16, result.Overall)
}
