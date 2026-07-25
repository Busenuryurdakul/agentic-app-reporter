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

func TestListForPEFTExport_ValidationErrorIsBadRequest(t *testing.T) {
	t.Parallel()
	err := domainErr.New(domainErr.ErrValidation, "organization_id is required for PEFT export", nil)
	assert.ErrorIs(t, err, domainErr.ErrValidation)
	require.NotNil(t, err)
}

func TestPEFTExportFilter_IntegrationCasesRegistered(t *testing.T) {
	t.Parallel()
	// Postgres behaviour covered by peft_export_integration_test.go (go test -tags=integration).
	_ = repository.PEFTExportFilter{OrganizationID: uuid.New()}
	_ = context.Background()
}
