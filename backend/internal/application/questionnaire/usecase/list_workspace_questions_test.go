package usecase

import (
	"encoding/json"
	"errors"
	"testing"

	"github.com/google/uuid"
	qmodel "github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/model"
	tenantModel "github.com/masterfabric-go/masterfabric/internal/domain/tenant/model"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestListWorkspaceQuestionsUseCase_MergesAnswers(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	setID := uuid.New()
	answeredID := uuid.New()
	emptyID := uuid.New()
	unansweredID := uuid.New()

	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}
	set := &qmodel.QuestionnaireSet{ID: setID, Key: "studio-default", Active: true, IsDefault: true}
	questions := []*qmodel.Question{
		{ID: answeredID, SetID: setID, Title: "Name", Active: true},
		{ID: emptyID, SetID: setID, Title: "Empty", Active: true},
		{ID: unansweredID, SetID: setID, Title: "Missing", Active: true},
	}
	answers := []*qmodel.Answer{
		{ID: uuid.New(), WorkspaceID: workspaceID, QuestionID: answeredID, Value: json.RawMessage(`"Reporter"`)},
		{ID: uuid.New(), WorkspaceID: workspaceID, QuestionID: emptyID, Value: json.RawMessage(`""`)},
	}

	workspaceRepo := new(mockWorkspaceRepo)
	setRepo := new(mockSetRepo)
	questionRepo := new(mockQuestionRepo)
	answerRepo := new(mockAnswerRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)
	setRepo.On("GetDefault", mock.Anything, orgID).Return(set, nil)
	questionRepo.On("ListBySetID", mock.Anything, setID).Return(questions, nil)
	answerRepo.On("ListByWorkspace", mock.Anything, workspaceID).Return(answers, nil)

	result, err := NewListWorkspaceQuestionsUseCase(setRepo, questionRepo, answerRepo, workspaceRepo).
		Execute(orgContext(orgID), workspaceID)

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, setID, result.SetID)
	assert.Equal(t, "studio-default", result.SetKey)
	require.Len(t, result.Questions, 3)

	byID := map[uuid.UUID]bool{}
	for _, q := range result.Questions {
		require.NotNil(t, q.Visible)
		assert.True(t, *q.Visible)
		byID[q.ID] = q.Answered
		if q.ID == answeredID {
			assert.True(t, q.Answered)
			assert.JSONEq(t, `"Reporter"`, string(q.Answer))
		}
		if q.ID == emptyID || q.ID == unansweredID {
			assert.False(t, q.Answered)
		}
	}
	assert.True(t, byID[answeredID])
	assert.False(t, byID[emptyID])
	assert.False(t, byID[unansweredID])
}

func TestListWorkspaceQuestionsUseCase_MarksHiddenQuestions(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	setID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}
	set := &qmodel.QuestionnaireSet{ID: setID, Key: "studio-default"}

	gateID := uuid.New()
	childID := uuid.New()
	questions := []*qmodel.Question{
		{ID: gateID, SetID: setID, Key: "uses_ai", Title: "AI?", Active: true},
		{
			ID: childID, SetID: setID, Key: "vector_store", Title: "Vector", Active: true,
			VisibilityRules: json.RawMessage(`{"show_if":{"question_key":"uses_ai","op":"eq","value":true}}`),
		},
	}
	answers := []*qmodel.Answer{
		{ID: uuid.New(), WorkspaceID: workspaceID, QuestionID: gateID, Value: json.RawMessage(`false`)},
	}

	workspaceRepo := new(mockWorkspaceRepo)
	setRepo := new(mockSetRepo)
	questionRepo := new(mockQuestionRepo)
	answerRepo := new(mockAnswerRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)
	setRepo.On("GetDefault", mock.Anything, orgID).Return(set, nil)
	questionRepo.On("ListBySetID", mock.Anything, setID).Return(questions, nil)
	answerRepo.On("ListByWorkspace", mock.Anything, workspaceID).Return(answers, nil)

	result, err := NewListWorkspaceQuestionsUseCase(setRepo, questionRepo, answerRepo, workspaceRepo).
		Execute(orgContext(orgID), workspaceID)

	require.NoError(t, err)
	require.Len(t, result.Questions, 2)
	var gateVisible, childVisible *bool
	for _, q := range result.Questions {
		if q.ID == gateID {
			gateVisible = q.Visible
		}
		if q.ID == childID {
			childVisible = q.Visible
		}
	}
	require.NotNil(t, gateVisible)
	require.NotNil(t, childVisible)
	assert.True(t, *gateVisible)
	assert.False(t, *childVisible)
}

func TestListWorkspaceQuestionsUseCase_WrongOrg(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: uuid.New()}

	workspaceRepo := new(mockWorkspaceRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)

	_, err := NewListWorkspaceQuestionsUseCase(new(mockSetRepo), new(mockQuestionRepo), new(mockAnswerRepo), workspaceRepo).
		Execute(orgContext(orgID), workspaceID)

	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrForbidden))
}
