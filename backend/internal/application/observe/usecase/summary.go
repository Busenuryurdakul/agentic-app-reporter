package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/observe/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/quality"
	docRepo "github.com/masterfabric-go/masterfabric/internal/domain/document/repository"
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
)

const defaultRecentLimit = 10

// ObserveSummaryUseCase aggregates generation-run monitoring for a workspace.
type ObserveSummaryUseCase struct {
	docRepo       docRepo.DocumentRepository
	workspaceRepo tenantRepo.WorkspaceRepository
}

// NewObserveSummaryUseCase creates an ObserveSummaryUseCase.
func NewObserveSummaryUseCase(docRepo docRepo.DocumentRepository, workspaceRepo tenantRepo.WorkspaceRepository) *ObserveSummaryUseCase {
	return &ObserveSummaryUseCase{docRepo: docRepo, workspaceRepo: workspaceRepo}
}

// Execute returns totals, provider breakdown, and recent document summaries (no bodies).
func (uc *ObserveSummaryUseCase) Execute(ctx context.Context, workspaceID uuid.UUID, recentLimit int) (*dto.ObserveSummaryResult, error) {
	if _, _, err := resolveWorkspace(ctx, uc.workspaceRepo, workspaceID); err != nil {
		return nil, err
	}

	if recentLimit <= 0 {
		recentLimit = defaultRecentLimit
	}
	if recentLimit > 100 {
		recentLimit = 100
	}

	stats, err := uc.docRepo.CountByWorkspace(ctx, workspaceID)
	if err != nil {
		return nil, err
	}

	providers, err := uc.docRepo.CountProvidersByWorkspace(ctx, workspaceID)
	if err != nil {
		return nil, err
	}

	docs, err := uc.docRepo.ListByWorkspace(ctx, workspaceID, recentLimit)
	if err != nil {
		return nil, err
	}

	out := &dto.ObserveSummaryResult{
		Totals: dto.GenerationTotals{
			Succeeded: stats.Succeeded,
			Failed:    stats.Failed,
			Pending:   stats.Pending,
		},
		LastSuccessAt: stats.LastSuccessAt,
		LastFailureAt: stats.LastFailureAt,
		Providers:     make([]dto.ProviderSummary, 0, len(providers)),
		Recent:        make([]dto.RecentDocumentSummary, 0, len(docs)),
	}

	for _, p := range providers {
		out.Providers = append(out.Providers, dto.ProviderSummary{Name: p.Name, Count: p.Count})
	}
	for _, d := range docs {
		out.Recent = append(out.Recent, toRecentSummary(d))
	}
	return out, nil
}

func toRecentSummary(doc *model.GeneratedDocument) dto.RecentDocumentSummary {
	q := quality.Evaluate(doc.MarkdownBody, doc.Language)
	approval := doc.ApprovalStatus
	if approval == "" {
		approval = model.ApprovalDraft
	}
	return dto.RecentDocumentSummary{
		ID:             doc.ID,
		WorkspaceID:    doc.WorkspaceID,
		Title:          doc.Title,
		DocumentType:   doc.DocumentType,
		Language:       doc.Language,
		Status:         doc.Status,
		ApprovalStatus: approval,
		ProviderName:   doc.ProviderName,
		ModelName:      doc.ModelName,
		CreatedAt:      doc.CreatedAt,
		UpdatedAt:      doc.UpdatedAt,
		Quality: dto.DocumentQuality{
			HasHeading:       q.HasHeading,
			MinLengthOK:      q.MinLengthOK,
			LanguageDeclared: q.LanguageDeclared,
			QualityScore:     q.QualityScore,
		},
	}
}
