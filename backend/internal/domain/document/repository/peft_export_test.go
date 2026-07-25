package repository_test

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/repository"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPEFTExportFilter_Validate_RequiresOrganizationID(t *testing.T) {
	t.Parallel()
	err := (repository.PEFTExportFilter{}).Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "organization_id")
}

func TestPEFTExportFilter_Validate_AcceptsOptionalWorkspaceAndSince(t *testing.T) {
	t.Parallel()
	wsID := uuid.New()
	since := time.Now().UTC().Add(-24 * time.Hour)
	f := repository.PEFTExportFilter{
		OrganizationID: uuid.New(),
		WorkspaceID:    &wsID,
		Since:          &since,
		Limit:          100,
	}
	require.NoError(t, f.Validate())
}

func TestPEFTExportFilter_Validate_RejectsNegativeLimit(t *testing.T) {
	t.Parallel()
	err := (repository.PEFTExportFilter{
		OrganizationID: uuid.New(),
		Limit:          -1,
	}).Validate()
	require.Error(t, err)
}
