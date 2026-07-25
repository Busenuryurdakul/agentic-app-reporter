package productspec_test

import (
	"testing"

	"github.com/masterfabric-go/masterfabric/internal/domain/document/productspec"
	"github.com/stretchr/testify/assert"
)

func TestAllHeadings_Turkish(t *testing.T) {
	headings := productspec.AllHeadings("tr")
	assert.Len(t, headings, len(productspec.RequiredSections))
	assert.Equal(t, "## 1. Özet ve hedef kullanıcı", headings[0])
	assert.Contains(t, headings[5], "MCP")
}

func TestCountPresentSections(t *testing.T) {
	body := `# Ürün Spesifikasyonu

## 1. Özet ve hedef kullanıcı
Kısa özet.

## 2. Problem tanımı ve kapsam
Kapsam dışı maddeler.

## 5. AI / LLM kullanımı
Backend-only inference.
`
	assert.Equal(t, 3, productspec.CountPresentSections(body, "tr"))
	assert.Equal(t, 0, productspec.CountPresentSections("", "tr"))
}
