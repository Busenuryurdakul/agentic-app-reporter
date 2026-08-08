package productspec

import (
	"fmt"
	"strings"
)

// StructuredHeadings returns deterministic H2 headings for rendered Product Spec markdown.
func StructuredHeadings(language string) []string {
	if strings.ToLower(strings.TrimSpace(language)) == "en" {
		return []string{
			"## 1. Project Summary",
			"## 2. Problem, Goals and Success Metrics",
			"## 3. Users and Roles",
			"## 4. Functional Requirements",
			"## 5. Non-Functional Requirements",
			"## 6. Technical Architecture",
			"## 7. Data Model",
			"## 8. Security and Privacy",
			"## 9. Roadmap and Acceptance Criteria",
		}
	}
	return []string{
		"## 1. Proje Özeti",
		"## 2. Problem, Hedefler ve Başarı Ölçütleri",
		"## 3. Kullanıcılar ve Roller",
		"## 4. Fonksiyonel Gereksinimler",
		"## 5. Fonksiyonel Olmayan Gereksinimler",
		"## 6. Teknik Mimari",
		"## 7. Veri Modeli",
		"## 8. Güvenlik ve Gizlilik",
		"## 9. Yol Haritası ve Kabul Kriterleri",
	}
}

// RenderMarkdown converts validated structured JSON into deterministic Markdown.
func RenderMarkdown(spec *StructuredSpec, language string) (string, error) {
	if spec == nil {
		return "", fmt.Errorf("structured spec is nil")
	}
	project := strings.TrimSpace(spec.Summary.ProjectName)
	if project == "" {
		project = "Proje"
	}

	headings := StructuredHeadings(language)
	var b strings.Builder
	b.WriteString(StructuredMarkdownPrefix)
	b.WriteString(" ")
	b.WriteString(project)
	b.WriteString("\n\n")

	b.WriteString(headings[0])
	b.WriteString("\n\n")
	writeBullet(&b, "Proje adı", spec.Summary.ProjectName)
	writeBullet(&b, "Açıklama", spec.Summary.Description)
	writeBullet(&b, "Değer önerisi", spec.Summary.ValueProposition)

	b.WriteString("\n")
	b.WriteString(headings[1])
	b.WriteString("\n\n")
	writeBullet(&b, "Problem", spec.Summary.Problem)
	writeListSection(&b, "İş hedefleri", spec.Goals.BusinessGoals)
	writeListSection(&b, "Başarı ölçütleri", spec.Goals.SuccessMetrics)

	b.WriteString("\n")
	b.WriteString(headings[2])
	b.WriteString("\n\n")
	for _, role := range spec.UsersAndRoles {
		b.WriteString("### ")
		b.WriteString(strings.TrimSpace(role.Role))
		b.WriteString("\n\n")
		writeListSection(&b, "Sorumluluklar", role.Responsibilities)
		writeListSection(&b, "Temel ihtiyaçlar", role.MainNeeds)
		b.WriteString("\n")
	}

	b.WriteString(headings[3])
	b.WriteString("\n\n")
	for i, fr := range spec.FunctionalRequirements {
		id := strings.TrimSpace(fr.ID)
		if id == "" {
			id = fmt.Sprintf("FR-%03d", i+1)
		}
		b.WriteString("### ")
		b.WriteString(id)
		b.WriteString(": ")
		b.WriteString(strings.TrimSpace(fr.Title))
		b.WriteString("\n\n")
		writeParagraph(&b, fr.Description)
		writeBullet(&b, "Öncelik", fr.Priority)
		writeListSection(&b, "Kabul kriterleri", fr.AcceptanceCriteria)
		b.WriteString("\n")
	}

	b.WriteString(headings[4])
	b.WriteString("\n\n")
	nfr := spec.NonFunctionalRequirements
	writeListSection(&b, "Performans", nfr.Performance)
	writeListSection(&b, "Erişilebilirlik (availability)", nfr.Availability)
	writeListSection(&b, "Ölçeklenebilirlik", nfr.Scalability)
	writeListSection(&b, "Erişilebilirlik (accessibility)", nfr.Accessibility)
	writeListSection(&b, "Gözlemlenebilirlik", nfr.Observability)

	b.WriteString("\n")
	b.WriteString(headings[5])
	b.WriteString("\n\n")
	writeBullet(&b, "Mimari stil", spec.Architecture.Style)
	writeListSection(&b, "Bileşenler", spec.Architecture.Components)
	writeListSection(&b, "Entegrasyonlar", spec.Architecture.Integrations)
	writeBullet(&b, "Dağıtım", spec.Architecture.Deployment)

	b.WriteString("\n")
	b.WriteString(headings[6])
	b.WriteString("\n\n")
	for _, ent := range spec.DataModel {
		b.WriteString("### ")
		b.WriteString(strings.TrimSpace(ent.Entity))
		b.WriteString("\n\n")
		writeParagraph(&b, ent.Purpose)
		writeListSection(&b, "Önemli alanlar", ent.ImportantFields)
		if len(ent.Relations) > 0 {
			writeListSection(&b, "İlişkiler", ent.Relations)
		}
		b.WriteString("\n")
	}

	b.WriteString(headings[7])
	b.WriteString("\n\n")
	sec := spec.SecurityAndPrivacy
	writeBullet(&b, "Kimlik doğrulama", sec.Authentication)
	writeBullet(&b, "Yetkilendirme", sec.Authorization)
	writeListSection(&b, "Veri koruma", sec.DataProtection)
	writeListSection(&b, "Denetim kaydı", sec.AuditLogging)
	writeListSection(&b, "Uyumluluk", sec.Compliance)

	b.WriteString("\n")
	b.WriteString(headings[8])
	b.WriteString("\n\n")
	for _, phase := range spec.Roadmap {
		b.WriteString("### ")
		b.WriteString(strings.TrimSpace(phase.Phase))
		b.WriteString("\n\n")
		writeListSection(&b, "Kapsam", phase.Scope)
		writeListSection(&b, "Çıkış kriterleri", phase.ExitCriteria)
		b.WriteString("\n")
	}

	return strings.TrimSpace(b.String()) + "\n", nil
}

func writeBullet(b *strings.Builder, label, value string) {
	value = strings.TrimSpace(value)
	if value == "" {
		return
	}
	b.WriteString("- **")
	b.WriteString(label)
	b.WriteString(":** ")
	b.WriteString(value)
	b.WriteString("\n")
}

func writeParagraph(b *strings.Builder, text string) {
	text = strings.TrimSpace(text)
	if text == "" {
		return
	}
	b.WriteString(text)
	b.WriteString("\n\n")
}

func writeListSection(b *strings.Builder, label string, items []string) {
	if len(items) == 0 {
		return
	}
	b.WriteString("**")
	b.WriteString(label)
	b.WriteString(":**\n")
	for _, item := range items {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		b.WriteString("- ")
		b.WriteString(item)
		b.WriteString("\n")
	}
	b.WriteString("\n")
}

// CountStructuredHeadings counts how many deterministic headings appear in body.
func CountStructuredHeadings(body, language string) int {
	if body == "" {
		return 0
	}
	lower := strings.ToLower(body)
	count := 0
	for _, h := range StructuredHeadings(language) {
		title := strings.TrimPrefix(h, "## ")
		if strings.Contains(lower, strings.ToLower(title)) {
			count++
		}
	}
	return count
}

// AssignRequirementIDs fills missing functional requirement IDs deterministically.
func AssignRequirementIDs(spec *StructuredSpec) {
	for i := range spec.FunctionalRequirements {
		if strings.TrimSpace(spec.FunctionalRequirements[i].ID) == "" {
			spec.FunctionalRequirements[i].ID = "FR-" + leftPad3(i+1)
		}
	}
}

func leftPad3(n int) string {
	return fmt.Sprintf("%03d", n)
}
