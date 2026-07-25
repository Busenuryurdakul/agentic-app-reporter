package dto

import (
	"time"

	"github.com/google/uuid"
)

// SkipReason counts why a candidate document was not exported.
type SkipReason string

const (
	SkipFingerprintMismatch SkipReason = "fingerprint_mismatch"
	SkipEmptyFingerprint    SkipReason = "empty_source_fingerprint"
	SkipLowQuality          SkipReason = "low_quality"
	SkipSectionCoverage     SkipReason = "section_coverage"
	SkipEmptyAssistant      SkipReason = "empty_assistant_body"
	SkipDuplicateFingerprint SkipReason = "duplicate_fingerprint"
	SkipWorkspaceNotFound   SkipReason = "workspace_not_found"
	SkipInvalidRow          SkipReason = "invalid_row"
	SkipAssistantSecret     SkipReason = "assistant_secret_pattern"
)

// ExportManifest summarizes an export run (written alongside JSONL files).
type ExportManifest struct {
	ExportVersion  string            `json:"export_version"`
	ExportedAt     time.Time         `json:"exported_at"`
	OrganizationID uuid.UUID         `json:"organization_id"`
	Filters        ManifestFilters   `json:"filters"`
	Counts         ManifestCounts    `json:"counts"`
	SkipReasons    map[string]int    `json:"skip_reasons"`
	Split          ManifestSplit     `json:"split"`
	Files          map[string]string `json:"files"`
}

// ManifestFilters documents the hard filter applied at query time.
type ManifestFilters struct {
	DocumentType   string `json:"document_type"`
	Status         string `json:"status"`
	ApprovalStatus string `json:"approval_status"`
}

// ManifestCounts aggregates candidate vs exported rows.
type ManifestCounts struct {
	Candidates int `json:"candidates"`
	Exported   int `json:"exported"`
	Skipped    int `json:"skipped"`
	Train      int `json:"train"`
	Val        int `json:"val"`
}

// ManifestSplit records reproducible train/val partitioning.
type ManifestSplit struct {
	Ratio float64 `json:"ratio"`
	Salt  string  `json:"salt"`
}

// ExportResult is returned by ExportPEFTDatasetUseCase.Execute.
type ExportResult struct {
	Manifest ExportManifest
	Train    []DatasetRow
	Val      []DatasetRow
	Skipped  []SkippedRow
}

// SkippedRow records a non-exported candidate for optional skipped.jsonl output.
type SkippedRow struct {
	DocumentID uuid.UUID  `json:"document_id"`
	Reason     SkipReason `json:"reason"`
	Detail     string     `json:"detail,omitempty"`
}
