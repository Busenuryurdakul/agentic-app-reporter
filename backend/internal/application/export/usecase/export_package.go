package usecase

import (
	"archive/zip"
	"bytes"
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/export/dto"
	docModel "github.com/masterfabric-go/masterfabric/internal/domain/document/model"
	docRepo "github.com/masterfabric-go/masterfabric/internal/domain/document/repository"
	tenantModel "github.com/masterfabric-go/masterfabric/internal/domain/tenant/model"
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
)

// ExportPackageUseCase builds a sync Markdown / ZIP download for a workspace.
type ExportPackageUseCase struct {
	docRepo       docRepo.DocumentRepository
	workspaceRepo tenantRepo.WorkspaceRepository
}

// NewExportPackageUseCase creates an ExportPackageUseCase.
func NewExportPackageUseCase(docRepo docRepo.DocumentRepository, workspaceRepo tenantRepo.WorkspaceRepository) *ExportPackageUseCase {
	return &ExportPackageUseCase{docRepo: docRepo, workspaceRepo: workspaceRepo}
}

// Execute selects documents (explicit IDs, else approved→succeeded fallback) and packages them.
func (uc *ExportPackageUseCase) Execute(ctx context.Context, workspaceID uuid.UUID, req dto.ExportPackageRequest) (*dto.ExportPackageResult, error) {
	_, orgID, err := resolveWorkspace(ctx, uc.workspaceRepo, workspaceID)
	if err != nil {
		return nil, err
	}

	format := req.Format
	if format == "" {
		format = dto.FormatMarkdownZip
	}
	if format != dto.FormatMarkdownZip {
		return nil, domainErr.New(domainErr.ErrBadRequest, "unsupported export format", nil)
	}

	var docs []*docModel.GeneratedDocument
	if len(req.DocumentIDs) > 0 {
		docs, err = uc.loadByIDs(ctx, orgID, workspaceID, req.DocumentIDs)
	} else {
		docs, err = uc.loadDefault(ctx, workspaceID)
	}
	if err != nil {
		return nil, err
	}
	if len(docs) == 0 {
		return nil, domainErr.New(domainErr.ErrNotFound, "no exportable documents found", nil)
	}

	exportedAt := time.Now().UTC()
	if len(docs) == 1 {
		body := []byte(renderMarkdownExport(docs[0], exportedAt))
		return &dto.ExportPackageResult{
			Filename:      packageFilename(docs, "text/markdown"),
			ContentType:   "text/markdown; charset=utf-8",
			Body:          body,
			DocumentCount: 1,
		}, nil
	}

	zipBody, err := buildZip(docs, exportedAt)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to build export zip", err)
	}
	return &dto.ExportPackageResult{
		Filename:      packageFilename(docs, "application/zip"),
		ContentType:   "application/zip",
		Body:          zipBody,
		DocumentCount: len(docs),
	}, nil
}

func (uc *ExportPackageUseCase) loadByIDs(ctx context.Context, orgID, workspaceID uuid.UUID, ids []uuid.UUID) ([]*docModel.GeneratedDocument, error) {
	if len(ids) > dto.MaxDocuments {
		return nil, domainErr.New(domainErr.ErrBadRequest, "too many documents for export", nil)
	}
	seen := make(map[uuid.UUID]struct{}, len(ids))
	out := make([]*docModel.GeneratedDocument, 0, len(ids))
	for _, id := range ids {
		if id == uuid.Nil {
			return nil, domainErr.New(domainErr.ErrBadRequest, "invalid document id", nil)
		}
		if _, dup := seen[id]; dup {
			continue
		}
		seen[id] = struct{}{}

		doc, err := uc.docRepo.GetByID(ctx, id)
		if err != nil {
			return nil, err
		}
		if doc.WorkspaceID != workspaceID || doc.OrganizationID != orgID {
			return nil, domainErr.New(domainErr.ErrForbidden, "document does not belong to your organization workspace", nil)
		}
		if doc.Status != docModel.StatusSucceeded {
			return nil, domainErr.New(domainErr.ErrBadRequest, "only succeeded documents can be exported", nil)
		}
		out = append(out, doc)
	}
	return out, nil
}

func (uc *ExportPackageUseCase) loadDefault(ctx context.Context, workspaceID uuid.UUID) ([]*docModel.GeneratedDocument, error) {
	listed, err := uc.docRepo.ListByWorkspace(ctx, workspaceID, dto.MaxDocuments)
	if err != nil {
		return nil, err
	}

	approved := filterExportable(listed, true)
	if len(approved) > 0 {
		return approved, nil
	}
	return filterExportable(listed, false), nil
}

func filterExportable(docs []*docModel.GeneratedDocument, requireApproved bool) []*docModel.GeneratedDocument {
	out := make([]*docModel.GeneratedDocument, 0, len(docs))
	for _, d := range docs {
		if d == nil || d.Status != docModel.StatusSucceeded {
			continue
		}
		if requireApproved && d.ApprovalStatus != docModel.ApprovalApproved {
			continue
		}
		out = append(out, d)
	}
	return out
}

func buildZip(docs []*docModel.GeneratedDocument, exportedAt time.Time) ([]byte, error) {
	buf := new(bytes.Buffer)
	zw := zip.NewWriter(buf)
	usedNames := make(map[string]int, len(docs))

	for _, doc := range docs {
		base := exportFilename(doc, "md")
		name := base
		if n, ok := usedNames[base]; ok {
			usedNames[base] = n + 1
			name = fmt.Sprintf("%s-%d.md", strings.TrimSuffix(base, ".md"), n+1)
		} else {
			usedNames[base] = 1
		}

		w, err := zw.Create(name)
		if err != nil {
			_ = zw.Close()
			return nil, err
		}
		if _, err := w.Write([]byte(renderMarkdownExport(doc, exportedAt))); err != nil {
			_ = zw.Close()
			return nil, err
		}
	}
	if err := zw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func resolveWorkspace(ctx context.Context, workspaceRepo tenantRepo.WorkspaceRepository, workspaceID uuid.UUID) (*tenantModel.Workspace, uuid.UUID, error) {
	orgID, ok := middleware.ResolveOrganizationID(ctx)
	if !ok {
		return nil, uuid.Nil, domainErr.New(domainErr.ErrUnauthorized, "organization context required", nil)
	}
	workspace, err := workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return nil, uuid.Nil, err
	}
	if workspace.OrganizationID != orgID {
		return nil, uuid.Nil, domainErr.New(domainErr.ErrForbidden, "workspace does not belong to your organization", nil)
	}
	return workspace, orgID, nil
}
