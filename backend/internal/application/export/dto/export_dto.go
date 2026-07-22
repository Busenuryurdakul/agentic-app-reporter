package dto

import "github.com/google/uuid"

const (
	FormatMarkdownZip = "markdown_zip"
	MaxDocuments      = 20
)

// ExportPackageRequest selects documents to package for download.
type ExportPackageRequest struct {
	DocumentIDs []uuid.UUID `json:"document_ids"`
	Format      string      `json:"format"`
}

// ExportPackageResult is a sync download payload (no async job).
type ExportPackageResult struct {
	Filename      string
	ContentType   string
	Body          []byte
	DocumentCount int
}
