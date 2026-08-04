package quality

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func productSpecBodyTR(extraSections ...string) string {
	sections := []string{
		"## 1. Özet ve hedef kullanıcı\n\nBu bölüm yeterince uzun bir özet metni içerir.",
		"## 2. Problem tanımı ve kapsam\n\nProblem tanımı detaylı biçimde açıklanmıştır.",
		"## 3. Ürün gereksinimleri\n\nGereksinimler net şekilde listelenmiştir.",
		"## 4. Mimari kararlar\n\nMimari kararlar açıklanmıştır.",
		"## 5. AI / LLM kullanımı\n\nAI kullanım senaryoları belirtilmiştir.",
		"## 6. MCP ve otomasyon entegrasyonları\n\nMCP entegrasyonları anlatılmıştır.",
		"## 7. Güvenlik ve uyumluluk\n\nGüvenlik gereksinimleri yazılmıştır.",
		"## 8. Gözlemlenebilirlik ve operasyon\n\nOperasyonel izleme açıklanmıştır.",
		"## 9. Açık sorular ve eksikler\n\nAçık sorular listelenmiştir.",
	}
	sections = append(sections, extraSections...)
	return strings.Join(sections, "\n\n")
}

func TestEvaluateProductSpec_PassWithNineSections(t *testing.T) {
	t.Parallel()
	eval := EvaluateProductSpec(productSpecBodyTR(), "tr")
	assert.Equal(t, 9, eval.SectionCoverage)
	assert.Equal(t, 9, eval.ExpectedSections)
	assert.True(t, eval.MarkdownValid)
	assert.False(t, eval.DuplicateTextDetected)
	assert.False(t, eval.PlaceholderDetected)
	assert.Equal(t, "pass", eval.QualityStatus)
}

func TestEvaluateProductSpec_WarningWhenSectionsMissing(t *testing.T) {
	t.Parallel()
	body := productSpecBodyTR()[:strings.Index(productSpecBodyTR(), "## 7.")]
	eval := EvaluateProductSpec(body, "tr")
	assert.Less(t, eval.SectionCoverage, 9)
	assert.Contains(t, []string{"warning", "fail"}, eval.QualityStatus)
}

func TestEvaluateProductSpec_DetectsDuplicateText(t *testing.T) {
	t.Parallel()
	repeated := "Bu cümle tekrar eden uzun bir paragraf metnidir ve kalite kontrolünde yakalanmalıdır."
	body := productSpecBodyTR() + "\n\n" + repeated + "\n\n" + repeated
	eval := EvaluateProductSpec(body, "tr")
	assert.True(t, eval.DuplicateTextDetected)
}

func TestEvaluateProductSpec_DetectsPlaceholder(t *testing.T) {
	t.Parallel()
	body := productSpecBodyTR() + "\n\nTODO: daha sonra belirlenecek"
	eval := EvaluateProductSpec(body, "tr")
	assert.True(t, eval.PlaceholderDetected)
	assert.NotEqual(t, "pass", eval.QualityStatus)
}

func TestEvaluateProductSpec_FailsOnEmptyBody(t *testing.T) {
	t.Parallel()
	eval := EvaluateProductSpec("", "tr")
	assert.Equal(t, "fail", eval.QualityStatus)
	assert.False(t, eval.MarkdownValid)
}

func TestEvaluateProductSpec_DetectsBrokenHeading(t *testing.T) {
	t.Parallel()
	body := "#Broken heading without space\n\n" + strings.Repeat("içerik ", 40)
	eval := EvaluateProductSpec(body, "tr")
	assert.False(t, eval.MarkdownValid)
	require.NotEmpty(t, eval.Issues)
}
