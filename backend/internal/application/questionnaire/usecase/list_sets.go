package usecase

import (
	"context"

	"github.com/masterfabric-go/masterfabric/internal/application/questionnaire/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
)

// ListSetsUseCase lists questionnaire sets visible to the active organization.
type ListSetsUseCase struct {
	setRepo repository.SetRepository
}

// NewListSetsUseCase creates a new ListSetsUseCase.
func NewListSetsUseCase(setRepo repository.SetRepository) *ListSetsUseCase {
	return &ListSetsUseCase{setRepo: setRepo}
}

// Execute returns all active questionnaire sets visible to the caller's organization.
func (uc *ListSetsUseCase) Execute(ctx context.Context) ([]dto.QuestionnaireSetInfo, error) {
	orgID, ok := middleware.ResolveOrganizationID(ctx)
	if !ok {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "organization context required", nil)
	}

	sets, err := uc.setRepo.List(ctx, orgID)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list questionnaire sets", err)
	}

	result := make([]dto.QuestionnaireSetInfo, 0, len(sets))
	for _, s := range sets {
		result = append(result, toSetInfo(s))
	}
	return result, nil
}
