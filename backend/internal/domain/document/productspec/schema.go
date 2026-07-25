package productspec

import "strings"

// SectionID identifies a required Product Spec section.
type SectionID string

const (
	SectionSummary          SectionID = "summary"
	SectionProblemScope     SectionID = "problem_scope"
	SectionRequirements     SectionID = "requirements"
	SectionArchitecture     SectionID = "architecture"
	SectionAIUsage          SectionID = "ai_usage"
	SectionMCPIntegrations  SectionID = "mcp_integrations"
	SectionSecurity         SectionID = "security"
	SectionObservability    SectionID = "observability"
	SectionOpenQuestions    SectionID = "open_questions"
)

// RequiredSections is the canonical section order for Product Spec documents.
var RequiredSections = []SectionID{
	SectionSummary,
	SectionProblemScope,
	SectionRequirements,
	SectionArchitecture,
	SectionAIUsage,
	SectionMCPIntegrations,
	SectionSecurity,
	SectionObservability,
	SectionOpenQuestions,
}

// Heading returns the Markdown H2 heading for a section in the given language.
func Heading(id SectionID, language string) string {
	lang := strings.ToLower(strings.TrimSpace(language))
	if lang == "en" {
		return englishHeading(id)
	}
	return turkishHeading(id)
}

// AllHeadings returns localized headings for all required sections.
func AllHeadings(language string) []string {
	out := make([]string, 0, len(RequiredSections))
	for _, id := range RequiredSections {
		out = append(out, Heading(id, language))
	}
	return out
}

func turkishHeading(id SectionID) string {
	switch id {
	case SectionSummary:
		return "## 1. Özet ve hedef kullanıcı"
	case SectionProblemScope:
		return "## 2. Problem tanımı ve kapsam"
	case SectionRequirements:
		return "## 3. Ürün gereksinimleri"
	case SectionArchitecture:
		return "## 4. Mimari kararlar"
	case SectionAIUsage:
		return "## 5. AI / LLM kullanımı"
	case SectionMCPIntegrations:
		return "## 6. MCP ve otomasyon entegrasyonları"
	case SectionSecurity:
		return "## 7. Güvenlik ve uyumluluk"
	case SectionObservability:
		return "## 8. Gözlemlenebilirlik ve operasyon"
	case SectionOpenQuestions:
		return "## 9. Açık sorular ve eksikler"
	default:
		return ""
	}
}

func englishHeading(id SectionID) string {
	switch id {
	case SectionSummary:
		return "## 1. Summary and target users"
	case SectionProblemScope:
		return "## 2. Problem statement and scope"
	case SectionRequirements:
		return "## 3. Product requirements"
	case SectionArchitecture:
		return "## 4. Architecture decisions"
	case SectionAIUsage:
		return "## 5. AI / LLM usage"
	case SectionMCPIntegrations:
		return "## 6. MCP and automation integrations"
	case SectionSecurity:
		return "## 7. Security and compliance"
	case SectionObservability:
		return "## 8. Observability and operations"
	case SectionOpenQuestions:
		return "## 9. Open questions and gaps"
	default:
		return ""
	}
}

// CountPresentSections returns how many required section headings appear in body.
func CountPresentSections(body, language string) int {
	if body == "" {
		return 0
	}
	lower := strings.ToLower(body)
	count := 0
	for _, id := range RequiredSections {
		heading := strings.ToLower(Heading(id, language))
		// Match heading text without requiring exact ## prefix (models may vary slightly).
		title := strings.TrimPrefix(heading, "## ")
		if strings.Contains(lower, strings.ToLower(title)) {
			count++
		}
	}
	return count
}
