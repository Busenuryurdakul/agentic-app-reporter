package dto

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// UpsertProfileRequest is the input for creating or updating a project profile.
// All fields are optional; omitted/empty fields leave existing stored values
// unchanged (partial update semantics), matching the workspace update pattern.
type UpsertProfileRequest struct {
	ProjectName               string          `json:"project_name,omitempty"`
	ProjectDescription        string          `json:"project_description,omitempty"`
	ProductType               string          `json:"product_type,omitempty"`
	TargetUsers               string          `json:"target_users,omitempty"`
	MainProblem               string          `json:"main_problem,omitempty"`
	MainUseCases              string          `json:"main_use_cases,omitempty"`
	ProjectStatus             string          `json:"project_status,omitempty"`
	PreferredDocumentLanguage string          `json:"preferred_document_language,omitempty" validate:"omitempty,oneof=tr en"`
	Frontend                  json.RawMessage `json:"frontend,omitempty"`
	Backend                   json.RawMessage `json:"backend,omitempty"`
	Data                      json.RawMessage `json:"data,omitempty"`
	Infrastructure            json.RawMessage `json:"infrastructure,omitempty"`
	AI                        json.RawMessage `json:"ai,omitempty"`
	DevelopmentStandards      json.RawMessage `json:"development_standards,omitempty"`
}

// ProfileInfo is the public representation of a project profile.
type ProfileInfo struct {
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

// CompletenessResult is the deterministic, weighted completeness report for a profile.
type CompletenessResult struct {
	// Overall is a 0-100 weighted completeness percentage.
	Overall int `json:"overall"`
	// Sections maps each general/section identifier to its own 0-100 fill percentage.
	Sections map[string]int `json:"sections"`
	// Missing lists field/section identifiers that are still empty.
	Missing []string `json:"missing_fields"`
}
