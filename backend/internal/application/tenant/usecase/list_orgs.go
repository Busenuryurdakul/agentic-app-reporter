package usecase

import (
	"context"

	"github.com/masterfabric-go/masterfabric/internal/application/tenant/dto"
	iamRepo "github.com/masterfabric-go/masterfabric/internal/domain/iam/repository"
	"github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
)

// ListOrgsUseCase lists organizations the current user belongs to.
type ListOrgsUseCase struct {
	orgRepo     repository.OrgRepository
	orgUserRepo iamRepo.OrgUserRepository
}

// NewListOrgsUseCase creates a new ListOrgsUseCase.
func NewListOrgsUseCase(
	orgRepo repository.OrgRepository,
	orgUserRepo iamRepo.OrgUserRepository,
) *ListOrgsUseCase {
	return &ListOrgsUseCase{orgRepo: orgRepo, orgUserRepo: orgUserRepo}
}

// Execute returns organizations for the authenticated user.
func (uc *ListOrgsUseCase) Execute(ctx context.Context) ([]dto.OrgInfo, error) {
	userID, ok := middleware.UserIDFromContext(ctx)
	if !ok {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "authentication required", nil)
	}

	memberships, err := uc.orgUserRepo.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	result := make([]dto.OrgInfo, 0, len(memberships))
	for _, membership := range memberships {
		org, err := uc.orgRepo.GetByID(ctx, membership.OrganizationID)
		if err != nil {
			continue
		}
		result = append(result, dto.OrgInfo{
			ID:        org.ID,
			Name:      org.Name,
			Slug:      org.Slug,
			Status:    string(org.Status),
			CreatedAt: org.CreatedAt,
		})
	}

	return result, nil
}
