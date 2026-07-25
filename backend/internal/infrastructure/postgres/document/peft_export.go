package document

import (
	"context"

	"github.com/masterfabric-go/masterfabric/internal/domain/document/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// ListForPEFTExport returns approved succeeded product_spec documents for PEFT JSONL export.
func (r *DocumentRepository) ListForPEFTExport(
	ctx context.Context,
	filter repository.PEFTExportFilter,
) ([]*model.GeneratedDocument, error) {
	if err := filter.Validate(); err != nil {
		return nil, domainErr.New(domainErr.ErrValidation, err.Error(), err)
	}

	args := []any{
		filter.OrganizationID,
		filter.WorkspaceID,
		filter.Since,
		model.StatusSucceeded,
		model.ApprovalApproved,
		model.DocumentTypeProductSpec,
	}

	limitClause := ""
	if filter.Limit > 0 {
		args = append(args, filter.Limit)
		limitClause = " LIMIT $7"
	}

	q := `SELECT ` + documentColumns + `
		FROM generated_documents
		WHERE status = $4
		  AND approval_status = $5
		  AND document_type = $6
		  AND markdown_body <> ''
		  AND organization_id = $1
		  AND ($2::uuid IS NULL OR workspace_id = $2)
		  AND ($3::timestamptz IS NULL OR approved_at >= $3)
		ORDER BY approved_at ASC NULLS LAST, created_at ASC` + limitClause

	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list PEFT export documents", err)
	}
	defer rows.Close()

	out := make([]*model.GeneratedDocument, 0)
	for rows.Next() {
		doc, err := scanDocument(rows)
		if err != nil {
			return nil, domainErr.New(domainErr.ErrInternal, "failed to scan PEFT export document", err)
		}
		out = append(out, doc)
	}
	if err := rows.Err(); err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to iterate PEFT export documents", err)
	}
	return out, nil
}
