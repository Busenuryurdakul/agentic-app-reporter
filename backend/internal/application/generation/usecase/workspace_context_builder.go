package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	profileModel "github.com/masterfabric-go/masterfabric/internal/domain/projectprofile/model"
	profileRepo "github.com/masterfabric-go/masterfabric/internal/domain/projectprofile/repository"
	qmodel "github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/model"
	qrepo "github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/repository"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/visibility"
	tenantModel "github.com/masterfabric-go/masterfabric/internal/domain/tenant/model"
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// WorkspaceContextBuilder assembles provider-agnostic LLM context from
// workspace, profile, and questionnaire data. Visibility rules from Phase 2
// are applied so hidden/inactive questions never enter the prompt context.
type WorkspaceContextBuilder struct {
	workspaceRepo tenantRepo.WorkspaceRepository
	profileRepo   profileRepo.ProfileRepository
	setRepo       qrepo.SetRepository
	questionRepo  qrepo.QuestionRepository
	answerRepo    qrepo.AnswerRepository
}

// NewWorkspaceContextBuilder creates a WorkspaceContextBuilder.
func NewWorkspaceContextBuilder(
	workspaceRepo tenantRepo.WorkspaceRepository,
	profileRepo profileRepo.ProfileRepository,
	setRepo qrepo.SetRepository,
	questionRepo qrepo.QuestionRepository,
	answerRepo qrepo.AnswerRepository,
) *WorkspaceContextBuilder {
	return &WorkspaceContextBuilder{
		workspaceRepo: workspaceRepo,
		profileRepo:   profileRepo,
		setRepo:       setRepo,
		questionRepo:  questionRepo,
		answerRepo:    answerRepo,
	}
}

// BuildContextOptions controls optional overrides for context assembly.
type BuildContextOptions struct {
	// LanguageOverride, when non-empty, replaces workspace preferred language.
	LanguageOverride string
}

// Build loads org-scoped workspace data and returns a WorkspaceLLMContext.
// Soft-gate: missing required visible answers are listed in MissingRequired
// but do not cause an error (generate can still proceed in later slices).
func (b *WorkspaceContextBuilder) Build(
	ctx context.Context,
	workspaceID uuid.UUID,
	opts BuildContextOptions,
) (*WorkspaceLLMContext, error) {
	workspace, orgID, err := resolveWorkspace(ctx, b.workspaceRepo, workspaceID)
	if err != nil {
		return nil, err
	}

	profile, err := b.profileRepo.GetByWorkspaceID(ctx, workspaceID)
	if err != nil {
		if !errors.Is(err, domainErr.ErrNotFound) {
			return nil, err
		}
		profile = profileModel.NewEmpty(orgID, workspaceID)
	}

	set, err := b.setRepo.GetDefault(ctx, orgID)
	if err != nil {
		return nil, err
	}

	questions, err := b.questionRepo.ListBySetID(ctx, set.ID)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list questions", err)
	}

	answers, err := b.answerRepo.ListByWorkspace(ctx, workspaceID)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list answers", err)
	}

	answersByQuestion := make(map[uuid.UUID]*qmodel.Answer, len(answers))
	for _, a := range answers {
		if a != nil {
			answersByQuestion[a.QuestionID] = a
		}
	}

	lookup := visibility.BuildAnswerLookup(questions, answersByQuestion)

	visibleAnswers := make([]VisibleAnswer, 0, len(questions))
	missing := make([]MissingRequiredItem, 0)
	for _, q := range questions {
		if q == nil || !q.Active {
			continue
		}
		if !visibility.IsVisibleQuestion(q, lookup) {
			continue
		}

		ans := answersByQuestion[q.ID]
		answered := ans != nil && !qmodel.IsEmptyValue(ans.Value)
		var value json.RawMessage
		if answered {
			value = sanitizeJSONValue(ans.Value)
		}

		visibleAnswers = append(visibleAnswers, VisibleAnswer{
			Key:      q.Key,
			Category: q.Category,
			Title:    q.Title,
			Value:    value,
			Required: q.Required,
			Answered: answered,
		})

		if q.Required && !answered {
			missing = append(missing, MissingRequiredItem{
				Key:      q.Key,
				Category: q.Category,
				Title:    q.Title,
			})
		}
	}

	lang := resolveLanguage(opts.LanguageOverride, workspace, profile)

	return &WorkspaceLLMContext{
		OrganizationID:   orgID,
		WorkspaceID:      workspace.ID,
		WorkspaceName:    workspace.Name,
		WorkspaceSlug:    workspace.Slug,
		Language:         lang,
		Profile:          toProfileSnapshot(profile),
		Answers:          visibleAnswers,
		MissingRequired:  missing,
		QuestionnaireSet: set.Key,
		GeneratedAt:      time.Now().UTC(),
	}, nil
}

func resolveLanguage(override string, workspace *tenantModel.Workspace, profile *profileModel.Profile) string {
	if strings.TrimSpace(override) != "" {
		return normalizeDocumentLanguage(override)
	}
	if workspace != nil && strings.TrimSpace(workspace.PreferredDocumentLanguage) != "" {
		return normalizeDocumentLanguage(workspace.PreferredDocumentLanguage)
	}
	if profile != nil && strings.TrimSpace(profile.PreferredDocumentLanguage) != "" {
		return normalizeDocumentLanguage(profile.PreferredDocumentLanguage)
	}
	return string(profileModel.DocumentLanguageTR)
}

func toProfileSnapshot(profile *profileModel.Profile) ProfileSnapshot {
	if profile == nil {
		return ProfileSnapshot{Sections: map[string]json.RawMessage{}}
	}

	sections := make(map[string]json.RawMessage)
	for name, raw := range profile.Sections() {
		sections[name] = sanitizeJSONValue(raw)
	}

	return ProfileSnapshot{
		ProjectName:               strings.TrimSpace(profile.ProjectName),
		ProjectDescription:        strings.TrimSpace(profile.ProjectDescription),
		ProductType:               strings.TrimSpace(profile.ProductType),
		TargetUsers:               strings.TrimSpace(profile.TargetUsers),
		MainProblem:               strings.TrimSpace(profile.MainProblem),
		MainUseCases:              strings.TrimSpace(profile.MainUseCases),
		ProjectStatus:             strings.TrimSpace(profile.ProjectStatus),
		PreferredDocumentLanguage: normalizeDocumentLanguage(profile.PreferredDocumentLanguage),
		Sections:                  sections,
	}
}
