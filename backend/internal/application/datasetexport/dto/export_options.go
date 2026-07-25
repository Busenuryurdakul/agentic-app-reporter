package dto

import (
	"time"

	"github.com/google/uuid"
)

const ExportVersion = "1"

// DedupeMode controls duplicate input handling before JSONL write.
type DedupeMode string

const (
	DedupeNone            DedupeMode = "none"
	DedupeFingerprint     DedupeMode = "fingerprint"
	DedupeWorkspaceLatest DedupeMode = "workspace-latest"
)

// ExportOptions configures ExportPEFTDatasetUseCase (CLI flags map here).
type ExportOptions struct {
	OrganizationID              uuid.UUID
	WorkspaceID                 *uuid.UUID
	Since                       *time.Time
	OutDir                      string
	SplitRatio                  float64
	SplitSalt                   string
	Dedupe                      DedupeMode
	MinQualityScore             int
	RequireSectionCoverage      bool
	AllowLowQuality             bool
	IncludeLegacyNoFingerprint  bool
	DryRun                      bool
	WriteSkipped                bool
	ScanAssistantSecrets        bool
}
