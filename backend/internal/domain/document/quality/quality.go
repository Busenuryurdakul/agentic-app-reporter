package quality

import (
	"strings"
	"unicode/utf8"
)

const minBodyRunes = 200

// Signals is the deterministic document quality heuristic set (Phase 4 S2).
// No LLM is involved; scores are derived only from body + declared language.
type Signals struct {
	HasHeading       bool `json:"has_heading"`
	MinLengthOK      bool `json:"min_length_ok"`
	LanguageDeclared bool `json:"language_declared"`
	QualityScore     int  `json:"quality_score"`
}

// Evaluate returns quality signals for a generated document.
// Empty/failed bodies yield zeros; language is evaluated independently of body length.
func Evaluate(markdownBody, language string) Signals {
	s := Signals{
		HasHeading:       hasHeading(markdownBody),
		MinLengthOK:      utf8.RuneCountInString(markdownBody) >= minBodyRunes,
		LanguageDeclared: isDeclaredLanguage(language),
	}
	s.QualityScore = score(s)
	return s
}

func score(s Signals) int {
	total := 0
	if s.HasHeading {
		total += 40
	}
	if s.MinLengthOK {
		total += 40
	}
	if s.LanguageDeclared {
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
