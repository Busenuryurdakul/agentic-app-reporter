package usecase

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/questionnaire/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/repository"
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// UpsertAnswerUseCase saves a single workspace answer.
type UpsertAnswerUseCase struct {
	answerRepo    repository.AnswerRepository
	questionRepo  repository.QuestionRepository
	workspaceRepo tenantRepo.WorkspaceRepository
}

// NewUpsertAnswerUseCase creates a new UpsertAnswerUseCase.
func NewUpsertAnswerUseCase(
	answerRepo repository.AnswerRepository,
	questionRepo repository.QuestionRepository,
	workspaceRepo tenantRepo.WorkspaceRepository,
) *UpsertAnswerUseCase {
	return &UpsertAnswerUseCase{answerRepo: answerRepo, questionRepo: questionRepo, workspaceRepo: workspaceRepo}
}

// Execute creates or updates a workspace's answer to a question.
func (uc *UpsertAnswerUseCase) Execute(ctx context.Context, workspaceID, questionID uuid.UUID, req dto.UpsertAnswerRequest) (*dto.AnswerInfo, error) {
	_, orgID, err := resolveWorkspace(ctx, uc.workspaceRepo, workspaceID)
	if err != nil {
		return nil, err
	}

	if _, err := uc.questionRepo.GetByID(ctx, questionID); err != nil {
		return nil, err
	}

	existing, err := uc.answerRepo.GetByWorkspaceAndQuestion(ctx, workspaceID, questionID)
	if err != nil && !errors.Is(err, domainErr.ErrNotFound) {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to load existing answer", err)
	}

	answer := existing
	if answer == nil {
		answer = &model.Answer{
			ID:             uuid.New(),
			OrganizationID: orgID,
			WorkspaceID:    workspaceID,
			QuestionID:     questionID,
		}
	}
	answer.Value = req.Value

	if err := uc.answerRepo.Upsert(ctx, answer); err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to save answer", err)
	}

	info := toAnswerInfo(answer)
	return &info, nil
}
