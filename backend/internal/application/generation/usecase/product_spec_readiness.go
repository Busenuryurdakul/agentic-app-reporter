package usecase

import (
	"context"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/generation/dto"
	observeDto "github.com/masterfabric-go/masterfabric/internal/application/observe/dto"
	profileDto "github.com/masterfabric-go/masterfabric/internal/application/projectprofile/dto"
)

const (
	minProjectDescriptionRunes = 20
	maxReadinessWarningsShown  = 5
)

// workspaceReadiness loads the deterministic workspace readiness score.
type workspaceReadiness interface {
	Execute(ctx context.Context, workspaceID uuid.UUID) (*observeDto.ReadinessResult, error)
}

// workspaceProfile loads the project profile for readiness checks.
type workspaceProfile interface {
	Execute(ctx context.Context, workspaceID uuid.UUID) (*profileDto.ProfileInfo, error)
}

// ProductSpecReadinessUseCase evaluates whether a workspace is ready for Product Spec generation.
type ProductSpecReadinessUseCase struct {
	readinessUC workspaceReadiness
	profileUC   workspaceProfile
}

// NewProductSpecReadinessUseCase creates a ProductSpecReadinessUseCase.
func NewProductSpecReadinessUseCase(readinessUC workspaceReadiness, profileUC workspaceProfile) *ProductSpecReadinessUseCase {
	return &ProductSpecReadinessUseCase{
		readinessUC: readinessUC,
		profileUC:   profileUC,
	}
}

// Execute returns the Product Spec pre-generation gate for a workspace.
func (uc *ProductSpecReadinessUseCase) Execute(ctx context.Context, workspaceID uuid.UUID) (*dto.ProductSpecReadinessResult, error) {
	readiness, err := uc.readinessUC.Execute(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	profile, err := uc.profileUC.Execute(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	result := EvaluateProductSpecReadiness(profile, readiness)
	return &result, nil
}

// EvaluateProductSpecReadiness builds the gate from existing readiness and profile data.
func EvaluateProductSpecReadiness(profile *profileDto.ProfileInfo, readiness *observeDto.ReadinessResult) dto.ProductSpecReadinessResult {
	out := dto.ProductSpecReadinessResult{
		CanGenerate:    true,
		ReadinessScore: 0,
		BlockingIssues: []dto.ProductSpecReadinessIssue{},
		Warnings:       []dto.ProductSpecReadinessIssue{},
	}
	if readiness != nil {
		out.ReadinessScore = readiness.Overall
		out.MissingRequiredCount = len(readiness.MissingRequiredQuestions)
		out.Warnings = appendMissingQuestionWarnings(out.Warnings, readiness)
	}
	if profile == nil {
		out.CanGenerate = false
		out.BlockingIssues = append(out.BlockingIssues, dto.ProductSpecReadinessIssue{
			Code:    "missing_profile_record",
			Field:   "profile",
			Message: "Temel proje profili kaydı bulunamadı.",
		})
		return out
	}

	projectName := strings.TrimSpace(profile.ProjectName)
	projectDescription := strings.TrimSpace(profile.ProjectDescription)

	if profile.ID == uuid.Nil {
		out.CanGenerate = false
		out.BlockingIssues = append(out.BlockingIssues, dto.ProductSpecReadinessIssue{
			Code:    "missing_profile_record",
			Field:   "profile",
			Message: "Temel proje profili henüz kaydedilmemiş. Plan sayfasından profili kaydedin.",
		})
	}
	if projectName == "" {
		out.CanGenerate = false
		out.BlockingIssues = append(out.BlockingIssues, dto.ProductSpecReadinessIssue{
			Code:    "missing_project_name",
			Field:   "project_name",
			Message: "Proje adı boş.",
		})
	}
	if projectDescription == "" {
		out.CanGenerate = false
		out.BlockingIssues = append(out.BlockingIssues, dto.ProductSpecReadinessIssue{
			Code:    "missing_project_description",
			Field:   "project_description",
			Message: "Proje açıklaması boş.",
		})
	}

	out.Warnings = appendProfileFieldWarnings(out.Warnings, profile, projectName, projectDescription)
	return out
}

func appendMissingQuestionWarnings(warnings []dto.ProductSpecReadinessIssue, readiness *observeDto.ReadinessResult) []dto.ProductSpecReadinessIssue {
	if readiness == nil || len(readiness.MissingRequiredQuestions) == 0 {
		return warnings
	}
	shown := readiness.MissingRequiredQuestions
	if len(shown) > maxReadinessWarningsShown {
		shown = shown[:maxReadinessWarningsShown]
	}
	for _, q := range shown {
		warnings = append(warnings, dto.ProductSpecReadinessIssue{
			Code:    "missing_required_question",
			Field:   q.QuestionID.String(),
			Message: "Zorunlu anket sorusu cevapsız: " + strings.TrimSpace(q.Title),
		})
	}
	if len(readiness.MissingRequiredQuestions) > maxReadinessWarningsShown {
		extra := len(readiness.MissingRequiredQuestions) - maxReadinessWarningsShown
		warnings = append(warnings, dto.ProductSpecReadinessIssue{
			Code:    "missing_required_questions_more",
			Field:   "questionnaire",
			Message: strings.TrimSpace(formatMoreMissingQuestions(extra)),
		})
	}
	return warnings
}

func appendProfileFieldWarnings(
	warnings []dto.ProductSpecReadinessIssue,
	profile *profileDto.ProfileInfo,
	projectName, projectDescription string,
) []dto.ProductSpecReadinessIssue {
	if isWeakProjectName(projectName) {
		warnings = append(warnings, dto.ProductSpecReadinessIssue{
			Code:    "weak_project_name",
			Field:   "project_name",
			Message: "Proje adı anlamlı bir isim gibi görünmüyor.",
		})
	}
	if projectDescription != "" && utf8.RuneCountInString(projectDescription) < minProjectDescriptionRunes {
		warnings = append(warnings, dto.ProductSpecReadinessIssue{
			Code:    "short_project_description",
			Field:   "project_description",
			Message: "Proje açıklaması çok kısa; daha ayrıntılı bir açıklama kaliteyi artırır.",
		})
	}
	if strings.TrimSpace(profile.TargetUsers) == "" {
		warnings = append(warnings, dto.ProductSpecReadinessIssue{
			Code:    "missing_target_users",
			Field:   "target_users",
			Message: "Hedef kullanıcılar belirtilmemiş.",
		})
	}
	if strings.TrimSpace(profile.MainProblem) == "" {
		warnings = append(warnings, dto.ProductSpecReadinessIssue{
			Code:    "missing_main_problem",
			Field:   "main_problem",
			Message: "Ana problem belirtilmemiş.",
		})
	}
	if strings.TrimSpace(profile.MainUseCases) == "" {
		warnings = append(warnings, dto.ProductSpecReadinessIssue{
			Code:    "missing_main_use_cases",
			Field:   "main_use_cases",
			Message: "Ana kullanım senaryoları belirtilmemiş.",
		})
	}
	return warnings
}

func isWeakProjectName(name string) bool {
	name = strings.TrimSpace(strings.ToLower(name))
	if name == "" {
		return false
	}
	switch name {
	case "1", "11", "test", "demo", "deneme", "örnek", "ornek", "sample", "proj", "proje", "a", "x":
		return true
	}
	if utf8.RuneCountInString(name) <= 2 {
		return true
	}
	return false
}

func formatMoreMissingQuestions(extra int) string {
	return fmt.Sprintf("%d ek zorunlu anket sorusu daha cevapsız.", extra)
}
