package usecase

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/projectprofile/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCalculateCompleteness_EmptyProfile(t *testing.T) {
	p := model.NewEmpty(uuid.New(), uuid.New())

	result := CalculateCompleteness(p)

	require.NotNil(t, result)
	assert.Equal(t, 0, result.Overall)
	assert.Equal(t, 0, result.Sections["general"])
	for _, key := range sectionOrder {
		assert.Equal(t, 0, result.Sections[key])
	}
	// All 6 general fields + 6 sections should be reported missing.
	assert.Len(t, result.Missing, 12)
}

func TestCalculateCompleteness_FullyFilledProfile(t *testing.T) {
	p := model.NewEmpty(uuid.New(), uuid.New())
	p.ProjectName = "Reporter"
	p.ProjectDescription = "An app reporting tool"
	p.ProductType = "web"
	p.TargetUsers = "internal teams"
	p.MainProblem = "manual reporting"
	p.MainUseCases = "generate docs"

	fullSection := json.RawMessage(`{"framework":"next","language":"typescript","styling":"tailwind"}`)
	p.Frontend = fullSection
	p.Backend = fullSection
	p.Data = fullSection
	p.Infrastructure = fullSection
	p.AI = fullSection
	p.DevelopmentStandards = fullSection

	result := CalculateCompleteness(p)

	require.NotNil(t, result)
	assert.Equal(t, 100, result.Overall)
	assert.Equal(t, 100, result.Sections["general"])
	for _, key := range sectionOrder {
		assert.Equal(t, 100, result.Sections[key], "section %s should be fully filled", key)
	}
	assert.Empty(t, result.Missing)
}

func TestCalculateCompleteness_PartiallyFilledProfile(t *testing.T) {
	p := model.NewEmpty(uuid.New(), uuid.New())
	p.ProjectName = "Reporter"
	p.ProjectDescription = "An app reporting tool"
	// product_type, target_users, main_problem, main_use_cases left empty.

	p.Frontend = json.RawMessage(`{"framework":"next"}`) // 1 of 3 target keys

	result := CalculateCompleteness(p)

	require.NotNil(t, result)
	// General: 8 (project_name) + 8 (project_description) = 16 points.
	// Frontend: ratio 1/3 * 10 = 3 points (int truncation).
	assert.Equal(t, 19, result.Overall)
	assert.Contains(t, result.Missing, "product_type")
	assert.Contains(t, result.Missing, "target_users")
	assert.Contains(t, result.Missing, "main_problem")
	assert.Contains(t, result.Missing, "main_use_cases")
	assert.NotContains(t, result.Missing, "project_name")
	assert.NotContains(t, result.Missing, "frontend")
	assert.Contains(t, result.Missing, "backend")
}

func TestCalculateCompleteness_IsDeterministic(t *testing.T) {
	p := model.NewEmpty(uuid.New(), uuid.New())
	p.ProjectName = "Reporter"
	p.Backend = json.RawMessage(`{"framework":"go","database":"postgres"}`)

	first := CalculateCompleteness(p)
	second := CalculateCompleteness(p)

	assert.Equal(t, first, second)
}

func TestCalculateCompleteness_OverCapKeysDoNotExceedSectionWeight(t *testing.T) {
	p := model.NewEmpty(uuid.New(), uuid.New())
	// More than sectionKeyTarget non-empty keys should still cap at 100 for the section.
	p.Data = json.RawMessage(`{"a":"1","b":"2","c":"3","d":"4","e":"5"}`)

	result := CalculateCompleteness(p)

	assert.Equal(t, 100, result.Sections["data"])
}

func TestCalculateCompleteness_WhitespaceGeneralFieldIsEmpty(t *testing.T) {
	p := model.NewEmpty(uuid.New(), uuid.New())
	p.ProjectName = "   "

	result := CalculateCompleteness(p)

	assert.Equal(t, 0, result.Overall)
	assert.Contains(t, result.Missing, "project_name")
	assert.Equal(t, 0, result.Sections["general"])
}

func TestCalculateCompleteness_ZeroishJSONValues(t *testing.T) {
	p := model.NewEmpty(uuid.New(), uuid.New())
	p.Frontend = json.RawMessage(`{"a":"","b":[],"c":{},"d":null,"e":true,"f":0}`)

	result := CalculateCompleteness(p)

	// Only e and f count → 2/3 ratio → section%=66, points=int(20/3)=6.
	assert.Equal(t, 66, result.Sections["frontend"])
	assert.Equal(t, 6, result.Overall)
	assert.NotContains(t, result.Missing, "frontend")
}

func TestCalculateCompleteness_StatusAndLanguageExcluded(t *testing.T) {
	p := model.NewEmpty(uuid.New(), uuid.New())
	p.ProjectStatus = string(model.ProjectStatusActive)
	p.PreferredDocumentLanguage = string(model.DocumentLanguageEN)

	result := CalculateCompleteness(p)

	assert.Equal(t, 0, result.Overall)
	assert.NotContains(t, result.Missing, "project_status")
	assert.NotContains(t, result.Missing, "preferred_document_language")
}

func TestCalculateCompleteness_GeneralSectionIsCountBased(t *testing.T) {
	p := model.NewEmpty(uuid.New(), uuid.New())
	p.ProjectName = "Reporter"
	p.ProjectDescription = "Docs"
	p.ProductType = "web"
	// 3 of 6 general fields filled → general section % = 50 (count-based).

	result := CalculateCompleteness(p)

	assert.Equal(t, 50, result.Sections["general"])
	// Weights: 8+8+6 = 22 points from general fields.
	assert.Equal(t, 22, result.Overall)
}

func TestCalculateCompleteness_SectionTruncation(t *testing.T) {
	p := model.NewEmpty(uuid.New(), uuid.New())
	p.Frontend = json.RawMessage(`{"framework":"next"}`)

	result := CalculateCompleteness(p)

	assert.Equal(t, 33, result.Sections["frontend"])
	assert.Equal(t, 3, result.Overall)
}
