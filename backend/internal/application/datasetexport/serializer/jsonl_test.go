package serializer_test

import (
	"os"
	"strings"
	"testing"

	exportdto "github.com/masterfabric-go/masterfabric/internal/application/datasetexport/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/datasetexport/serializer"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func validRow() exportdto.DatasetRow {
	return exportdto.DatasetRow{
		Messages: []exportdto.ChatMessage{
			{Role: exportdto.RoleSystem, Content: "system prompt"},
			{Role: exportdto.RoleUser, Content: "user prompt"},
			{Role: exportdto.RoleAssistant, Content: "# Ürün Spesifikasyonu\n\n## 1. Özet"},
		},
		Metadata: exportdto.RowMetadata{
			DocumentID:     uuid.New(),
			WorkspaceID:    uuid.New(),
			OrganizationID: uuid.New(),
			DocumentType:   "product_spec",
			Language:       "tr",
			ExportVersion:  exportdto.ExportVersion,
		},
	}
}

func TestValidateRow_RequiresThreeMessages(t *testing.T) {
	t.Parallel()
	row := validRow()
	row.Messages = row.Messages[:2]
	err := serializer.ValidateRow(row)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "3 messages")
}

func TestValidateRow_RequiresSystemUserAssistantOrder(t *testing.T) {
	t.Parallel()
	row := validRow()
	row.Messages[1].Role = exportdto.RoleAssistant
	err := serializer.ValidateRow(row)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "role")
}

func TestValidateRow_RejectsEmptyContent(t *testing.T) {
	t.Parallel()
	row := validRow()
	row.Messages[2].Content = "   "
	err := serializer.ValidateRow(row)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "empty")
}

func TestEncodeLine_ProducesSingleLineUTF8(t *testing.T) {
	t.Parallel()
	line, err := serializer.EncodeLine(validRow())
	require.NoError(t, err)
	assert.True(t, strings.HasSuffix(string(line), "\n"))
	assert.Equal(t, 1, strings.Count(string(line), "\n"))
}

func TestEncodeLine_PreservesTurkishCharacters(t *testing.T) {
	t.Parallel()
	row := validRow()
	row.Messages[2].Content = "ğüşıöç İstanbul"
	line, err := serializer.EncodeLine(row)
	require.NoError(t, err)
	assert.Contains(t, string(line), "ğüşıöç")
}

func TestGoldenRow_MatchesFixture(t *testing.T) {
	t.Parallel()
	row := exportdto.DatasetRow{
		Messages: []exportdto.ChatMessage{
			{Role: exportdto.RoleSystem, Content: "system prompt"},
			{Role: exportdto.RoleUser, Content: "user prompt"},
			{Role: exportdto.RoleAssistant, Content: "# Ürün Spesifikasyonu\n\n## 1. Özet"},
		},
		Metadata: exportdto.RowMetadata{
			DocumentID:     uuid.MustParse("11111111-1111-4111-8111-111111111111"),
			WorkspaceID:    uuid.MustParse("22222222-2222-4222-8222-222222222222"),
			OrganizationID: uuid.MustParse("33333333-3333-4333-8333-333333333333"),
			DocumentType:   "product_spec",
			Language:       "tr",
			ExportVersion:  exportdto.ExportVersion,
		},
	}
	got, err := serializer.EncodeLine(row)
	require.NoError(t, err)
	want, err := os.ReadFile("testdata/product_spec_row.jsonl")
	require.NoError(t, err)
	assert.JSONEq(t, string(want), strings.TrimSpace(string(got)))
}
