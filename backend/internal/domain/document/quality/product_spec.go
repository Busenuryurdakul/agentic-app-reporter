package quality

import (
	"regexp"
	"strings"
	"unicode/utf8"

	docModel "github.com/masterfabric-go/masterfabric/internal/domain/document/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/productspec"
)

const (
	productSpecExpectedSections = 9
	minSectionBodyRunes         = 24
)

var placeholderPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)\btodo\b`),
	regexp.MustCompile(`(?i)\btbd\b`),
	regexp.MustCompile(`(?i)lorem ipsum`),
	regexp.MustCompile(`(?i)belirtilecektir`),
	regexp.MustCompile(`(?i)daha sonra belirlenecek`),
	regexp.MustCompile(`(?i)\.\.\.`),
}

// ProductSpecEvaluation extends deterministic quality signals for Product Spec markdown.
type ProductSpecEvaluation struct {
	Signals
	SectionCoverage       int      `json:"section_coverage"`
	ExpectedSections      int      `json:"expected_sections"`
	DuplicateTextDetected bool     `json:"duplicate_text_detected"`
	PlaceholderDetected   bool     `json:"placeholder_detected"`
	MarkdownValid         bool     `json:"markdown_valid"`
	QualityStatus         string   `json:"quality_status"`
	Issues                []string `json:"issues"`
}

// EvaluateProductSpec returns extended deterministic quality signals for product_spec documents.
func EvaluateProductSpec(markdownBody, language string) ProductSpecEvaluation {
	base := EvaluateForType(markdownBody, language, docModel.DocumentTypeProductSpec)
	present := productspec.CountPresentSections(markdownBody, language)
	duplicate := hasDuplicateParagraph(markdownBody)
	placeholder, placeholderIssues := detectPlaceholders(markdownBody)
	markdownValid, markdownIssues := validateProductSpecMarkdown(markdownBody, language)
	shortSections, shortIssues := detectShortSections(markdownBody, language)

	issues := make([]string, 0, 8)
	issues = append(issues, placeholderIssues...)
	issues = append(issues, markdownIssues...)
	issues = append(issues, shortIssues...)

	status := productSpecQualityStatus(base, present, duplicate, placeholder, markdownValid, len(shortSections) > 0)

	return ProductSpecEvaluation{
		Signals:               base,
		SectionCoverage:       present,
		ExpectedSections:      productSpecExpectedSections,
		DuplicateTextDetected: duplicate,
		PlaceholderDetected:   placeholder,
		MarkdownValid:         markdownValid,
		QualityStatus:         status,
		Issues:                issues,
	}
}

func productSpecQualityStatus(base Signals, present int, duplicate, placeholder, markdownValid, shortSections bool) string {
	if !markdownValid || present < 4 || !base.MinLengthOK {
		return "fail"
	}
	if present < productSpecExpectedSections || duplicate || placeholder || shortSections || !base.SectionCoverageOK {
		return "warning"
	}
	return "pass"
}

func detectPlaceholders(body string) (bool, []string) {
	issues := make([]string, 0, 2)
	found := false
	for _, re := range placeholderPatterns {
		if re.MatchString(body) {
			found = true
			issues = append(issues, "placeholder_ifadesi_tespit_edildi")
			break
		}
	}
	return found, issues
}

func validateProductSpecMarkdown(body, language string) (bool, []string) {
	if strings.TrimSpace(body) == "" {
		return false, []string{"markdown_govdesi_bos"}
	}
	issues := make([]string, 0, 2)
	if !hasHeading(body) {
		issues = append(issues, "markdown_baslik_yok")
	}
	for _, line := range strings.Split(body, "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "#") && !isValidATXHeading(trimmed) {
			issues = append(issues, "markdown_baslik_bozuk")
			break
		}
	}
	if productspec.CountPresentSections(body, language) == 0 && !hasHeading(body) {
		return false, issues
	}
	return len(issues) == 0, issues
}

func isValidATXHeading(line string) bool {
	level := 0
	for level < len(line) && level < 6 && line[level] == '#' {
		level++
	}
	if level == 0 || level >= len(line) {
		return false
	}
	if line[level] != ' ' && line[level] != '\t' {
		return false
	}
	return strings.TrimSpace(line[level+1:]) != ""
}

func detectShortSections(body, language string) ([]string, []string) {
	short := make([]string, 0)
	issues := make([]string, 0)
	lines := strings.Split(body, "\n")
	current := ""
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "## ") {
			if current != "" && utf8.RuneCountInString(strings.TrimSpace(current)) < minSectionBodyRunes {
				short = append(short, current)
				issues = append(issues, "kisa_bolum_icerigi")
			}
			current = trimmed
			continue
		}
		if current != "" && trimmed != "" {
			current += " " + trimmed
		}
	}
	if current != "" && utf8.RuneCountInString(strings.TrimSpace(current)) < minSectionBodyRunes {
		short = append(short, current)
		issues = append(issues, "kisa_bolum_icerigi")
	}
	return short, issues
}

func hasDuplicateParagraph(body string) bool {
	paras := make([]string, 0)
	for _, block := range strings.Split(body, "\n\n") {
		n := normalizeDuplicateText(block)
		if utf8.RuneCountInString(n) < 40 {
			continue
		}
		paras = append(paras, n)
	}
	seen := make(map[string]struct{}, len(paras))
	for _, p := range paras {
		if _, ok := seen[p]; ok {
			return true
		}
		seen[p] = struct{}{}
	}
	return hasDuplicateSentence(body)
}

func hasDuplicateSentence(body string) bool {
	seen := make(map[string]struct{})
	for _, part := range strings.FieldsFunc(body, func(r rune) bool { return r == '.' || r == '!' || r == '?' || r == '\n' }) {
		n := normalizeDuplicateText(part)
		if utf8.RuneCountInString(n) < 30 {
			continue
		}
		if _, ok := seen[n]; ok {
			return true
		}
		seen[n] = struct{}{}
	}
	return false
}

func normalizeDuplicateText(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = strings.Join(strings.Fields(s), " ")
	return s
}
