package dto

import (
	"time"

	"github.com/google/uuid"
)

// GenerateDocumentRequest is the optional body for document generation.
// Profile/answers must never be accepted here — context is built server-side.
type GenerateDocumentRequest struct {
	Title    string `json:"title"`
	Language string `json:"language"`
}

// DocumentQuality is the deterministic heuristic quality payload (Phase 4 S2).
type DocumentQuality struct {
	HasHeading       bool `json:"has_heading"`
	MinLengthOK      bool `json:"min_length_ok"`
	LanguageDeclared bool `json:"language_declared"`
	QualityScore     int  `json:"quality_score"`
}

// DocumentInfo is the full document payload (get/generate responses).
type DocumentInfo struct {
	ID                uuid.UUID       `json:"id"`
	OrganizationID    uuid.UUID       `json:"organization_id"`
	WorkspaceID       uuid.UUID       `json:"workspace_id"`
	Title             string          `json:"title"`
	DocumentType      string          `json:"document_type"`
	Language          string          `json:"language"`
	Status            string          `json:"status"`
	MarkdownBody      string          `json:"markdown_body"`
	ProviderName      string          `json:"provider_name"`
	ModelName         string          `json:"model_name"`
	ErrorMessage      string          `json:"error_message,omitempty"`
	SourceFingerprint string          `json:"source_fingerprint,omitempty"`
	ApprovalStatus    string          `json:"approval_status"`
	ApprovedAt        *time.Time      `json:"approved_at,omitempty"`
	ApprovedBy        *uuid.UUID      `json:"approved_by,omitempty"`
	CreatedBy         *uuid.UUID      `json:"created_by,omitempty"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
	Quality           DocumentQuality `json:"quality"`
}

// DocumentSummary omits markdown_body for list responses.
type DocumentSummary struct {
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

// DocumentListResult wraps document summaries.
type DocumentListResult struct {
	Documents []DocumentSummary `json:"documents"`
}
