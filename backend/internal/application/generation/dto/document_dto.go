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

// DocumentInfo is the full document payload (get/generate responses).
type DocumentInfo struct {
	ID                uuid.UUID  `json:"id"`
	OrganizationID    uuid.UUID  `json:"organization_id"`
	WorkspaceID       uuid.UUID  `json:"workspace_id"`
	Title             string     `json:"title"`
	DocumentType      string     `json:"document_type"`
	Language          string     `json:"language"`
	Status            string     `json:"status"`
	MarkdownBody      string     `json:"markdown_body"`
	ProviderName      string     `json:"provider_name"`
	ModelName         string     `json:"model_name"`
	ErrorMessage      string     `json:"error_message,omitempty"`
	SourceFingerprint string     `json:"source_fingerprint,omitempty"`
	CreatedBy         *uuid.UUID `json:"created_by,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

// DocumentSummary omits markdown_body for list responses.
type DocumentSummary struct {
	ID           uuid.UUID `json:"id"`
	WorkspaceID  uuid.UUID `json:"workspace_id"`
	Title        string    `json:"title"`
	DocumentType string    `json:"document_type"`
	Language     string    `json:"language"`
	Status       string    `json:"status"`
	ProviderName string    `json:"provider_name"`
	ModelName    string    `json:"model_name"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// DocumentListResult wraps document summaries.
type DocumentListResult struct {
	Documents []DocumentSummary `json:"documents"`
}
