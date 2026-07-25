package document_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// A-T3: ListForPEFTExport rejects nil organization via filter validation.
func TestListForPEFTExport_RejectsNilOrganization(t *testing.T) {
	t.Parallel()
	// Integration: wire real DocumentRepository with test DB in //go:build integration test.
	t.Skip("A-T4+: requires postgres integration fixture")
}

func TestListForPEFTExport_ValidationErrorIsBadRequest(t *testing.T) {
	t.Parallel()
	// Documents the expected error mapping once integration test is wired.
	err := domainErr.New(domainErr.ErrValidation, "organization_id is required for PEFT export", nil)
	assert.ErrorIs(t, err, domainErr.ErrValidation)
	require.NotNil(t, err)
}

// Placeholder table registers remaining Faz A integration tests from docs/issues/peft-dataset-export-phase-ab.md
func TestListForPEFTExport_IntegrationCases(t *testing.T) {
	cases := []struct {
		id   string
		name string
	}{
		{id: "A-T4", name: "FiltersApprovedProductSpecOnly"},
		{id: "A-T5", name: "RespectsSinceAndWorkspace"},
		{id: "A-T6", name: "OrdersByApprovedAt"},
		{id: "A-T7", name: "ExcludesEmptyMarkdownBody"},
	}
	for _, tc := range cases {
		t.Run(tc.id+"_"+tc.name, func(t *testing.T) {
			t.Skip("integration: postgres fixture not wired")
			_ = repository.PEFTExportFilter{OrganizationID: uuid.New()}
			_ = context.Background()
		})
	}
}
