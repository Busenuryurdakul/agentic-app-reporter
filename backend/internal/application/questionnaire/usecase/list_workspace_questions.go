package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/questionnaire/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/repository"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/visibility"
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
)

// ListWorkspaceQuestionsUseCase resolves the default questionnaire set for a
// workspace's organization and merges it with the workspace's current answers.
type ListWorkspaceQuestionsUseCase struct {
	setRepo       repository.SetRepository
	questionRepo  repository.QuestionRepository
	answerRepo    repository.AnswerRepository
	workspaceRepo tenantRepo.WorkspaceRepository
}

// NewListWorkspaceQuestionsUseCase creates a new ListWorkspaceQuestionsUseCase.
func NewListWorkspaceQuestionsUseCase(
	setRepo repository.SetRepository,
	questionRepo repository.QuestionRepository,
	answerRepo repository.AnswerRepository,
	workspaceRepo tenantRepo.WorkspaceRepository,
) *ListWorkspaceQuestionsUseCase {
	return &ListWorkspaceQuestionsUseCase{
		setRepo:       setRepo,
		questionRepo:  questionRepo,
		answerRepo:    answerRepo,
		workspaceRepo: workspaceRepo,
	}
}

// Execute returns the default questionnaire set's active questions merged with
// the workspace's existing answers. Visibility is evaluated and exposed so
// clients can filter; the backend missing-information endpoint remains the
// source of truth for required/unanswered counts.
func (uc *ListWorkspaceQuestionsUseCase) Execute(ctx context.Context, workspaceID uuid.UUID) (*dto.WorkspaceQuestionsResult, error) {
	_, orgID, err := resolveWorkspace(ctx, uc.workspaceRepo, workspaceID)
	if err != nil {
		return nil, err
	}

	set, questions, answersByQuestion, err := loadDefaultSetWithAnswers(ctx, uc.setRepo, uc.questionRepo, uc.answerRepo, orgID, workspaceID)
	if err != nil {
		return nil, err
	}

	lookup := visibility.BuildAnswerLookup(questions, answersByQuestion)

	result := &dto.WorkspaceQuestionsResult{
		SetID:     set.ID,
		SetKey:    set.Key,
		Questions: make([]dto.WorkspaceQuestionInfo, 0, len(questions)),
	}
	for _, q := range questions {
		info := mergeQuestionWithAnswer(q, answersByQuestion[q.ID])
		visible := visibility.IsVisibleQuestion(q, lookup)
		info.Visible = &visible
		result.Questions = append(result.Questions, info)
	}
	return result, nil
}

func mergeQuestionWithAnswer(q *model.Question, answer *model.Answer) dto.WorkspaceQuestionInfo {
	info := dto.WorkspaceQuestionInfo{QuestionInfo: toQuestionInfo(q)}
	if answer != nil && !model.IsEmptyValue(answer.Value) {
		info.Answer = answer.Value
		info.Answered = true
	}
	return info
}
