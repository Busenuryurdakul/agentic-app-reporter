package usecase

import (
	"github.com/masterfabric-go/masterfabric/internal/application/generation/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/quality"
)

func toDocumentInfo(doc *model.GeneratedDocument) *dto.DocumentInfo {
	if doc == nil {
		return nil
	}
	approval := doc.ApprovalStatus
	if approval == "" {
		approval = model.ApprovalDraft
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
		ApprovalStatus:    approval,
		ApprovedAt:        doc.ApprovedAt,
		ApprovedBy:        doc.ApprovedBy,
		CreatedBy:         doc.CreatedBy,
		CreatedAt:         doc.CreatedAt,
		UpdatedAt:         doc.UpdatedAt,
		Quality:           toDocumentQuality(doc),
	}
}

func toDocumentSummary(doc *model.GeneratedDocument) dto.DocumentSummary {
	approval := doc.ApprovalStatus
	if approval == "" {
		approval = model.ApprovalDraft
	}
	return dto.DocumentSummary{
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
		Quality:        toDocumentQuality(doc),
	}
}

func toDocumentQuality(doc *model.GeneratedDocument) dto.DocumentQuality {
	s := quality.Evaluate(doc.MarkdownBody, doc.Language)
	return dto.DocumentQuality{
		HasHeading:       s.HasHeading,
		MinLengthOK:      s.MinLengthOK,
		LanguageDeclared: s.LanguageDeclared,
		QualityScore:     s.QualityScore,
	}
}
