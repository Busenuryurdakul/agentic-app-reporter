package usecase

import (
	"os"
	"path/filepath"
	"testing"

	exportdto "github.com/masterfabric-go/masterfabric/internal/application/datasetexport/dto"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWriteExportArtifacts_WritesTrainValAndManifest(t *testing.T) {
	dir := t.TempDir()
	orgID := uuid.New()
	result := &exportdto.ExportResult{
		Manifest: exportdto.ExportManifest{
			ExportVersion:  exportdto.ExportVersion,
			OrganizationID: orgID,
			Counts:         exportdto.ManifestCounts{Exported: 1, Train: 1},
		},
		Train: []exportdto.DatasetRow{sampleDatasetRow(orgID)},
		Val:   nil,
	}
	err := WriteExportArtifacts(dir, result, WriteArtifactsOptions{})
	require.NoError(t, err)
	assert.FileExists(t, filepath.Join(dir, "manifest.json"))
	assert.FileExists(t, filepath.Join(dir, "train.jsonl"))
	trainBytes, err := os.ReadFile(filepath.Join(dir, "train.jsonl"))
	require.NoError(t, err)
	assert.Contains(t, string(trainBytes), `"role":"system"`)
}

func TestWriteExportArtifacts_DryRunManifestOnly(t *testing.T) {
	dir := t.TempDir()
	result := &exportdto.ExportResult{
		Manifest: exportdto.ExportManifest{OrganizationID: uuid.New()},
	}
	err := WriteExportArtifacts(dir, result, WriteArtifactsOptions{DryRun: true})
	require.NoError(t, err)
	assert.FileExists(t, filepath.Join(dir, "manifest.json"))
	_, err = os.Stat(filepath.Join(dir, "train.jsonl"))
	assert.True(t, os.IsNotExist(err))
}

func TestWriteExportArtifacts_NonEmptyDirRequiresForce(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(dir, "existing.txt"), []byte("x"), 0o640))
	err := WriteExportArtifacts(dir, &exportdto.ExportResult{
		Manifest: exportdto.ExportManifest{OrganizationID: uuid.New()},
	}, WriteArtifactsOptions{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "--force")
}

func sampleDatasetRow(orgID uuid.UUID) exportdto.DatasetRow {
	return exportdto.DatasetRow{
		Messages: []exportdto.ChatMessage{
			{Role: exportdto.RoleSystem, Content: "sys"},
			{Role: exportdto.RoleUser, Content: "usr"},
			{Role: exportdto.RoleAssistant, Content: "body"},
		},
		Metadata: exportdto.RowMetadata{
			DocumentID:     uuid.New(),
			WorkspaceID:    uuid.New(),
			OrganizationID: orgID,
			DocumentType:   "product_spec",
			Language:       "tr",
			ExportVersion:  exportdto.ExportVersion,
		},
	}
}
