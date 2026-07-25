package dto

import "github.com/google/uuid"

// ChatRole is a fine-tuning message role.
type ChatRole string

const (
	RoleSystem    ChatRole = "system"
	RoleUser      ChatRole = "user"
	RoleAssistant ChatRole = "assistant"
)

// ChatMessage is one entry in the messages array.
type ChatMessage struct {
	Role    ChatRole `json:"role"`
	Content string   `json:"content"`
}

// RowMetadata is optional audit fields; training scripts may strip this block.
type RowMetadata struct {
	DocumentID         uuid.UUID `json:"document_id"`
	WorkspaceID        uuid.UUID `json:"workspace_id"`
	OrganizationID     uuid.UUID `json:"organization_id"`
	DocumentType       string    `json:"document_type"`
	Language           string    `json:"language"`
	SourceFingerprint  string    `json:"source_fingerprint"`
	RebuiltFingerprint string    `json:"rebuilt_fingerprint"`
	ApprovedAt         string    `json:"approved_at,omitempty"`
	ProviderName       string    `json:"provider_name,omitempty"`
	ModelName          string    `json:"model_name,omitempty"`
	QualityScore       int       `json:"quality_score,omitempty"`
	SectionCoverageOK  bool      `json:"section_coverage_ok,omitempty"`
	ExportVersion      string    `json:"export_version"`
}

// DatasetRow is one JSONL line for PEFT / TRL chat fine-tuning.
type DatasetRow struct {
	Messages []ChatMessage `json:"messages"`
	Metadata RowMetadata   `json:"metadata"`
}
