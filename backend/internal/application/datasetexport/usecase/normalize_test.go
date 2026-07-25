package usecase_test

import (
	"testing"

	exportdto "github.com/masterfabric-go/masterfabric/internal/application/datasetexport/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/datasetexport/usecase"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalizeExportOptions_Defaults(t *testing.T) {
	opts, err := usecase.NormalizeExportOptions(exportdto.ExportOptions{OrganizationID: uuid.New()})
	require.NoError(t, err)
	assert.Equal(t, 0.9, opts.SplitRatio)
	assert.Equal(t, "peft-export-v1", opts.SplitSalt)
	assert.Equal(t, 80, opts.MinQualityScore)
	assert.True(t, opts.RequireSectionCoverage)
}

func TestNormalizeExportOptions_RequiresOrg(t *testing.T) {
	_, err := usecase.NormalizeExportOptions(exportdto.ExportOptions{})
	require.Error(t, err)
}
