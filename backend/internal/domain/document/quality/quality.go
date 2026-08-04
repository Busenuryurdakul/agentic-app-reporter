package quality

import (
	"strings"
	"unicode/utf8"

	docModel "github.com/masterfabric-go/masterfabric/internal/domain/document/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/productspec"
)

const minBodyRunes = 200

// Minimum required sections for a product_spec to pass section coverage (out of 9).
const minProductSpecSections = 6

// Signals is the deterministic document quality heuristic set (Phase 4 S2).
// No LLM is involved; scores are derived only from body + declared language.
type Signals struct {
	HasHeading        bool `json:"has_heading"`
	MinLengthOK       bool `json:"min_length_ok"`
	LanguageDeclared  bool `json:"language_declared"`
	SectionCoverageOK bool `json:"section_coverage_ok,omitempty"`
	QualityScore      int  `json:"quality_score"`
}

// Evaluate returns quality signals for a generated document.
// Empty/failed bodies yield zeros; language is evaluated independently of body length.
func Evaluate(markdownBody, language string) Signals {
	return EvaluateForType(markdownBody, language, docModel.DocumentTypeStudioMarkdown)
}

// EvaluateForType applies type-specific heuristics (e.g. product_spec section coverage).
func EvaluateForType(markdownBody, language, documentType string) Signals {
	s := Signals{
		HasHeading:       hasHeading(markdownBody),
		MinLengthOK:      utf8.RuneCountInString(markdownBody) >= minBodyRunes,
		LanguageDeclared: isDeclaredLanguage(language),
	}
	if docModel.NormalizeDocumentType(documentType) == docModel.DocumentTypeProductSpec {
		present := productspec.CountPresentSections(markdownBody, language)
		s.SectionCoverageOK = present >= minProductSpecSections
	}
	s.QualityScore = score(s, documentType)
	return s
}

func score(s Signals, documentType string) int {
	total := 0
	if s.HasHeading {
		total += 30
	}
	if s.MinLengthOK {
		total += 30
	}
	if s.LanguageDeclared {
		total += 20
	}
	if docModel.NormalizeDocumentType(documentType) == docModel.DocumentTypeProductSpec {
		if s.SectionCoverageOK {
			total += 20
		}
	} else if s.HasHeading && s.MinLengthOK {
		// Studio markdown: remaining 20 when basic structure is present.
		total += 20
	}
	return total
}

// hasHeading is true when a line starts with a Markdown ATX heading (# … ######).
func hasHeading(body string) bool {
	if body == "" {
		return false
	}
	for _, line := range strings.Split(body, "\n") {
		trimmed := strings.TrimLeft(line, " \t")
		level := 0
		for level < len(trimmed) && level < 6 && trimmed[level] == '#' {
			level++
		}
		if level == 0 {
			continue
		}
		if level < len(trimmed) && (trimmed[level] == ' ' || trimmed[level] == '\t') {
			rest := strings.TrimSpace(trimmed[level+1:])
			if rest != "" {
				return true
			}
		}
	}
	return false
}

func isDeclaredLanguage(language string) bool {
	switch strings.ToLower(strings.TrimSpace(language)) {
	case "tr", "en":
		return true
	default:
		return false
	}
}
