package usecase

import (
	"errors"

	exportdto "github.com/masterfabric-go/masterfabric/internal/application/datasetexport/dto"
	"github.com/google/uuid"
)

const defaultSplitRatio = 0.9
const defaultSplitSalt = "peft-export-v1"
const defaultMinQualityScore = 80

// NormalizeExportOptions applies defaults and validates export options.
func NormalizeExportOptions(opts exportdto.ExportOptions) (exportdto.ExportOptions, error) {
	if opts.OrganizationID == uuid.Nil {
		return opts, errors.New("organization_id is required")
	}
	if opts.SplitRatio <= 0 || opts.SplitRatio > 1 {
		opts.SplitRatio = defaultSplitRatio
	}
	if opts.SplitSalt == "" {
		opts.SplitSalt = defaultSplitSalt
	}
	if opts.Dedupe == "" {
		opts.Dedupe = exportdto.DedupeFingerprint
	}
	if opts.MinQualityScore <= 0 {
		opts.MinQualityScore = defaultMinQualityScore
	}
	if !opts.AllowLowQuality {
		opts.RequireSectionCoverage = true
	}
	return opts, nil
}
