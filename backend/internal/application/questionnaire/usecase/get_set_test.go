package usecase

import (
	"context"
	"testing"

	"github.com/google/uuid"
	qmodel "github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/model"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetSet_GlobalSetReadableByAnyOrg(t *testing.T) {
	orgA := uuid.New()
	setID := uuid.New()
	setRepo := new(mockSetRepo)
	questionRepo := new(mockQuestionRepo)

	setRepo.On("GetByID", orgContext(orgA), setID).Return(&qmodel.QuestionnaireSet{
		ID:             setID,
		OrganizationID: nil,
		Key:            "studio-default",
		Title:          "Default",
		Active:         true,
	}, nil)
	questionRepo.On("ListBySetID", orgContext(orgA), setID).Return([]*qmodel.Question{}, nil)

	uc := NewGetSetUseCase(setRepo, questionRepo)
	detail, err := uc.Execute(orgContext(orgA), setID)
	require.NoError(t, err)
	assert.Equal(t, setID, detail.ID)
	assert.Equal(t, "studio-default", detail.Key)
}

func TestGetSet_OrgScopedSetReadableByOwner(t *testing.T) {
	orgA := uuid.New()
	setID := uuid.New()
	setRepo := new(mockSetRepo)
	questionRepo := new(mockQuestionRepo)

	setRepo.On("GetByID", orgContext(orgA), setID).Return(&qmodel.QuestionnaireSet{
		ID:             setID,
		OrganizationID: &orgA,
		Key:            "org-a-private",
		Title:          "Org A",
		Active:         true,
	}, nil)
	questionRepo.On("ListBySetID", orgContext(orgA), setID).Return([]*qmodel.Question{}, nil)

	uc := NewGetSetUseCase(setRepo, questionRepo)
	detail, err := uc.Execute(orgContext(orgA), setID)
	require.NoError(t, err)
	assert.Equal(t, "org-a-private", detail.Key)
}

func TestGetSet_OrgScopedSetDeniedForOtherOrg(t *testing.T) {
	orgA := uuid.New()
	orgB := uuid.New()
	setID := uuid.New()
	setRepo := new(mockSetRepo)
	questionRepo := new(mockQuestionRepo)

	setRepo.On("GetByID", orgContext(orgA), setID).Return(&qmodel.QuestionnaireSet{
		ID:             setID,
		OrganizationID: &orgB,
		Key:            "org-b-private",
		Title:          "Org B",
		Active:         true,
	}, nil)

	uc := NewGetSetUseCase(setRepo, questionRepo)
	detail, err := uc.Execute(orgContext(orgA), setID)
	require.Error(t, err)
	assert.Nil(t, detail)
	assert.ErrorIs(t, err, domainErr.ErrForbidden)
	questionRepo.AssertNotCalled(t, "ListBySetID")
}

func TestGetSet_RequiresOrganizationContext(t *testing.T) {
	uc := NewGetSetUseCase(new(mockSetRepo), new(mockQuestionRepo))
	_, err := uc.Execute(context.Background(), uuid.New())
	require.Error(t, err)
	assert.ErrorIs(t, err, domainErr.ErrUnauthorized)
}
