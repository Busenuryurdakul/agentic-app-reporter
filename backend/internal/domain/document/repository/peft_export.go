package repository

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// PEFTExportFilter scopes documents eligible for offline PEFT JSONL export.
// OrganizationID is required; other fields narrow the result set.
type PEFTExportFilter struct {
	OrganizationID uuid.UUID
	WorkspaceID    *uuid.UUID
	Since          *time.Time
	Limit          int
}

// Validate checks filter invariants before querying.
func (f PEFTExportFilter) Validate() error {
	if f.OrganizationID == uuid.Nil {
		return errors.New("organization_id is required for PEFT export")
	}
	if f.Limit < 0 {
		return errors.New("limit must be non-negative")
	}
	return nil
}
