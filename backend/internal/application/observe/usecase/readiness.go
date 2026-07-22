package usecase

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/observe/dto"
	profiledto "github.com/masterfabric-go/masterfabric/internal/application/projectprofile/dto"
	questdto "github.com/masterfabric-go/masterfabric/internal/application/questionnaire/dto"
	docRepo "github.com/masterfabric-go/masterfabric/internal/domain/document/repository"
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
)

// profileCompleteness loads the profile completeness overall score.
type profileCompleteness interface {
	Execute(ctx context.Context, workspaceID uuid.UUID) (*profiledto.CompletenessResult, error)
}

// missingInformation loads required-visible questionnaire gaps.
type missingInformation interface {
	Execute(ctx context.Context, workspaceID uuid.UUID) (*questdto.MissingInformationResult, error)
}

// ReadinessUseCase computes deterministic workspace readiness (no LLM).
type ReadinessUseCase struct {
	completenessUC profileCompleteness
	missingUC      missingInformation
	docRepo        docRepo.DocumentRepository
	workspaceRepo  tenantRepo.WorkspaceRepository
}

// NewReadinessUseCase creates a ReadinessUseCase.
func NewReadinessUseCase(
	completenessUC profileCompleteness,
	missingUC missingInformation,
	docRepo docRepo.DocumentRepository,
	workspaceRepo tenantRepo.WorkspaceRepository,
) *ReadinessUseCase {
	return &ReadinessUseCase{
		completenessUC: completenessUC,
		missingUC:      missingUC,
		docRepo:        docRepo,
		workspaceRepo:  workspaceRepo,
	}
}

// Execute returns the readiness score for a workspace in the caller's organization.
func (uc *ReadinessUseCase) Execute(ctx context.Context, workspaceID uuid.UUID) (*dto.ReadinessResult, error) {
	if _, _, err := resolveWorkspace(ctx, uc.workspaceRepo, workspaceID); err != nil {
		return nil, err
	}

	completeness, err := uc.completenessUC.Execute(ctx, workspaceID)
	if err != nil {
		return nil, err
	}

	missing, err := uc.missingUC.Execute(ctx, workspaceID)
	if err != nil {
		return nil, err
	}

	stats, err := uc.docRepo.CountByWorkspace(ctx, workspaceID)
	if err != nil {
		return nil, err
	}

	overall, components := CalculateReadinessScore(
		completeness.Overall,
		missing.Answered,
		missing.Total,
		stats.Succeeded,
	)

	gaps := make([]dto.MissingRequiredQuestion, 0, len(missing.Missing))
	for _, m := range missing.Missing {
		gaps = append(gaps, dto.MissingRequiredQuestion{
			QuestionID: m.QuestionID,
			Category:   m.Category,
			Title:      m.Title,
		})
	}

	return &dto.ReadinessResult{
		Overall: overall,
		Components: dto.ReadinessComponents{
			Profile:       components.Profile,
			Questionnaire: components.Questionnaire,
			Documents:     components.Documents,
		},
		MissingRequiredQuestions: gaps,
		SucceededDocumentCount:   stats.Succeeded,
		FailedDocumentCount:      stats.Failed,
		ComputedAt:               time.Now().UTC(),
	}, nil
}
