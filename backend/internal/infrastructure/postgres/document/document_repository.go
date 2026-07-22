package document

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

var _ repository.DocumentRepository = (*DocumentRepository)(nil)

// DocumentRepository implements repository.DocumentRepository with PostgreSQL.
type DocumentRepository struct {
	db *pgxpool.Pool
}

// NewDocumentRepository creates a DocumentRepository.
func NewDocumentRepository(db *pgxpool.Pool) *DocumentRepository {
	return &DocumentRepository{db: db}
}

const documentColumns = `
	id, organization_id, workspace_id, title, document_type, language, status,
	markdown_body, provider_name, model_name, error_message, source_fingerprint,
	created_by, created_at, updated_at`

func scanDocument(row pgx.Row) (*model.GeneratedDocument, error) {
	var d model.GeneratedDocument
	err := row.Scan(
		&d.ID,
		&d.OrganizationID,
		&d.WorkspaceID,
		&d.Title,
		&d.DocumentType,
		&d.Language,
		&d.Status,
		&d.MarkdownBody,
		&d.ProviderName,
		&d.ModelName,
		&d.ErrorMessage,
		&d.SourceFingerprint,
		&d.CreatedBy,
		&d.CreatedAt,
		&d.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

// Create inserts a generated document.
func (r *DocumentRepository) Create(ctx context.Context, doc *model.GeneratedDocument) error {
	if doc.ID == uuid.Nil {
		doc.ID = uuid.New()
	}
	now := time.Now().UTC()
	if doc.CreatedAt.IsZero() {
		doc.CreatedAt = now
	}
	doc.UpdatedAt = now

	const q = `
		INSERT INTO generated_documents (
			id, organization_id, workspace_id, title, document_type, language, status,
			markdown_body, provider_name, model_name, error_message, source_fingerprint,
			created_by, created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
		)`
	_, err := r.db.Exec(ctx, q,
		doc.ID,
		doc.OrganizationID,
		doc.WorkspaceID,
		doc.Title,
		doc.DocumentType,
		doc.Language,
		doc.Status,
		doc.MarkdownBody,
		doc.ProviderName,
		doc.ModelName,
		doc.ErrorMessage,
		doc.SourceFingerprint,
		doc.CreatedBy,
		doc.CreatedAt,
		doc.UpdatedAt,
	)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to create generated document", err)
	}
	return nil
}

// GetByID returns a document by id.
func (r *DocumentRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.GeneratedDocument, error) {
	q := `SELECT ` + documentColumns + ` FROM generated_documents WHERE id = $1`
	doc, err := scanDocument(r.db.QueryRow(ctx, q, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "generated document not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to get generated document", err)
	}
	return doc, nil
}

// ListByWorkspace returns newest documents first (summary fields still full row).
func (r *DocumentRepository) ListByWorkspace(ctx context.Context, workspaceID uuid.UUID, limit int) ([]*model.GeneratedDocument, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	q := `SELECT ` + documentColumns + `
		FROM generated_documents
		WHERE workspace_id = $1
		ORDER BY created_at DESC
		LIMIT $2`
	rows, err := r.db.Query(ctx, q, workspaceID, limit)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list generated documents", err)
	}
	defer rows.Close()

	out := make([]*model.GeneratedDocument, 0)
	for rows.Next() {
		doc, err := scanDocument(rows)
		if err != nil {
			return nil, domainErr.New(domainErr.ErrInternal, "failed to scan generated document", err)
		}
		out = append(out, doc)
	}
	return out, rows.Err()
}
