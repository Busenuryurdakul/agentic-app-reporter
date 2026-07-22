package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/questionnaire/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/repository"
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// BulkUpsertAnswersUseCase saves multiple workspace answers in one call.
type BulkUpsertAnswersUseCase struct {
	answerRepo    repository.AnswerRepository
	workspaceRepo tenantRepo.WorkspaceRepository
}

// NewBulkUpsertAnswersUseCase creates a new BulkUpsertAnswersUseCase.
func NewBulkUpsertAnswersUseCase(answerRepo repository.AnswerRepository, workspaceRepo tenantRepo.WorkspaceRepository) *BulkUpsertAnswersUseCase {
	return &BulkUpsertAnswersUseCase{answerRepo: answerRepo, workspaceRepo: workspaceRepo}
}

// Execute creates or updates a batch of answers for a workspace.
func (uc *BulkUpsertAnswersUseCase) Execute(ctx context.Context, workspaceID uuid.UUID, req dto.BulkUpsertAnswersRequest) ([]dto.AnswerInfo, error) {
	_, orgID, err := resolveWorkspace(ctx, uc.workspaceRepo, workspaceID)
	if err != nil {
		return nil, err
	}

	if len(req.Answers) == 0 {
		return nil, domainErr.New(domainErr.ErrValidation, "at least one answer is required", nil)
	}

	answers := make([]*model.Answer, 0, len(req.Answers))
	for _, item := range req.Answers {
		if item.QuestionID == uuid.Nil {
			return nil, domainErr.New(domainErr.ErrValidation, "question_id is required for each answer", nil)
		}
		answers = append(answers, &model.Answer{
			ID:             uuid.New(),
			OrganizationID: orgID,
			WorkspaceID:    workspaceID,
			QuestionID:     item.QuestionID,
			Value:          item.Value,
		})
	}

	if err := uc.answerRepo.BulkUpsert(ctx, answers); err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to save answers", err)
	}

	result := make([]dto.AnswerInfo, 0, len(answers))
	for _, a := range answers {
		result = append(result, toAnswerInfo(a))
	}
	return result, nil
}
