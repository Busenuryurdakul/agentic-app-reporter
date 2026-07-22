package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/repository"
	tenantModel "github.com/masterfabric-go/masterfabric/internal/domain/tenant/model"
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
)

// resolveWorkspace resolves the active organization and verifies the
// workspace belongs to it, returning both for convenience.
func resolveWorkspace(ctx context.Context, workspaceRepo tenantRepo.WorkspaceRepository, workspaceID uuid.UUID) (*tenantModel.Workspace, uuid.UUID, error) {
	orgID, ok := middleware.ResolveOrganizationID(ctx)
	if !ok {
		return nil, uuid.Nil, domainErr.New(domainErr.ErrUnauthorized, "organization context required", nil)
	}

	workspace, err := workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return nil, uuid.Nil, err
	}
	if workspace.OrganizationID != orgID {
		return nil, uuid.Nil, domainErr.New(domainErr.ErrForbidden, "workspace does not belong to your organization", nil)
	}

	return workspace, orgID, nil
}

// loadDefaultSetWithAnswers resolves the default questionnaire set for an
// organization, its active questions, and a workspace's existing answers
// indexed by question ID. Shared by list_workspace_questions and
// missing_information to avoid duplicating the lookup logic.
func loadDefaultSetWithAnswers(
	ctx context.Context,
	setRepo repository.SetRepository,
	questionRepo repository.QuestionRepository,
	answerRepo repository.AnswerRepository,
	orgID uuid.UUID,
	workspaceID uuid.UUID,
) (*model.QuestionnaireSet, []*model.Question, map[uuid.UUID]*model.Answer, error) {
	set, err := setRepo.GetDefault(ctx, orgID)
	if err != nil {
		return nil, nil, nil, err
	}

	questions, err := questionRepo.ListBySetID(ctx, set.ID)
	if err != nil {
		return nil, nil, nil, domainErr.New(domainErr.ErrInternal, "failed to list questions", err)
	}

	answers, err := answerRepo.ListByWorkspace(ctx, workspaceID)
	if err != nil {
		return nil, nil, nil, domainErr.New(domainErr.ErrInternal, "failed to list answers", err)
	}

	answersByQuestion := make(map[uuid.UUID]*model.Answer, len(answers))
	for _, a := range answers {
		answersByQuestion[a.QuestionID] = a
	}

	return set, questions, answersByQuestion, nil
}
