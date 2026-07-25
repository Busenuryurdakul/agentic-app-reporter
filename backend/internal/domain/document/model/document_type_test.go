package model_test

import (
	"testing"

	"github.com/masterfabric-go/masterfabric/internal/domain/document/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalizeDocumentType(t *testing.T) {
	assert.Equal(t, model.DocumentTypeStudioMarkdown, model.NormalizeDocumentType(""))
	assert.Equal(t, model.DocumentTypeStudioMarkdown, model.NormalizeDocumentType("studio_markdown"))
	assert.Equal(t, model.DocumentTypeProductSpec, model.NormalizeDocumentType("product_spec"))
	assert.Equal(t, model.DocumentTypeProductSpec, model.NormalizeDocumentType(" PRODUCT_SPEC "))
}

func TestValidateDocumentType(t *testing.T) {
	require.NoError(t, model.ValidateDocumentType(""))
	require.NoError(t, model.ValidateDocumentType(model.DocumentTypeProductSpec))
	require.Error(t, model.ValidateDocumentType("unknown_type"))
}

func TestDefaultDocumentTitle(t *testing.T) {
	assert.Equal(t, "Ürün Spesifikasyonu", model.DefaultDocumentTitle(model.DocumentTypeProductSpec, "tr"))
	assert.Equal(t, "Product Specification", model.DefaultDocumentTitle(model.DocumentTypeProductSpec, "en"))
	assert.Equal(t, "AI Geliştirme Yapılandırması", model.DefaultDocumentTitle(model.DocumentTypeStudioMarkdown, "tr"))
}
