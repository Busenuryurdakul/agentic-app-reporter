package usecase

import (
	"github.com/masterfabric-go/masterfabric/internal/application/generation/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/model"
)

func toDocumentInfo(doc *model.GeneratedDocument) *dto.DocumentInfo {
	if doc == nil {
		return nil
	}
	return &dto.DocumentInfo{
		ID:                doc.ID,
		OrganizationID:    doc.OrganizationID,
		WorkspaceID:       doc.WorkspaceID,
		Title:             doc.Title,
		DocumentType:      doc.DocumentType,
		Language:          doc.Language,
		Status:            doc.Status,
		MarkdownBody:      doc.MarkdownBody,
		ProviderName:      doc.ProviderName,
		ModelName:         doc.ModelName,
		ErrorMessage:      doc.ErrorMessage,
		SourceFingerprint: doc.SourceFingerprint,
		CreatedBy:         doc.CreatedBy,
		CreatedAt:         doc.CreatedAt,
		UpdatedAt:         doc.UpdatedAt,
	}
}

func toDocumentSummary(doc *model.GeneratedDocument) dto.DocumentSummary {
	return dto.DocumentSummary{
		ID:           doc.ID,
		WorkspaceID:  doc.WorkspaceID,
		Title:        doc.Title,
		DocumentType: doc.DocumentType,
		Language:     doc.Language,
		Status:       doc.Status,
		ProviderName: doc.ProviderName,
		ModelName:    doc.ModelName,
		CreatedAt:    doc.CreatedAt,
		UpdatedAt:    doc.UpdatedAt,
	}
}
