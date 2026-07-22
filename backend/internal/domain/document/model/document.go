package model

import (
	"time"

	"github.com/google/uuid"
)

const (
	DocumentTypeStudioMarkdown = "studio_markdown"

	StatusPending   = "pending"
	StatusSucceeded = "succeeded"
	StatusFailed    = "failed"

	ApprovalDraft    = "draft"
	ApprovalApproved = "approved"
	ApprovalRejected = "rejected"
)

// GeneratedDocument is a persisted Markdown artifact produced for a workspace.
type GeneratedDocument struct {
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
	ApprovalStatus    string     `json:"approval_status"`
	ApprovedAt        *time.Time `json:"approved_at,omitempty"`
	ApprovedBy        *uuid.UUID `json:"approved_by,omitempty"`
	CreatedBy         *uuid.UUID `json:"created_by,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}
