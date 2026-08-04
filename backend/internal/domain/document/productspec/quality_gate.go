package productspec

import (
	"regexp"
	"strings"
)

// QualityGateResult mirrors production markdown quality gate checks.
type QualityGateResult struct {
	Passed              bool     `json:"quality_gate_passed"`
	Reasons             []string `json:"quality_gate_reasons,omitempty"`
	PlaceholderCount    int      `json:"placeholder_count"`
	ForeignScriptCount  int      `json:"foreign_script_count"`
	RawKeyCount         int      `json:"raw_key_count"`
	TruncatedOutput     bool     `json:"truncated_output"`
	StructuredHeadingOK bool     `json:"structured_heading_ok"`
}

var (
	gateCJKRE     = regexp.MustCompile(`[\p{Han}\p{Hangul}\p{Hiragana}\p{Katakana}\p{Cyrillic}]`)
	gateRawKeyRE  = regexp.MustCompile(`\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b`)
	gatePlaceholderRE = regexp.MustCompile(`(?i)(?:^|\s)(?:-önlem-|TODO\b|TBD\b|placeholder|\[\s*\]|\(\s*\))`)
)

var allowedTech = map[string]struct{}{
	"ci_cd": {}, "oauth2": {}, "openid": {}, "next_js": {}, "github_actions": {}, "gitlab_ci": {},
}

var techTerms = map[string]struct{}{
	"rest": {}, "api": {}, "jwt": {}, "postgresql": {}, "postgres": {}, "docker": {}, "json": {},
	"kvkk": {}, "rbac": {}, "oauth2": {}, "saas": {}, "react": {}, "go": {}, "sql": {}, "pii": {}, "gdpr": {}, "llm": {}, "mcp": {},
}

// RunQualityGate evaluates rendered Product Spec markdown for production gate parity.
func RunQualityGate(body string, meta GenerationMeta, minLength int) QualityGateResult {
	if minLength <= 0 {
		minLength = 1200
	}
	reasons := make([]string, 0, 6)
	foreign := countForeignScript(body)
	placeholder := countGatePlaceholders(body)
	rawKeys := countRawKeys(body)
	truncated := isTruncatedMarkdown(body)
	headings := CountStructuredHeadings(body, "tr")
	structuredOK := strings.HasPrefix(strings.TrimSpace(body), StructuredMarkdownPrefix) && headings >= 9

	if foreign > 0 {
		reasons = append(reasons, "foreign_script_detected")
	}
	if placeholder > 0 {
		reasons = append(reasons, "placeholder_detected")
	}
	if rawKeys >= 5 {
		reasons = append(reasons, "excessive_raw_keys")
	}
	if truncated {
		reasons = append(reasons, "truncated_output")
	}
	if len(strings.TrimSpace(body)) < minLength {
		reasons = append(reasons, "too_short")
	}
	if !meta.StructuredOutputValid {
		reasons = append(reasons, "structured_output_invalid")
	}
	if strings.HasPrefix(strings.TrimSpace(body), StructuredMarkdownPrefix) && headings < 9 {
		reasons = append(reasons, "structured_heading_incomplete")
	}

	return QualityGateResult{
		Passed:              len(reasons) == 0,
		Reasons:             reasons,
		PlaceholderCount:    placeholder,
		ForeignScriptCount:  foreign,
		RawKeyCount:         rawKeys,
		TruncatedOutput:     truncated,
		StructuredHeadingOK: structuredOK,
	}
}

func countForeignScript(text string) int {
	return len(gateCJKRE.FindAllString(text, -1))
}

func countGatePlaceholders(text string) int {
	count := 0
	if gatePlaceholderRE.MatchString(text) {
		count++
	}
	if strings.HasSuffix(strings.TrimSpace(text), "...") {
		count++
	}
	count += countSchemaEchoLines(text)
	return count
}

func countSchemaEchoLines(text string) int {
	count := 0
	for _, line := range strings.Split(text, "\n") {
		val := lineValueForGate(line)
		if val != "" && isSchemaExampleEcho(val) {
			count++
		}
	}
	return count
}

func lineValueForGate(line string) string {
	stripped := strings.TrimSpace(strings.TrimLeft(line, "-*• "))
	if i := strings.Index(stripped, ":"); i >= 0 {
		return strings.TrimSpace(stripped[i+1:])
	}
	return stripped
}

func countRawKeys(text string) int {
	body := strings.ToLower(text)
	matches := gateRawKeyRE.FindAllString(body, -1)
	count := 0
	for _, tok := range matches {
		if _, ok := allowedTech[tok]; ok {
			continue
		}
		if _, ok := techTerms[tok]; ok {
			continue
		}
		count++
	}
	return count
}

func isTruncatedMarkdown(text string) bool {
	body := strings.TrimSpace(text)
	if body == "" {
		return true
	}
	if strings.HasSuffix(body, "...") {
		return true
	}
	if !strings.Contains(body, "Yol Haritası") && !regexp.MustCompile(`(?m)^#{2,4}\s*9[\.\)]`).MatchString(body) {
		return true
	}
	lines := strings.Split(body, "\n")
	last := ""
	for i := len(lines) - 1; i >= 0; i-- {
		if t := strings.TrimSpace(lines[i]); t != "" {
			last = t
			break
		}
	}
	if matched, _ := regexp.MatchString(`^#{1,4}\s*\d`, last); matched {
		return true
	}
	if matched, _ := regexp.MatchString(`[,\-–—:]\s*$`, last); matched {
		return true
	}
	return false
}
