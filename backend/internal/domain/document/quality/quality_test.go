package quality

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestEvaluate_FullScore(t *testing.T) {
	t.Parallel()
	body := "# Title\n\n" + strings.Repeat("içerik ", 40) // >200 runes with heading + tr
	s := Evaluate(body, "tr")
	assert.True(t, s.HasHeading)
	assert.True(t, s.MinLengthOK)
	assert.True(t, s.LanguageDeclared)
	assert.Equal(t, 100, s.QualityScore)
}

func TestEvaluate_PartialWeights(t *testing.T) {
	t.Parallel()
	s := Evaluate("short", "en")
	assert.False(t, s.HasHeading)
	assert.False(t, s.MinLengthOK)
	assert.True(t, s.LanguageDeclared)
	assert.Equal(t, 20, s.QualityScore)
}

func TestEvaluate_HeadingLevels(t *testing.T) {
	t.Parallel()
	assert.True(t, Evaluate("## Section\nbody", "").HasHeading)
	assert.True(t, Evaluate("### Deep\nbody", "").HasHeading)
	assert.False(t, Evaluate("#NoSpace", "").HasHeading)
	assert.False(t, Evaluate("not a # heading mid", "").HasHeading)
	assert.True(t, Evaluate("  # Indented heading\n", "").HasHeading)
}

func TestEvaluate_LanguageDeclared(t *testing.T) {
	t.Parallel()
	assert.True(t, Evaluate("", "TR").LanguageDeclared)
	assert.True(t, Evaluate("", " en ").LanguageDeclared)
	assert.False(t, Evaluate("", "de").LanguageDeclared)
	assert.False(t, Evaluate("", "").LanguageDeclared)
}

func TestEvaluate_MinLengthUsesRunes(t *testing.T) {
	t.Parallel()
	// 199 Turkish letters → not ok; 200 → ok
	short := strings.Repeat("ğ", 199)
	ok := strings.Repeat("ğ", 200)
	assert.False(t, Evaluate(short, "").MinLengthOK)
	assert.True(t, Evaluate(ok, "").MinLengthOK)
	assert.Equal(t, 40, Evaluate(ok, "").QualityScore)
}
