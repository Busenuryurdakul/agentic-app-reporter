package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/questionnaire/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/repository"
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// ListAnswersUseCase lists all answers recorded for a workspace.
type ListAnswersUseCase struct {
	answerRepo    repository.AnswerRepository
	workspaceRepo tenantRepo.WorkspaceRepository
}

// NewListAnswersUseCase creates a new ListAnswersUseCase.
func NewListAnswersUseCase(answerRepo repository.AnswerRepository, workspaceRepo tenantRepo.WorkspaceRepository) *ListAnswersUseCase {
	return &ListAnswersUseCase{answerRepo: answerRepo, workspaceRepo: workspaceRepo}
}

// Execute returns all answers for a workspace.
func (uc *ListAnswersUseCase) Execute(ctx context.Context, workspaceID uuid.UUID) ([]dto.AnswerInfo, error) {
	if _, _, err := resolveWorkspace(ctx, uc.workspaceRepo, workspaceID); err != nil {
		return nil, err
	}

	answers, err := uc.answerRepo.ListByWorkspace(ctx, workspaceID)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list answers", err)
	}

	result := make([]dto.AnswerInfo, 0, len(answers))
	for _, a := range answers {
		result = append(result, toAnswerInfo(a))
	}
	return result, nil
}
