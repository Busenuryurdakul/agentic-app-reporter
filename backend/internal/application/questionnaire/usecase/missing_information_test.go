package usecase

import (
	"context"
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

func TestMissingInformationUseCase_Execute(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	setID := uuid.New()

	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}
	set := &qmodel.QuestionnaireSet{ID: setID, Key: "studio-default", Active: true, IsDefault: true}

	answeredQuestion := &qmodel.Question{ID: uuid.New(), Category: "General", Title: "Project name", Required: true, Active: true}
	unansweredRequired := &qmodel.Question{ID: uuid.New(), Category: "General", Title: "Main problem", Required: true, Active: true}
	emptyAnsweredRequired := &qmodel.Question{ID: uuid.New(), Category: "Frontend", Title: "Framework", Required: true, Active: true}
	optionalQuestion := &qmodel.Question{ID: uuid.New(), Category: "Backend", Title: "Nice to have", Required: false, Active: true}
	inactiveRequired := &qmodel.Question{ID: uuid.New(), Category: "Security", Title: "Retired", Required: true, Active: false}

	questions := []*qmodel.Question{answeredQuestion, unansweredRequired, emptyAnsweredRequired, optionalQuestion, inactiveRequired}

	answers := []*qmodel.Answer{
		{ID: uuid.New(), WorkspaceID: workspaceID, QuestionID: answeredQuestion.ID, Value: json.RawMessage(`"Reporter"`)},
		{ID: uuid.New(), WorkspaceID: workspaceID, QuestionID: emptyAnsweredRequired.ID, Value: json.RawMessage(`""`)},
	}

	workspaceRepo := new(mockWorkspaceRepo)
	setRepo := new(mockSetRepo)
	questionRepo := new(mockQuestionRepo)
	answerRepo := new(mockAnswerRepo)

	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)
	setRepo.On("GetDefault", mock.Anything, orgID).Return(set, nil)
	questionRepo.On("ListBySetID", mock.Anything, setID).Return(questions, nil)
	answerRepo.On("ListByWorkspace", mock.Anything, workspaceID).Return(answers, nil)

	uc := NewMissingInformationUseCase(setRepo, questionRepo, answerRepo, workspaceRepo)

	result, err := uc.Execute(orgContext(orgID), workspaceID)

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, setID, result.SetID)
	// Required+active questions: answeredQuestion, unansweredRequired, emptyAnsweredRequired = 3.
	assert.Equal(t, 3, result.Total)
	assert.Equal(t, 1, result.Answered)
	require.Len(t, result.Missing, 2)

	missingIDs := map[uuid.UUID]bool{}
	for _, m := range result.Missing {
		missingIDs[m.QuestionID] = true
	}
	assert.True(t, missingIDs[unansweredRequired.ID])
	assert.True(t, missingIDs[emptyAnsweredRequired.ID])
	assert.False(t, missingIDs[answeredQuestion.ID])
	assert.False(t, missingIDs[optionalQuestion.ID])
	assert.False(t, missingIDs[inactiveRequired.ID])
}

func TestMissingInformationUseCase_Execute_AllAnswered(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	setID := uuid.New()

	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}
	set := &qmodel.QuestionnaireSet{ID: setID, Key: "studio-default"}

	q1 := &qmodel.Question{ID: uuid.New(), Required: true, Active: true}
	questions := []*qmodel.Question{q1}
	answers := []*qmodel.Answer{{ID: uuid.New(), WorkspaceID: workspaceID, QuestionID: q1.ID, Value: json.RawMessage(`true`)}}

	workspaceRepo := new(mockWorkspaceRepo)
	setRepo := new(mockSetRepo)
	questionRepo := new(mockQuestionRepo)
	answerRepo := new(mockAnswerRepo)

	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)
	setRepo.On("GetDefault", mock.Anything, orgID).Return(set, nil)
	questionRepo.On("ListBySetID", mock.Anything, setID).Return(questions, nil)
	answerRepo.On("ListByWorkspace", mock.Anything, workspaceID).Return(answers, nil)

	uc := NewMissingInformationUseCase(setRepo, questionRepo, answerRepo, workspaceRepo)

	result, err := uc.Execute(orgContext(orgID), workspaceID)

	require.NoError(t, err)
	assert.Equal(t, 1, result.Total)
	assert.Equal(t, 1, result.Answered)
	assert.Empty(t, result.Missing)
}

func TestMissingInformationUseCase_Execute_WorkspaceWrongOrg(t *testing.T) {
	orgID := uuid.New()
	otherOrgID := uuid.New()
	workspaceID := uuid.New()

	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: otherOrgID}

	workspaceRepo := new(mockWorkspaceRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)

	uc := NewMissingInformationUseCase(new(mockSetRepo), new(mockQuestionRepo), new(mockAnswerRepo), workspaceRepo)

	_, err := uc.Execute(orgContext(orgID), workspaceID)
	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrForbidden))
}

func TestMissingInformationUseCase_Execute_EmptyValueVariants(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	setID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}
	set := &qmodel.QuestionnaireSet{ID: setID, Key: "studio-default"}

	empties := []json.RawMessage{
		json.RawMessage(`null`),
		json.RawMessage(`""`),
		json.RawMessage(`[]`),
		json.RawMessage(`{}`),
		json.RawMessage(`   `),
	}
	questions := make([]*qmodel.Question, 0, len(empties))
	answers := make([]*qmodel.Answer, 0, len(empties))
	for _, value := range empties {
		q := &qmodel.Question{ID: uuid.New(), Required: true, Active: true}
		questions = append(questions, q)
		answers = append(answers, &qmodel.Answer{ID: uuid.New(), WorkspaceID: workspaceID, QuestionID: q.ID, Value: value})
	}

	workspaceRepo := new(mockWorkspaceRepo)
	setRepo := new(mockSetRepo)
	questionRepo := new(mockQuestionRepo)
	answerRepo := new(mockAnswerRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)
	setRepo.On("GetDefault", mock.Anything, orgID).Return(set, nil)
	questionRepo.On("ListBySetID", mock.Anything, setID).Return(questions, nil)
	answerRepo.On("ListByWorkspace", mock.Anything, workspaceID).Return(answers, nil)

	result, err := NewMissingInformationUseCase(setRepo, questionRepo, answerRepo, workspaceRepo).
		Execute(orgContext(orgID), workspaceID)

	require.NoError(t, err)
	assert.Equal(t, len(empties), result.Total)
	assert.Equal(t, 0, result.Answered)
	assert.Len(t, result.Missing, len(empties))
}

func TestMissingInformationUseCase_Execute_NonEmptyValueVariants(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	setID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}
	set := &qmodel.QuestionnaireSet{ID: setID, Key: "studio-default"}

	values := []json.RawMessage{
		json.RawMessage(`true`),
		json.RawMessage(`0`),
		json.RawMessage(`"Reporter"`),
	}
	questions := make([]*qmodel.Question, 0, len(values))
	answers := make([]*qmodel.Answer, 0, len(values))
	for _, value := range values {
		q := &qmodel.Question{ID: uuid.New(), Required: true, Active: true}
		questions = append(questions, q)
		answers = append(answers, &qmodel.Answer{ID: uuid.New(), WorkspaceID: workspaceID, QuestionID: q.ID, Value: value})
	}

	workspaceRepo := new(mockWorkspaceRepo)
	setRepo := new(mockSetRepo)
	questionRepo := new(mockQuestionRepo)
	answerRepo := new(mockAnswerRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)
	setRepo.On("GetDefault", mock.Anything, orgID).Return(set, nil)
	questionRepo.On("ListBySetID", mock.Anything, setID).Return(questions, nil)
	answerRepo.On("ListByWorkspace", mock.Anything, workspaceID).Return(answers, nil)

	result, err := NewMissingInformationUseCase(setRepo, questionRepo, answerRepo, workspaceRepo).
		Execute(orgContext(orgID), workspaceID)

	require.NoError(t, err)
	assert.Equal(t, len(values), result.Total)
	assert.Equal(t, len(values), result.Answered)
	assert.Empty(t, result.Missing)
}

func TestMissingInformationUseCase_Execute_NoDefaultSet(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}

	workspaceRepo := new(mockWorkspaceRepo)
	setRepo := new(mockSetRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)
	setRepo.On("GetDefault", mock.Anything, orgID).Return(nil, domainErr.New(domainErr.ErrNotFound, "no default questionnaire set configured", nil))

	_, err := NewMissingInformationUseCase(setRepo, new(mockQuestionRepo), new(mockAnswerRepo), workspaceRepo).
		Execute(orgContext(orgID), workspaceID)

	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrNotFound))
	assert.Contains(t, err.Error(), "no default questionnaire set configured")
}

func TestMissingInformationUseCase_Execute_MissingOrgContext(t *testing.T) {
	workspaceID := uuid.New()
	uc := NewMissingInformationUseCase(new(mockSetRepo), new(mockQuestionRepo), new(mockAnswerRepo), new(mockWorkspaceRepo))

	_, err := uc.Execute(context.Background(), workspaceID)
	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrUnauthorized))
}

func TestMissingInformationUseCase_Execute_HiddenRequiredExcluded(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	setID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}
	set := &qmodel.QuestionnaireSet{ID: setID, Key: "studio-default"}

	gate := &qmodel.Question{
		ID: uuid.New(), Key: "uses_ai", Title: "AI?", Required: true, Active: true,
	}
	hiddenRequired := &qmodel.Question{
		ID: uuid.New(), Key: "vector_store", Title: "Vector?", Required: true, Active: true,
		VisibilityRules: json.RawMessage(`{"show_if":{"question_key":"uses_ai","op":"eq","value":true}}`),
	}
	visibleRequired := &qmodel.Question{
		ID: uuid.New(), Key: "project_name", Title: "Name", Required: true, Active: true,
	}

	questions := []*qmodel.Question{gate, hiddenRequired, visibleRequired}
	answers := []*qmodel.Answer{
		{ID: uuid.New(), WorkspaceID: workspaceID, QuestionID: gate.ID, Value: json.RawMessage(`false`)},
	}

	workspaceRepo := new(mockWorkspaceRepo)
	setRepo := new(mockSetRepo)
	questionRepo := new(mockQuestionRepo)
	answerRepo := new(mockAnswerRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)
	setRepo.On("GetDefault", mock.Anything, orgID).Return(set, nil)
	questionRepo.On("ListBySetID", mock.Anything, setID).Return(questions, nil)
	answerRepo.On("ListByWorkspace", mock.Anything, workspaceID).Return(answers, nil)

	result, err := NewMissingInformationUseCase(setRepo, questionRepo, answerRepo, workspaceRepo).
		Execute(orgContext(orgID), workspaceID)

	require.NoError(t, err)
	// uses_ai answered + project_name missing; vector_store hidden → total_required=2, answered=1, missing=1
	assert.Equal(t, 2, result.Total)
	assert.Equal(t, 1, result.Answered)
	require.Len(t, result.Missing, 1)
	assert.Equal(t, visibleRequired.ID, result.Missing[0].QuestionID)
}

func TestMissingInformationUseCase_Execute_InvalidVisibilityFailsOpen(t *testing.T) {
	orgID := uuid.New()
	workspaceID := uuid.New()
	setID := uuid.New()
	workspace := &tenantModel.Workspace{ID: workspaceID, OrganizationID: orgID}
	set := &qmodel.QuestionnaireSet{ID: setID, Key: "studio-default"}

	broken := &qmodel.Question{
		ID: uuid.New(), Key: "broken", Title: "Broken", Required: true, Active: true,
		VisibilityRules: json.RawMessage(`{not-json`),
	}

	workspaceRepo := new(mockWorkspaceRepo)
	setRepo := new(mockSetRepo)
	questionRepo := new(mockQuestionRepo)
	answerRepo := new(mockAnswerRepo)
	workspaceRepo.On("GetByID", mock.Anything, workspaceID).Return(workspace, nil)
	setRepo.On("GetDefault", mock.Anything, orgID).Return(set, nil)
	questionRepo.On("ListBySetID", mock.Anything, setID).Return([]*qmodel.Question{broken}, nil)
	answerRepo.On("ListByWorkspace", mock.Anything, workspaceID).Return([]*qmodel.Answer{}, nil)

	result, err := NewMissingInformationUseCase(setRepo, questionRepo, answerRepo, workspaceRepo).
		Execute(orgContext(orgID), workspaceID)

	require.NoError(t, err)
	assert.Equal(t, 1, result.Total)
	assert.Equal(t, 0, result.Answered)
	require.Len(t, result.Missing, 1)
}
