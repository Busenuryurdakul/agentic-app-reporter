package productspec

import (
	"strconv"
	"strings"
)

// SanitizeStructured replaces verbatim JSON schema example strings with contextual Varsayım text.
// Returns the number of fields rewritten.
func SanitizeStructured(spec *StructuredSpec) int {
	if spec == nil {
		return 0
	}
	replaced := 0
	replace := func(path, value string) string {
		if !isSchemaExampleEcho(value) {
			return value
		}
		replaced++
		return replacementForSchemaEcho(path, spec)
	}

	s := &spec.Summary
	s.ProjectName = replace("summary.project_name", s.ProjectName)
	s.Description = replace("summary.description", s.Description)
	s.Problem = replace("summary.problem", s.Problem)
	s.ValueProposition = replace("summary.value_proposition", s.ValueProposition)

	g := &spec.Goals
	for i := range g.BusinessGoals {
		g.BusinessGoals[i] = replace("goals.business_goals["+strconv.Itoa(i)+"]", g.BusinessGoals[i])
	}
	for i := range g.SuccessMetrics {
		g.SuccessMetrics[i] = replace("goals.success_metrics["+strconv.Itoa(i)+"]", g.SuccessMetrics[i])
	}

	for i := range spec.UsersAndRoles {
		role := &spec.UsersAndRoles[i]
		prefix := "users_and_roles[" + strconv.Itoa(i) + "]"
		role.Role = replace(prefix+".role", role.Role)
		for j := range role.Responsibilities {
			role.Responsibilities[j] = replace(prefix+".responsibilities["+strconv.Itoa(j)+"]", role.Responsibilities[j])
		}
		for j := range role.MainNeeds {
			role.MainNeeds[j] = replace(prefix+".main_needs["+strconv.Itoa(j)+"]", role.MainNeeds[j])
		}
	}

	for i := range spec.FunctionalRequirements {
		fr := &spec.FunctionalRequirements[i]
		prefix := "functional_requirements[" + strconv.Itoa(i) + "]"
		fr.Title = replace(prefix+".title", fr.Title)
		fr.Description = replace(prefix+".description", fr.Description)
		for j := range fr.AcceptanceCriteria {
			fr.AcceptanceCriteria[j] = replace(prefix+".acceptance_criteria["+strconv.Itoa(j)+"]", fr.AcceptanceCriteria[j])
		}
	}

	sanitizeSlice := func(path string, items []string) []string {
		out := make([]string, len(items))
		for i, item := range items {
			out[i] = replace(path+"["+strconv.Itoa(i)+"]", item)
		}
		return out
	}

	nfr := &spec.NonFunctionalRequirements
	nfr.Performance = sanitizeSlice("non_functional_requirements.performance", nfr.Performance)
	nfr.Availability = sanitizeSlice("non_functional_requirements.availability", nfr.Availability)
	nfr.Scalability = sanitizeSlice("non_functional_requirements.scalability", nfr.Scalability)
	nfr.Accessibility = sanitizeSlice("non_functional_requirements.accessibility", nfr.Accessibility)
	nfr.Observability = sanitizeSlice("non_functional_requirements.observability", nfr.Observability)

	arch := &spec.Architecture
	arch.Style = replace("architecture.style", arch.Style)
	arch.Components = sanitizeSlice("architecture.components", arch.Components)
	arch.Integrations = sanitizeSlice("architecture.integrations", arch.Integrations)
	arch.Deployment = replace("architecture.deployment", arch.Deployment)

	for i := range spec.DataModel {
		ent := &spec.DataModel[i]
		prefix := "data_model[" + strconv.Itoa(i) + "]"
		ent.Entity = replace(prefix+".entity", ent.Entity)
		ent.Purpose = replace(prefix+".purpose", ent.Purpose)
		ent.ImportantFields = sanitizeSlice(prefix+".important_fields", ent.ImportantFields)
		ent.Relations = sanitizeSlice(prefix+".relations", ent.Relations)
	}

	sec := &spec.SecurityAndPrivacy
	sec.Authentication = replace("security_and_privacy.authentication", sec.Authentication)
	sec.Authorization = replace("security_and_privacy.authorization", sec.Authorization)
	sec.DataProtection = sanitizeSlice("security_and_privacy.data_protection", sec.DataProtection)
	sec.AuditLogging = sanitizeSlice("security_and_privacy.audit_logging", sec.AuditLogging)
	sec.Compliance = sanitizeSlice("security_and_privacy.compliance", sec.Compliance)

	for i := range spec.Roadmap {
		phase := &spec.Roadmap[i]
		prefix := "roadmap[" + strconv.Itoa(i) + "]"
		phase.Phase = replace(prefix+".phase", phase.Phase)
		phase.Scope = sanitizeSlice(prefix+".scope", phase.Scope)
		phase.ExitCriteria = sanitizeSlice(prefix+".exit_criteria", phase.ExitCriteria)
	}

	return replaced
}

func replacementForSchemaEcho(path string, spec *StructuredSpec) string {
	ctx := strings.TrimSpace(spec.Summary.Description)
	if ctx == "" || isSchemaExampleEcho(ctx) {
		ctx = strings.TrimSpace(spec.Summary.ProjectName)
	}
	problem := strings.TrimSpace(spec.Summary.Problem)
	if isSchemaExampleEcho(problem) {
		problem = ""
	}

	switch {
	case strings.HasSuffix(path, "value_proposition"):
		if problem != "" {
			return "Varsayım: " + problem + " için somut değer önerisi."
		}
		return "Varsayım: " + ctx + " kapsamında ölçülebilir değer sunar."
	case strings.Contains(path, "business_goals"):
		if problem != "" {
			return "Varsayım: " + problem + " sorununu azaltmayı hedefler."
		}
		return "Varsayım: Proje iş hedefi bağlama uygun şekilde tanımlanır."
	case strings.Contains(path, "success_metrics"):
		return "Varsayım: Operasyonel KPI ile başarı ölçülür."
	case strings.Contains(path, "responsibilities"):
		return "Varsayım: Rol kapsamındaki temel sorumluluklar."
	case strings.Contains(path, "main_needs"):
		return "Varsayım: Rolün günlük operasyon ihtiyaçları."
	case strings.Contains(path, "functional_requirements") && strings.HasSuffix(path, "title"):
		return "Varsayım: Bağlama uygun fonksiyonel özellik."
	case strings.Contains(path, "functional_requirements") && strings.HasSuffix(path, "description"):
		return "Varsayım: Kullanıcı akışına uygun gereksinim açıklaması."
	case strings.Contains(path, "acceptance_criteria"):
		return "Varsayım: Test edilebilir kabul kriteri."
	case strings.Contains(path, "architecture.style"):
		return "Varsayım: Modüler monolith mimari."
	case strings.Contains(path, "architecture.deployment"):
		return "Varsayım: Bulut tabanlı dağıtım."
	case strings.Contains(path, "security_and_privacy.authentication"):
		return "Varsayım: Kurumsal kimlik doğrulama (SSO/OAuth2)."
	case strings.Contains(path, "security_and_privacy.authorization"):
		return "Varsayım: Rol bazlı erişim kontrolü (RBAC)."
	case strings.Contains(path, "data_protection"):
		return "Varsayım: Kişisel ve operasyonel veriler şifrelenir."
	default:
		if ctx != "" && !isSchemaExampleEcho(ctx) {
			return "Varsayım: " + ctx + " bağlamına uygun içerik."
		}
		return "Varsayım: Proje bağlamına uygun somut içerik."
	}
}
