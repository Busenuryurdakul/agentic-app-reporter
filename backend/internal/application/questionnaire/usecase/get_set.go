package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/questionnaire/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
)

// GetSetUseCase fetches a single questionnaire set with its questions.
type GetSetUseCase struct {
	setRepo      repository.SetRepository
	questionRepo repository.QuestionRepository
}

// NewGetSetUseCase creates a new GetSetUseCase.
func NewGetSetUseCase(setRepo repository.SetRepository, questionRepo repository.QuestionRepository) *GetSetUseCase {
	return &GetSetUseCase{setRepo: setRepo, questionRepo: questionRepo}
}

// Execute returns a questionnaire set (with its ordered questions) by ID.
// Organization-scoped sets are only readable by their owning organization;
// global/default sets (nil organization) remain readable by every org.
func (uc *GetSetUseCase) Execute(ctx context.Context, setID uuid.UUID) (*dto.QuestionnaireSetDetail, error) {
	orgID, ok := middleware.ResolveOrganizationID(ctx)
	if !ok {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "organization context required", nil)
	}

	set, err := uc.setRepo.GetByID(ctx, setID)
	if err != nil {
		return nil, err
	}
	if !set.VisibleTo(orgID) {
		return nil, domainErr.New(domainErr.ErrForbidden, "questionnaire set is not accessible for your organization", nil)
	}

	questions, err := uc.questionRepo.ListBySetID(ctx, setID)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list questions", err)
	}

	detail := &dto.QuestionnaireSetDetail{
		QuestionnaireSetInfo: toSetInfo(set),
		Questions:            make([]dto.QuestionInfo, 0, len(questions)),
	}
	for _, q := range questions {
		detail.Questions = append(detail.Questions, toQuestionInfo(q))
	}
	return detail, nil
}
