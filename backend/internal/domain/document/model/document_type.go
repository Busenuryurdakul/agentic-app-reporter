package model

import (
	"fmt"
	"strings"
)

const (
	// DocumentTypeProductSpec is a structured product specification Markdown artifact.
	DocumentTypeProductSpec = "product_spec"
)

// SupportedDocumentTypes lists allowed document_type values for generation.
var SupportedDocumentTypes = []string{
	DocumentTypeStudioMarkdown,
	DocumentTypeProductSpec,
}

// NormalizeDocumentType returns a canonical type or the default when empty.
func NormalizeDocumentType(documentType string) string {
	switch strings.TrimSpace(strings.ToLower(documentType)) {
	case DocumentTypeProductSpec:
		return DocumentTypeProductSpec
	case DocumentTypeStudioMarkdown, "":
		return DocumentTypeStudioMarkdown
	default:
		return strings.TrimSpace(strings.ToLower(documentType))
	}
}

// ValidateDocumentType reports whether documentType is supported for generation.
func ValidateDocumentType(documentType string) error {
	normalized := NormalizeDocumentType(documentType)
	for _, allowed := range SupportedDocumentTypes {
		if normalized == allowed {
			return nil
		}
	}
	return fmt.Errorf("unsupported document_type %q", documentType)
}

// DefaultDocumentTitle returns a localized default title for the document type.
func DefaultDocumentTitle(documentType, language string) string {
	lang := strings.ToLower(strings.TrimSpace(language))
	switch NormalizeDocumentType(documentType) {
	case DocumentTypeProductSpec:
		if lang == "en" {
			return "Product Specification"
		}
		return "Ürün Spesifikasyonu"
	default:
		if lang == "en" {
			return "AI Development Configuration"
		}
		return "AI Geliştirme Yapılandırması"
	}
}
