package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// DocumentLanguage represents the preferred language for generated documents.
type DocumentLanguage string

const (
	DocumentLanguageTR DocumentLanguage = "tr"
	DocumentLanguageEN DocumentLanguage = "en"
)

// IsValidDocumentLanguage reports whether lang is a supported document language.
func IsValidDocumentLanguage(lang string) bool {
	switch DocumentLanguage(lang) {
	case DocumentLanguageTR, DocumentLanguageEN:
		return true
	default:
		return false
	}
}

// ProjectStatus represents the lifecycle status of a project.
type ProjectStatus string

const (
	ProjectStatusPlanned     ProjectStatus = "planned"
	ProjectStatusInProgress  ProjectStatus = "in_progress"
	ProjectStatusActive      ProjectStatus = "active"
	ProjectStatusMaintenance ProjectStatus = "maintenance"
	ProjectStatusArchived    ProjectStatus = "archived"
)

// EmptyJSONObject is the canonical empty JSON object used to seed section columns.
var EmptyJSONObject = json.RawMessage(`{}`)

// Profile represents the AI Development Configuration Studio project profile
// for a single workspace. Exactly one profile exists per workspace.
type Profile struct {
	ID                        uuid.UUID       `json:"id"`
	OrganizationID            uuid.UUID       `json:"organization_id"`
	WorkspaceID               uuid.UUID       `json:"workspace_id"`
	ProjectName               string          `json:"project_name"`
	ProjectDescription        string          `json:"project_description"`
	ProductType               string          `json:"product_type"`
	TargetUsers               string          `json:"target_users"`
	MainProblem               string          `json:"main_problem"`
	MainUseCases              string          `json:"main_use_cases"`
	ProjectStatus             string          `json:"project_status"`
	PreferredDocumentLanguage string          `json:"preferred_document_language"`
	Frontend                  json.RawMessage `json:"frontend"`
	Backend                   json.RawMessage `json:"backend"`
	Data                      json.RawMessage `json:"data"`
	Infrastructure            json.RawMessage `json:"infrastructure"`
	AI                        json.RawMessage `json:"ai"`
	DevelopmentStandards      json.RawMessage `json:"development_standards"`
	CreatedAt                 time.Time       `json:"created_at"`
	UpdatedAt                 time.Time       `json:"updated_at"`
}

// NewEmpty builds a zero-value profile for a workspace that has not yet
// persisted any profile data. It is never written to the database as-is;
// it is only used as a default value returned to clients.
func NewEmpty(organizationID, workspaceID uuid.UUID) *Profile {
	return &Profile{
		OrganizationID:            organizationID,
		WorkspaceID:               workspaceID,
		ProjectStatus:             string(ProjectStatusPlanned),
		PreferredDocumentLanguage: string(DocumentLanguageTR),
		Frontend:                  EmptyJSONObject,
		Backend:                   EmptyJSONObject,
		Data:                      EmptyJSONObject,
		Infrastructure:            EmptyJSONObject,
		AI:                        EmptyJSONObject,
		DevelopmentStandards:      EmptyJSONObject,
	}
}

// SectionMap decodes a JSON section column into a generic map. A nil, empty,
// or malformed section decodes to an empty (non-nil) map so callers can
// iterate safely.
func SectionMap(raw json.RawMessage) map[string]any {
	if len(raw) == 0 {
		return map[string]any{}
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil || m == nil {
		return map[string]any{}
	}
	return m
}

// Sections returns the six JSONB configuration sections in a fixed, stable order.
func (p *Profile) Sections() map[string]json.RawMessage {
	return map[string]json.RawMessage{
		"frontend":              p.Frontend,
		"backend":               p.Backend,
		"data":                  p.Data,
		"infrastructure":        p.Infrastructure,
		"ai":                    p.AI,
		"development_standards": p.DevelopmentStandards,
	}
}
