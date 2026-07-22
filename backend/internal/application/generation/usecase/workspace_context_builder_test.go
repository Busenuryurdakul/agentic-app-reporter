package usecase

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	profileModel "github.com/masterfabric-go/masterfabric/internal/domain/projectprofile/model"
	qmodel "github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/model"
	tenantModel "github.com/masterfabric-go/masterfabric/internal/domain/tenant/model"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWorkspaceContextBuilder_HidesInactiveAndInvisibleAIQuestions(t *testing.T) {
	orgID := uuid.New()
	wsID := uuid.New()
	setID := uuid.New()

	usesAIID := uuid.New()
	llmProvidersID := uuid.New()
	projectNameID := uuid.New()
	inactiveID := uuid.New()

	wsRepo := new(mockWorkspaceRepo)
	profileRepo := new(mockProfileRepo)
	setRepo := new(mockSetRepo)
	questionRepo := new(mockQuestionRepo)
	answerRepo := new(mockAnswerRepo)

	wsRepo.On("GetByID", orgContext(orgID), wsID).Return(&tenantModel.Workspace{
		ID:                        wsID,
		OrganizationID:            orgID,
		Name:                      "Smoke WS",
		Slug:                      "smoke-ws",
		PreferredDocumentLanguage: "tr",
		Status:                    tenantModel.WorkspaceStatusActive,
	}, nil)

	profileRepo.On("GetByWorkspaceID", orgContext(orgID), wsID).Return(&profileModel.Profile{
		OrganizationID:            orgID,
		WorkspaceID:               wsID,
		ProjectName:               "Reporter",
		PreferredDocumentLanguage: "tr",
		Frontend:                  profileModel.EmptyJSONObject,
		Backend:                   profileModel.EmptyJSONObject,
		Data:                      profileModel.EmptyJSONObject,
		Infrastructure:            profileModel.EmptyJSONObject,
		AI:                        json.RawMessage(`{"api_key":"super-secret","model":"x"}`),
		DevelopmentStandards:      profileModel.EmptyJSONObject,
	}, nil)

	setRepo.On("GetDefault", orgContext(orgID), orgID).Return(&qmodel.QuestionnaireSet{
		ID:  setID,
		Key: "studio-default",
	}, nil)

	showIfUsesAI := json.RawMessage(`{"show_if":{"question_key":"uses_ai","op":"equals","value":true}}`)
	questions := []*qmodel.Question{
		{ID: projectNameID, SetID: setID, Key: "project_name", Category: "Genel", Title: "Proje adı", Required: true, Active: true},
		{ID: usesAIID, SetID: setID, Key: "uses_ai", Category: "AI", Title: "AI kullanıyor mu?", Required: true, Active: true},
		{ID: llmProvidersID, SetID: setID, Key: "llm_providers", Category: "AI", Title: "LLM sağlayıcıları", Required: true, Active: true, VisibilityRules: showIfUsesAI},
		{ID: inactiveID, SetID: setID, Key: "obsolete", Category: "Genel", Title: "Eski", Required: true, Active: false},
	}
	questionRepo.On("ListBySetID", orgContext(orgID), setID).Return(questions, nil)

	answerRepo.On("ListByWorkspace", orgContext(orgID), wsID).Return([]*qmodel.Answer{
		{WorkspaceID: wsID, QuestionID: projectNameID, Value: json.RawMessage(`"Reporter"`)},
		{WorkspaceID: wsID, QuestionID: usesAIID, Value: json.RawMessage(`false`)},
		// Would be visible only if uses_ai=true — must not appear in context.
		{WorkspaceID: wsID, QuestionID: llmProvidersID, Value: json.RawMessage(`["openai"]`)},
		{WorkspaceID: wsID, QuestionID: inactiveID, Value: json.RawMessage(`"nope"`)},
	}, nil)

	builder := NewWorkspaceContextBuilder(wsRepo, profileRepo, setRepo, questionRepo, answerRepo)
	ctxData, err := builder.Build(orgContext(orgID), wsID, BuildContextOptions{})
	require.NoError(t, err)

	keys := map[string]bool{}
	for _, a := range ctxData.Answers {
		keys[a.Key] = true
	}
	assert.True(t, keys["project_name"])
	assert.True(t, keys["uses_ai"])
	assert.False(t, keys["llm_providers"], "AI child must be hidden when uses_ai=false")
	assert.False(t, keys["obsolete"], "inactive questions must be excluded")

	// Soft gate: llm_providers required but hidden → not in MissingRequired
	for _, m := range ctxData.MissingRequired {
		assert.NotEqual(t, "llm_providers", m.Key)
		assert.NotEqual(t, "obsolete", m.Key)
	}

	// Sensitive profile keys redacted
	aiSection := string(ctxData.Profile.Sections["ai"])
	assert.Contains(t, aiSection, "***")
	assert.NotContains(t, aiSection, "super-secret")
	assert.Contains(t, aiSection, "model")
}

func TestWorkspaceContextBuilder_UsesAITrueIncludesAIChildren(t *testing.T) {
	orgID := uuid.New()
	wsID := uuid.New()
	setID := uuid.New()
	usesAIID := uuid.New()
	llmProvidersID := uuid.New()

	wsRepo := new(mockWorkspaceRepo)
	profileRepo := new(mockProfileRepo)
	setRepo := new(mockSetRepo)
	questionRepo := new(mockQuestionRepo)
	answerRepo := new(mockAnswerRepo)

	wsRepo.On("GetByID", orgContext(orgID), wsID).Return(&tenantModel.Workspace{
		ID: wsID, OrganizationID: orgID, Name: "WS", Slug: "ws",
		PreferredDocumentLanguage: "en", Status: tenantModel.WorkspaceStatusActive,
	}, nil)
	profileRepo.On("GetByWorkspaceID", orgContext(orgID), wsID).Return(nil, domainErr.New(domainErr.ErrNotFound, "profile not found", nil))
	setRepo.On("GetDefault", orgContext(orgID), orgID).Return(&qmodel.QuestionnaireSet{ID: setID, Key: "studio-default"}, nil)

	showIf := json.RawMessage(`{"show_if":{"question_key":"uses_ai","op":"equals","value":true}}`)
	questionRepo.On("ListBySetID", orgContext(orgID), setID).Return([]*qmodel.Question{
		{ID: usesAIID, Key: "uses_ai", Category: "AI", Title: "Uses AI", Required: true, Active: true},
		{ID: llmProvidersID, Key: "llm_providers", Category: "AI", Title: "Providers", Required: true, Active: true, VisibilityRules: showIf},
	}, nil)
	answerRepo.On("ListByWorkspace", orgContext(orgID), wsID).Return([]*qmodel.Answer{
		{QuestionID: usesAIID, Value: json.RawMessage(`true`)},
	}, nil)

	builder := NewWorkspaceContextBuilder(wsRepo, profileRepo, setRepo, questionRepo, answerRepo)
	ctxData, err := builder.Build(orgContext(orgID), wsID, BuildContextOptions{})
	require.NoError(t, err)
	assert.Equal(t, "en", ctxData.Language)

	keys := map[string]VisibleAnswer{}
	for _, a := range ctxData.Answers {
		keys[a.Key] = a
	}
	require.Contains(t, keys, "llm_providers")
	assert.False(t, keys["llm_providers"].Answered)

	var missingKeys []string
	for _, m := range ctxData.MissingRequired {
		missingKeys = append(missingKeys, m.Key)
	}
	assert.Contains(t, missingKeys, "llm_providers")
}

func TestWorkspaceContextBuilder_ForeignWorkspaceForbidden(t *testing.T) {
	orgA := uuid.New()
	orgB := uuid.New()
	wsID := uuid.New()

	wsRepo := new(mockWorkspaceRepo)
	wsRepo.On("GetByID", orgContext(orgA), wsID).Return(&tenantModel.Workspace{
		ID: wsID, OrganizationID: orgB, Name: "Other",
	}, nil)

	builder := NewWorkspaceContextBuilder(wsRepo, new(mockProfileRepo), new(mockSetRepo), new(mockQuestionRepo), new(mockAnswerRepo))
	_, err := builder.Build(orgContext(orgA), wsID, BuildContextOptions{})
	require.Error(t, err)
	assert.ErrorIs(t, err, domainErr.ErrForbidden)
}

func TestWorkspaceContextBuilder_LanguageOverride(t *testing.T) {
	orgID := uuid.New()
	wsID := uuid.New()
	setID := uuid.New()

	wsRepo := new(mockWorkspaceRepo)
	profileRepo := new(mockProfileRepo)
	setRepo := new(mockSetRepo)
	questionRepo := new(mockQuestionRepo)
	answerRepo := new(mockAnswerRepo)

	wsRepo.On("GetByID", orgContext(orgID), wsID).Return(&tenantModel.Workspace{
		ID: wsID, OrganizationID: orgID, Name: "WS", Slug: "ws",
		PreferredDocumentLanguage: "tr", Status: tenantModel.WorkspaceStatusActive,
	}, nil)
	profileRepo.On("GetByWorkspaceID", orgContext(orgID), wsID).Return(nil, domainErr.New(domainErr.ErrNotFound, "x", nil))
	setRepo.On("GetDefault", orgContext(orgID), orgID).Return(&qmodel.QuestionnaireSet{ID: setID, Key: "studio-default"}, nil)
	questionRepo.On("ListBySetID", orgContext(orgID), setID).Return([]*qmodel.Question{}, nil)
	answerRepo.On("ListByWorkspace", orgContext(orgID), wsID).Return([]*qmodel.Answer{}, nil)

	builder := NewWorkspaceContextBuilder(wsRepo, profileRepo, setRepo, questionRepo, answerRepo)
	ctxData, err := builder.Build(orgContext(orgID), wsID, BuildContextOptions{LanguageOverride: "en"})
	require.NoError(t, err)
	assert.Equal(t, "en", ctxData.Language)
	assert.NotEmpty(t, ctxData.Fingerprint())
}
