package usecase

import (
	"testing"
	"time"

	"github.com/google/uuid"
	docModel "github.com/masterfabric-go/masterfabric/internal/domain/document/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/llm"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestRegenerateDocument_CreatesNewKeepsSource(t *testing.T) {
	orgID, wsID, wsRepo, profileRepo, setRepo, questionRepo, answerRepo, docRepo := setupGenerateFixture(t)

	sourceID := uuid.New()
	sourceCreated := time.Now().UTC().Add(-time.Hour)
	source := &docModel.GeneratedDocument{
		ID:             sourceID,
		OrganizationID: orgID,
		WorkspaceID:    wsID,
		Title:          "Original Title",
		DocumentType:   docModel.DocumentTypeStudioMarkdown,
		Language:       "tr",
		Status:         docModel.StatusSucceeded,
		MarkdownBody:   "# old body",
		ProviderName:   "mock",
		ModelName:      "old-model",
		CreatedAt:      sourceCreated,
		UpdatedAt:      sourceCreated,
	}

	// resolveWorkspace in regenerate + generate
	docRepo.On("GetByID", orgContext(orgID), sourceID).Return(source, nil).Once()

	var created *docModel.GeneratedDocument
	docRepo.On("Create", orgContext(orgID), mock.AnythingOfType("*model.GeneratedDocument")).
		Run(func(args mock.Arguments) {
			created = args.Get(1).(*docModel.GeneratedDocument)
		}).
		Return(nil).Once()

	generateUC := NewGenerateDocumentUseCase(
		NewWorkspaceContextBuilder(wsRepo, profileRepo, setRepo, questionRepo, answerRepo),
		NewPromptBuilder(),
		&stubLLMProvider{
			name: "mock",
			resp: llm.GenerateResponse{
				Content:  "# Studio Document\n\nregenerated\n",
				Provider: "mock",
				Model:    "mock-model",
			},
		},
		docRepo,
		NewGenerationGate(),
		true,
		nil,
	)
	uc := NewRegenerateDocumentUseCase(generateUC, docRepo, wsRepo)

	out, err := uc.Execute(orgContext(orgID), wsID, sourceID)
	require.NoError(t, err)
	require.NotNil(t, out)
	require.NotNil(t, created)

	assert.NotEqual(t, sourceID, out.ID, "regenerate must create a new document id")
	assert.Equal(t, "Original Title", out.Title)
	assert.Contains(t, out.MarkdownBody, "regenerated")
	assert.Equal(t, sourceID, source.ID)
	assert.Equal(t, "# old body", source.MarkdownBody, "source document must remain unchanged")

	docRepo.AssertExpectations(t)
}

func TestRegenerateDocument_NotFound(t *testing.T) {
	orgID, wsID, wsRepo, profileRepo, setRepo, questionRepo, answerRepo, docRepo := setupGenerateFixture(t)
	missingID := uuid.New()

	docRepo.On("GetByID", orgContext(orgID), missingID).
		Return(nil, domainErr.New(domainErr.ErrNotFound, "generated document not found", nil))

	generateUC := NewGenerateDocumentUseCase(
		NewWorkspaceContextBuilder(wsRepo, profileRepo, setRepo, questionRepo, answerRepo),
		NewPromptBuilder(),
		&stubLLMProvider{name: "mock"},
		docRepo,
		NewGenerationGate(),
		true,
		nil,
	)
	uc := NewRegenerateDocumentUseCase(generateUC, docRepo, wsRepo)

	_, err := uc.Execute(orgContext(orgID), wsID, missingID)
	require.Error(t, err)
	assert.ErrorIs(t, err, domainErr.ErrNotFound)
	docRepo.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
}
