package model

import (
	"time"

	"github.com/google/uuid"
)

// QuestionnaireSet is a named, ordered collection of questions
// (e.g. the built-in "studio-default" set). A nil OrganizationID marks a
// global set visible to every organization.
type QuestionnaireSet struct {
	ID             uuid.UUID  `json:"id"`
	OrganizationID *uuid.UUID `json:"organization_id,omitempty"`
	Key            string     `json:"key"`
	Title          string     `json:"title"`
	Description    string     `json:"description"`
	IsDefault      bool       `json:"is_default"`
	Active         bool       `json:"active"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// VisibleTo reports whether the set may be read by the given organization.
// Global sets (nil OrganizationID) are visible to every organization;
// organization-scoped sets are visible only to their owning organization.
func (s *QuestionnaireSet) VisibleTo(orgID uuid.UUID) bool {
	if s == nil {
		return false
	}
	if s.OrganizationID == nil {
		return true
	}
	return *s.OrganizationID == orgID
}
