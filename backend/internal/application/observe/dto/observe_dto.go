package dto

import (
	"time"

	"github.com/google/uuid"
)

// MissingRequiredQuestion describes a required, visible questionnaire gap.
type MissingRequiredQuestion struct {
	QuestionID uuid.UUID `json:"question_id"`
	Category   string    `json:"category"`
	Title      string    `json:"title"`
}

// ReadinessComponents holds the weighted readiness inputs (each 0–100).
type ReadinessComponents struct {
	Profile       int `json:"profile"`
	Questionnaire int `json:"questionnaire"`
	Documents     int `json:"documents"`
}

// ReadinessResult is the deterministic workspace readiness score.
type ReadinessResult struct {
	Overall                  int                      `json:"overall"`
	Components               ReadinessComponents      `json:"components"`
	MissingRequiredQuestions []MissingRequiredQuestion `json:"missing_required_questions"`
	SucceededDocumentCount   int                      `json:"succeeded_document_count"`
	FailedDocumentCount      int                      `json:"failed_document_count"`
	ComputedAt               time.Time                `json:"computed_at"`
}

// GenerationTotals counts documents by status.
type GenerationTotals struct {
	Succeeded int `json:"succeeded"`
	Failed    int `json:"failed"`
	Pending   int `json:"pending"`
}

// ProviderSummary counts runs per provider_name.
type ProviderSummary struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

// DocumentQuality mirrors generation quality heuristics for observe recent rows.
type DocumentQuality struct {
	HasHeading       bool `json:"has_heading"`
	MinLengthOK      bool `json:"min_length_ok"`
	LanguageDeclared bool `json:"language_declared"`
	QualityScore     int  `json:"quality_score"`
}

// RecentDocumentSummary is a body-less document row for observe recent lists.
type RecentDocumentSummary struct {
	ID             uuid.UUID       `json:"id"`
	WorkspaceID    uuid.UUID       `json:"workspace_id"`
	Title          string          `json:"title"`
	DocumentType   string          `json:"document_type"`
	Language       string          `json:"language"`
	Status         string          `json:"status"`
	ApprovalStatus string          `json:"approval_status"`
	ProviderName   string          `json:"provider_name"`
	ModelName      string          `json:"model_name"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
	Quality        DocumentQuality `json:"quality"`
}

// ObserveSummaryResult aggregates generation monitoring for a workspace.
type ObserveSummaryResult struct {
	Totals        GenerationTotals        `json:"totals"`
	LastSuccessAt *time.Time              `json:"last_success_at,omitempty"`
	LastFailureAt *time.Time              `json:"last_failure_at,omitempty"`
	Providers     []ProviderSummary       `json:"providers"`
	Recent        []RecentDocumentSummary `json:"recent"`
}
