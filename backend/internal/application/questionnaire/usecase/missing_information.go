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

// MissingInformationUseCase computes which required, active, currently-visible
// questions a workspace has not yet answered (or answered with an empty value).
type MissingInformationUseCase struct {
	setRepo       repository.SetRepository
	questionRepo  repository.QuestionRepository
	answerRepo    repository.AnswerRepository
	workspaceRepo tenantRepo.WorkspaceRepository
}

// NewMissingInformationUseCase creates a new MissingInformationUseCase.
func NewMissingInformationUseCase(
	setRepo repository.SetRepository,
	questionRepo repository.QuestionRepository,
	answerRepo repository.AnswerRepository,
	workspaceRepo tenantRepo.WorkspaceRepository,
) *MissingInformationUseCase {
	return &MissingInformationUseCase{
		setRepo:       setRepo,
		questionRepo:  questionRepo,
		answerRepo:    answerRepo,
		workspaceRepo: workspaceRepo,
	}
}

// Execute returns the list of required, active, visible questions in the
// default questionnaire set that the workspace has not answered (or answered
// with an empty value). Hidden questions are excluded even when required.
func (uc *MissingInformationUseCase) Execute(ctx context.Context, workspaceID uuid.UUID) (*dto.MissingInformationResult, error) {
	_, orgID, err := resolveWorkspace(ctx, uc.workspaceRepo, workspaceID)
	if err != nil {
		return nil, err
	}

	set, questions, answersByQuestion, err := loadDefaultSetWithAnswers(ctx, uc.setRepo, uc.questionRepo, uc.answerRepo, orgID, workspaceID)
	if err != nil {
		return nil, err
	}

	lookup := visibility.BuildAnswerLookup(questions, answersByQuestion)

	result := &dto.MissingInformationResult{SetID: set.ID}
	for _, q := range questions {
		if !q.Required || !q.Active {
			continue
		}
		if !visibility.IsVisibleQuestion(q, lookup) {
			continue
		}
		result.Total++

		answer, answered := answersByQuestion[q.ID]
		if answered && !model.IsEmptyValue(answer.Value) {
			result.Answered++
			continue
		}

		result.Missing = append(result.Missing, dto.MissingQuestionInfo{
			QuestionID: q.ID,
			Category:   q.Category,
			Title:      q.Title,
		})
	}

	return result, nil
}
