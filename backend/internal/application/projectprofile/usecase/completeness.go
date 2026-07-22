package usecase

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/projectprofile/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/projectprofile/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/projectprofile/repository"
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
)

// generalField describes one "general information" field used in the
// completeness calculation, along with its fixed point weight.
type generalField struct {
	Key    string
	Weight int
	Value  string
}

// sectionKeyTarget is the number of populated keys in a JSONB configuration
// section (frontend/backend/data/infrastructure/ai/development_standards)
// that is considered a "fully filled" section for scoring purposes. This is a
// deterministic heuristic, not a strict schema requirement.
const sectionKeyTarget = 3

// sectionWeight is the fixed point weight assigned to each of the six JSONB
// configuration sections. 6 sections * 10 points = 60 points.
const sectionWeight = 10

// generalFields returns the weighted general fields for a profile in a fixed,
// deterministic order. Weights sum to 40 points (out of 100 total, the
// remaining 60 coming from the six JSONB sections at 10 points each).
func generalFields(p *model.Profile) []generalField {
	return []generalField{
		{Key: "project_name", Weight: 8, Value: p.ProjectName},
		{Key: "project_description", Weight: 8, Value: p.ProjectDescription},
		{Key: "product_type", Weight: 6, Value: p.ProductType},
		{Key: "target_users", Weight: 6, Value: p.TargetUsers},
		{Key: "main_problem", Weight: 6, Value: p.MainProblem},
		{Key: "main_use_cases", Weight: 6, Value: p.MainUseCases},
	}
}

// sectionOrder is the fixed, deterministic iteration order for JSONB sections.
var sectionOrder = []string{"frontend", "backend", "data", "infrastructure", "ai", "development_standards"}

// CalculateCompleteness deterministically computes a 0-100 weighted
// completeness score for a project profile.
//
// Scoring model (100 points total):
//   - General fields (40 points): project_name, project_description,
//     product_type, target_users, main_problem, main_use_cases. Each
//     contributes its fixed weight in full when non-empty, zero otherwise.
//   - JSONB sections (60 points, 10 each): frontend, backend, data,
//     infrastructure, ai, development_standards. Each section's fill ratio is
//     min(1, non-empty top-level keys / sectionKeyTarget), contributing up to
//     its full weight.
func CalculateCompleteness(p *model.Profile) *dto.CompletenessResult {
	sections := make(map[string]int, len(sectionOrder)+1)
	missing := make([]string, 0)
	totalPoints := 0

	// General fields.
	generalFilled := 0
	fields := generalFields(p)
	for _, f := range fields {
		if strings.TrimSpace(f.Value) != "" {
			totalPoints += f.Weight
			generalFilled++
		} else {
			missing = append(missing, f.Key)
		}
	}
	if len(fields) > 0 {
		sections["general"] = (generalFilled * 100) / len(fields)
	}

	// JSONB sections.
	raw := p.Sections()
	for _, key := range sectionOrder {
		m := model.SectionMap(raw[key])
		nonEmptyKeys := countNonEmptyKeys(m)

		ratio := float64(nonEmptyKeys) / float64(sectionKeyTarget)
		if ratio > 1 {
			ratio = 1
		}
		sections[key] = int(ratio * 100)
		totalPoints += int(ratio * float64(sectionWeight))

		if nonEmptyKeys == 0 {
			missing = append(missing, key)
		}
	}

	overall := totalPoints
	if overall > 100 {
		overall = 100
	}
	if overall < 0 {
		overall = 0
	}

	return &dto.CompletenessResult{
		Overall:  overall,
		Sections: sections,
		Missing:  missing,
	}
}

// countNonEmptyKeys counts top-level keys in m whose value is not a
// "zero-ish" value (nil, empty string, empty slice/map).
func countNonEmptyKeys(m map[string]any) int {
	count := 0
	for _, v := range m {
		if !isZeroishJSONValue(v) {
			count++
		}
	}
	return count
}

func isZeroishJSONValue(v any) bool {
	switch val := v.(type) {
	case nil:
		return true
	case string:
		return strings.TrimSpace(val) == ""
	case []any:
		return len(val) == 0
	case map[string]any:
		return len(val) == 0
	case bool:
		return false
	case float64:
		return false
	default:
		return false
	}
}

// CompletenessUseCase computes the completeness report for a workspace's
// project profile.
type CompletenessUseCase struct {
	profileRepo   repository.ProfileRepository
	workspaceRepo tenantRepo.WorkspaceRepository
}

// NewCompletenessUseCase creates a new CompletenessUseCase.
func NewCompletenessUseCase(profileRepo repository.ProfileRepository, workspaceRepo tenantRepo.WorkspaceRepository) *CompletenessUseCase {
	return &CompletenessUseCase{profileRepo: profileRepo, workspaceRepo: workspaceRepo}
}

// Execute resolves the workspace's profile (or a default empty one) and
// returns its completeness report.
func (uc *CompletenessUseCase) Execute(ctx context.Context, workspaceID uuid.UUID) (*dto.CompletenessResult, error) {
	profile, err := resolveWorkspaceProfile(ctx, uc.workspaceRepo, uc.profileRepo, workspaceID)
	if err != nil {
		return nil, err
	}
	return CalculateCompleteness(profile), nil
}
