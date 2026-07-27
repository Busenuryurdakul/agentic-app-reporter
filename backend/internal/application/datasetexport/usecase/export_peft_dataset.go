package usecase

import (
	"context"
	"crypto/sha256"
	"encoding/binary"
	"errors"
	"sort"
	"strings"
	"time"

	exportdto "github.com/masterfabric-go/masterfabric/internal/application/datasetexport/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/datasetexport/serializer"
	docModel "github.com/masterfabric-go/masterfabric/internal/domain/document/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/quality"
	docRepo "github.com/masterfabric-go/masterfabric/internal/domain/document/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/google/uuid"
)

// ErrNoExportRows indicates every candidate was filtered or skipped.
var ErrNoExportRows = errors.New("export PEFT dataset: no rows exported")

// ExportPEFTDatasetUseCase builds PEFT JSONL rows from approved product_spec documents.
type ExportPEFTDatasetUseCase struct {
	docRepo          docRepo.DocumentRepository
	contextRebuilder ContextRebuilder
	promptAssembler  PromptAssembler
}

// NewExportPEFTDatasetUseCase creates an ExportPEFTDatasetUseCase.
func NewExportPEFTDatasetUseCase(
	docRepo docRepo.DocumentRepository,
	contextRebuilder ContextRebuilder,
	promptAssembler PromptAssembler,
) *ExportPEFTDatasetUseCase {
	return &ExportPEFTDatasetUseCase{
		docRepo:          docRepo,
		contextRebuilder: contextRebuilder,
		promptAssembler:  promptAssembler,
	}
}

type builtRow struct {
	doc *docModel.GeneratedDocument
	row exportdto.DatasetRow
}

// Execute runs the export pipeline and returns train/val rows plus manifest.
func (uc *ExportPEFTDatasetUseCase) Execute(
	ctx context.Context,
	opts exportdto.ExportOptions,
) (*exportdto.ExportResult, error) {
	normalized, err := NormalizeExportOptions(opts)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrValidation, err.Error(), err)
	}
	if uc.docRepo == nil {
		return nil, domainErr.New(domainErr.ErrInternal, "document repository is not configured", nil)
	}

	candidates, err := uc.docRepo.ListForPEFTExport(ctx, docRepo.PEFTExportFilter{
		OrganizationID: normalized.OrganizationID,
		WorkspaceID:    normalized.WorkspaceID,
		Since:          normalized.Since,
	})
	if err != nil {
		return nil, err
	}

	skipReasons := make(map[string]int)
	skipped := make([]exportdto.SkippedRow, 0)
	built := make([]builtRow, 0, len(candidates))

	for _, doc := range candidates {
		if doc == nil {
			continue
		}
		row, skip, reason, detail := uc.processCandidate(ctx, doc, normalized)
		if skip {
			skipped = append(skipped, exportdto.SkippedRow{
				DocumentID: doc.ID,
				Reason:     reason,
				Detail:     detail,
			})
			skipReasons[string(reason)]++
			continue
		}
		built = append(built, builtRow{doc: doc, row: row})
	}

	built, dedupeSkipped := dedupeRows(built, normalized.Dedupe)
	skipped = append(skipped, dedupeSkipped...)
	for _, s := range dedupeSkipped {
		skipReasons[string(s.Reason)]++
	}

	train, val := splitRows(built, normalized.SplitSalt, normalized.SplitRatio)

	exported := len(built)
	result := &exportdto.ExportResult{
		Manifest: exportdto.ExportManifest{
			ExportVersion:  exportdto.ExportVersion,
			ExportedAt:     time.Now().UTC(),
			OrganizationID: normalized.OrganizationID,
			Filters: exportdto.ManifestFilters{
				DocumentType:   docModel.DocumentTypeProductSpec,
				Status:         docModel.StatusSucceeded,
				ApprovalStatus: docModel.ApprovalApproved,
			},
			Counts: exportdto.ManifestCounts{
				Candidates: len(candidates),
				Exported:   exported,
				Skipped:    len(skipped),
				Train:      len(train),
				Val:        len(val),
			},
			SkipReasons: skipReasons,
			Split: exportdto.ManifestSplit{
				Ratio: normalized.SplitRatio,
				Salt:  normalized.SplitSalt,
			},
			Files: map[string]string{
				"train": "train.jsonl",
				"val":   "val.jsonl",
			},
		},
		Skipped: skipped,
	}

	if normalized.DryRun {
		result.Train = nil
		result.Val = nil
	} else {
		result.Train = train
		result.Val = val
	}

	if len(candidates) == 0 || exported == 0 {
		return result, ErrNoExportRows
	}
	return result, nil
}

func (uc *ExportPEFTDatasetUseCase) processCandidate(
	ctx context.Context,
	doc *docModel.GeneratedDocument,
	opts exportdto.ExportOptions,
) (exportdto.DatasetRow, bool, exportdto.SkipReason, string) {
	if strings.TrimSpace(doc.MarkdownBody) == "" {
		return exportdto.DatasetRow{}, true, exportdto.SkipEmptyAssistant, "markdown body is empty"
	}

	if uc.contextRebuilder == nil {
		return exportdto.DatasetRow{}, true, exportdto.SkipInvalidRow, "context rebuilder not configured"
	}
	wsCtx, err := uc.contextRebuilder.Rebuild(ctx, doc.WorkspaceID, doc.Language)
	if err != nil {
		if errors.Is(err, domainErr.ErrNotFound) {
			return exportdto.DatasetRow{}, true, exportdto.SkipWorkspaceNotFound, err.Error()
		}
		return exportdto.DatasetRow{}, true, exportdto.SkipInvalidRow, err.Error()
	}

	rebuiltFP := wsCtx.Fingerprint()
	storedFP := strings.TrimSpace(doc.SourceFingerprint)
	if storedFP == "" {
		if !opts.IncludeLegacyNoFingerprint {
			return exportdto.DatasetRow{}, true, exportdto.SkipEmptyFingerprint, "source_fingerprint is empty"
		}
	} else if rebuiltFP != storedFP {
		return exportdto.DatasetRow{}, true, exportdto.SkipFingerprintMismatch, "rebuilt fingerprint differs from stored"
	}

	q := quality.EvaluateForType(doc.MarkdownBody, doc.Language, docModel.DocumentTypeProductSpec)
	if q.QualityScore < opts.MinQualityScore {
		return exportdto.DatasetRow{}, true, exportdto.SkipLowQuality, "quality score below minimum"
	}
	if opts.RequireSectionCoverage && !opts.AllowLowQuality && !q.SectionCoverageOK {
		return exportdto.DatasetRow{}, true, exportdto.SkipSectionCoverage, "section coverage below threshold"
	}

	if opts.ScanAssistantSecrets && containsAssistantSecretPattern(doc.MarkdownBody) {
		return exportdto.DatasetRow{}, true, exportdto.SkipAssistantSecret, "assistant body matched secret pattern"
	}

	if uc.promptAssembler == nil {
		return exportdto.DatasetRow{}, true, exportdto.SkipInvalidRow, "prompt assembler not configured"
	}
	prompt, err := uc.promptAssembler.Build(wsCtx, docModel.DocumentTypeProductSpec)
	if err != nil {
		return exportdto.DatasetRow{}, true, exportdto.SkipInvalidRow, err.Error()
	}

	row := exportdto.DatasetRow{
		Messages: []exportdto.ChatMessage{
			{Role: exportdto.RoleSystem, Content: prompt.SystemPrompt},
			{Role: exportdto.RoleUser, Content: prompt.UserPrompt},
			{Role: exportdto.RoleAssistant, Content: strings.TrimSpace(doc.MarkdownBody)},
		},
		Metadata: exportdto.RowMetadata{
			DocumentID:         doc.ID,
			WorkspaceID:        doc.WorkspaceID,
			OrganizationID:     doc.OrganizationID,
			DocumentType:       docModel.DocumentTypeProductSpec,
			Language:           doc.Language,
			SourceFingerprint:  storedFP,
			RebuiltFingerprint: rebuiltFP,
			ProviderName:       doc.ProviderName,
			ModelName:          doc.ModelName,
			QualityScore:       q.QualityScore,
			SectionCoverageOK:  q.SectionCoverageOK,
			ExportVersion:      exportdto.ExportVersion,
		},
	}
	if doc.ApprovedAt != nil {
		row.Metadata.ApprovedAt = doc.ApprovedAt.UTC().Format(time.RFC3339)
	}
	if err := serializer.ValidateRow(row); err != nil {
		return exportdto.DatasetRow{}, true, exportdto.SkipInvalidRow, err.Error()
	}
	return row, false, "", ""
}

func dedupeRows(rows []builtRow, mode exportdto.DedupeMode) ([]builtRow, []exportdto.SkippedRow) {
	if len(rows) <= 1 || mode == exportdto.DedupeNone {
		return rows, nil
	}

	sorted := append([]builtRow(nil), rows...)
	sort.Slice(sorted, func(i, j int) bool {
		return compareBuiltRowsForDedupe(sorted[i], sorted[j])
	})

	skipped := make([]exportdto.SkippedRow, 0)
	out := make([]builtRow, 0, len(sorted))

	switch mode {
	case exportdto.DedupeWorkspaceLatest:
		seen := make(map[string]struct{})
		for _, item := range sorted {
			key := workspaceDedupeKey(item.doc)
			if _, ok := seen[key]; ok {
				skipped = append(skipped, exportdto.SkippedRow{
					DocumentID: item.doc.ID,
					Reason:     exportdto.SkipDuplicateFingerprint,
					Detail:     "duplicate workspace (keeping latest approved)",
				})
				continue
			}
			seen[key] = struct{}{}
			out = append(out, item)
		}
	default: // DedupeFingerprint
		seen := make(map[string]struct{})
		for _, item := range sorted {
			fp := item.row.Metadata.SourceFingerprint
			if fp == "" {
				fp = item.row.Metadata.RebuiltFingerprint
			}
			if _, ok := seen[fp]; ok {
				skipped = append(skipped, exportdto.SkippedRow{
					DocumentID: item.doc.ID,
					Reason:     exportdto.SkipDuplicateFingerprint,
					Detail:     "duplicate fingerprint (keeping latest approved)",
				})
				continue
			}
			seen[fp] = struct{}{}
			out = append(out, item)
		}
	}
	return out, skipped
}

func splitRows(rows []builtRow, salt string, ratio float64) ([]exportdto.DatasetRow, []exportdto.DatasetRow) {
	train := make([]exportdto.DatasetRow, 0, len(rows))
	val := make([]exportdto.DatasetRow, 0)
	for _, item := range rows {
		if isTrainSplit(item.doc.WorkspaceID, salt, ratio) {
			train = append(train, item.row)
		} else {
			val = append(val, item.row)
		}
	}
	return train, val
}

func isTrainSplit(workspaceID uuid.UUID, salt string, ratio float64) bool {
	sum := sha256.Sum256([]byte(workspaceID.String() + salt))
	bucket := binary.BigEndian.Uint64(sum[:8]) % 100
	return float64(bucket) < ratio*100
}

func approvedTime(doc *docModel.GeneratedDocument) time.Time {
	if doc.ApprovedAt != nil {
		return doc.ApprovedAt.UTC()
	}
	return doc.CreatedAt.UTC()
}

// compareBuiltRowsForDedupe orders candidates for dedupe: latest approved first, then
// created_at, then document ID (stable tie-break — never rely on repository or map order).
func compareBuiltRowsForDedupe(a, b builtRow) bool {
	ta := approvedTime(a.doc)
	tb := approvedTime(b.doc)
	if !ta.Equal(tb) {
		return ta.After(tb)
	}
	ca := a.doc.CreatedAt.UTC()
	cb := b.doc.CreatedAt.UTC()
	if !ca.Equal(cb) {
		return ca.After(cb)
	}
	return a.doc.ID.String() > b.doc.ID.String()
}

func workspaceDedupeKey(doc *docModel.GeneratedDocument) string {
	docType := strings.TrimSpace(doc.DocumentType)
	if docType == "" {
		docType = docModel.DocumentTypeProductSpec
	}
	return doc.WorkspaceID.String() + "\x00" + docType
}
