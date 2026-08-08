package usecase

import (
	"testing"

	"github.com/google/uuid"
	genDto "github.com/masterfabric-go/masterfabric/internal/application/generation/dto"
	observeDto "github.com/masterfabric-go/masterfabric/internal/application/observe/dto"
	profileDto "github.com/masterfabric-go/masterfabric/internal/application/projectprofile/dto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEvaluateProductSpecReadiness_BlocksEmptyProfileFields(t *testing.T) {
	t.Parallel()
	result := EvaluateProductSpecReadiness(&profileDto.ProfileInfo{
		ID:          uuid.New(),
		ProjectName: "",
	}, &observeDto.ReadinessResult{Overall: 10})
	require.False(t, result.CanGenerate)
	require.NotEmpty(t, result.BlockingIssues)
	codes := readinessIssueCodes(result.BlockingIssues)
	assert.Contains(t, codes, "missing_project_name")
	assert.Contains(t, codes, "missing_project_description")
}

func TestEvaluateProductSpecReadiness_BlocksUnsavedProfile(t *testing.T) {
	t.Parallel()
	result := EvaluateProductSpecReadiness(&profileDto.ProfileInfo{
		ID:                 uuid.Nil,
		ProjectName:        "Reporter",
		ProjectDescription: "Valid description for the project",
	}, &observeDto.ReadinessResult{Overall: 20})
	require.False(t, result.CanGenerate)
	assert.Contains(t, readinessIssueCodes(result.BlockingIssues), "missing_profile_record")
}

func TestEvaluateProductSpecReadiness_WarnsMissingTargetUsers(t *testing.T) {
	t.Parallel()
	result := EvaluateProductSpecReadiness(&profileDto.ProfileInfo{
		ID:                 uuid.New(),
		ProjectName:        "Reporter",
		ProjectDescription: "Valid description for the project",
		TargetUsers:        "",
	}, &observeDto.ReadinessResult{Overall: 55})
	require.True(t, result.CanGenerate)
	assert.Contains(t, readinessIssueCodes(result.Warnings), "missing_target_users")
}

func TestEvaluateProductSpecReadiness_WarnsWeakProjectName(t *testing.T) {
	t.Parallel()
	result := EvaluateProductSpecReadiness(&profileDto.ProfileInfo{
		ID:                 uuid.New(),
		ProjectName:        "11",
		ProjectDescription: "Valid description for the project",
		TargetUsers:        "Developers",
		MainProblem:        "Problem",
		MainUseCases:       "Use cases",
	}, &observeDto.ReadinessResult{Overall: 70})
	require.True(t, result.CanGenerate)
	assert.Contains(t, readinessIssueCodes(result.Warnings), "weak_project_name")
}

func TestEvaluateProductSpecReadiness_CountsMissingRequiredQuestions(t *testing.T) {
	t.Parallel()
	result := EvaluateProductSpecReadiness(&profileDto.ProfileInfo{
		ID:                 uuid.New(),
		ProjectName:        "Reporter",
		ProjectDescription: "Valid description for the project",
		TargetUsers:        "Developers",
		MainProblem:        "Problem",
		MainUseCases:       "Use cases",
	}, &observeDto.ReadinessResult{
		Overall: 64,
		MissingRequiredQuestions: []observeDto.MissingRequiredQuestion{
			{QuestionID: uuid.New(), Title: "Hedef kullanıcılar"},
			{QuestionID: uuid.New(), Title: "MCP kullanımı"},
		},
	})
	require.True(t, result.CanGenerate)
	assert.Equal(t, 2, result.MissingRequiredCount)
	assert.Equal(t, 64, result.ReadinessScore)
	assert.NotEmpty(t, result.Warnings)
}

func readinessIssueCodes(issues []genDto.ProductSpecReadinessIssue) []string {
	out := make([]string, 0, len(issues))
	for _, i := range issues {
		out = append(out, i.Code)
	}
	return out
}
