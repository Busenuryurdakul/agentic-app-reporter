package productspec

import (
	"regexp"
	"strconv"
	"strings"
)

var (
	placeholderRE = regexp.MustCompile(`(?i)(?:^|\s)(?:-önlem-|TODO\b|TBD\b|placeholder|\[\s*\]|\(\s*\))`)
	cjkRE         = regexp.MustCompile(`[\p{Han}\p{Hangul}\p{Hiragana}\p{Katakana}\p{Cyrillic}]`)
)

// ValidateStructured checks required fields, placeholders, and foreign scripts.
func ValidateStructured(spec *StructuredSpec) ValidationResult {
	if spec == nil {
		return ValidationResult{
			Valid: false,
			Errors: []ValidationError{{
				Path: "root", Code: "missing_root", Message: "JSON kök nesnesi boş",
			}},
		}
	}

	var errors []ValidationError
	emptyStrings := 0
	emptyArrays := 0
	requiredChecks := 0
	passedChecks := 0

	checkString := func(path, value string) {
		requiredChecks++
		v := strings.TrimSpace(value)
		if v == "" {
			emptyStrings++
			errors = append(errors, ValidationError{Path: path, Code: "empty_string", Message: "Zorunlu metin alanı boş"})
			return
		}
		if hasPlaceholder(v) {
			errors = append(errors, ValidationError{Path: path, Code: "placeholder", Message: "Placeholder veya taslak ifade içeriyor"})
			return
		}
		if hasForeignScript(v) {
			errors = append(errors, ValidationError{Path: path, Code: "foreign_script", Message: "Yabancı script karakteri içeriyor"})
			return
		}
		passedChecks++
	}

	checkOptionalSlice := func(path string, items []string) {
		for i, item := range items {
			itemPath := path + "[" + strconv.Itoa(i) + "]"
			if strings.TrimSpace(item) == "" {
				emptyStrings++
				errors = append(errors, ValidationError{Path: itemPath, Code: "empty_string", Message: "Dizi öğesi boş"})
				continue
			}
			if hasPlaceholder(item) {
				errors = append(errors, ValidationError{Path: itemPath, Code: "placeholder", Message: "Placeholder içeriyor"})
			}
			if hasForeignScript(item) {
				errors = append(errors, ValidationError{Path: itemPath, Code: "foreign_script", Message: "Yabancı script içeriyor"})
			}
		}
	}

	checkRequiredSlice := func(path string, items []string, minLen int) {
		requiredChecks++
		if len(items) < minLen {
			emptyArrays++
			errors = append(errors, ValidationError{Path: path, Code: "empty_array", Message: "Dizi en az bir öğe içermeli"})
			return
		}
		checkOptionalSlice(path, items)
		passedChecks++
	}

	checkString("summary.project_name", spec.Summary.ProjectName)
	checkString("summary.description", spec.Summary.Description)
	checkString("summary.problem", spec.Summary.Problem)
	checkString("summary.value_proposition", spec.Summary.ValueProposition)
	checkRequiredSlice("goals.business_goals", spec.Goals.BusinessGoals, 1)
	checkRequiredSlice("goals.success_metrics", spec.Goals.SuccessMetrics, 1)

	requiredChecks++
	if len(spec.UsersAndRoles) < 1 {
		emptyArrays++
		errors = append(errors, ValidationError{Path: "users_and_roles", Code: "empty_array", Message: "En az bir rol tanımlanmalı"})
	} else {
		passedChecks++
		for i, role := range spec.UsersAndRoles {
			prefix := "users_and_roles[" + strconv.Itoa(i) + "]"
			checkString(prefix+".role", role.Role)
			checkRequiredSlice(prefix+".responsibilities", role.Responsibilities, 1)
			checkRequiredSlice(prefix+".main_needs", role.MainNeeds, 1)
		}
	}

	requiredChecks++
	if len(spec.FunctionalRequirements) < 1 {
		emptyArrays++
		errors = append(errors, ValidationError{Path: "functional_requirements", Code: "empty_array", Message: "En az bir fonksiyonel gereksinim gerekli"})
	} else {
		passedChecks++
		for i, fr := range spec.FunctionalRequirements {
			prefix := "functional_requirements[" + strconv.Itoa(i) + "]"
			checkString(prefix+".title", fr.Title)
			checkString(prefix+".description", fr.Description)
			checkString(prefix+".priority", fr.Priority)
			checkRequiredSlice(prefix+".acceptance_criteria", fr.AcceptanceCriteria, 1)
		}
	}

	nfr := spec.NonFunctionalRequirements
	nfrCount := len(nfr.Performance) + len(nfr.Availability) + len(nfr.Scalability) +
		len(nfr.Accessibility) + len(nfr.Observability)
	requiredChecks++
	if nfrCount < 1 {
		emptyArrays++
		errors = append(errors, ValidationError{Path: "non_functional_requirements", Code: "empty_object", Message: "En az bir fonksiyonel olmayan gereksinim gerekli"})
	} else {
		passedChecks++
		checkOptionalSlice("non_functional_requirements.performance", nfr.Performance)
		checkOptionalSlice("non_functional_requirements.availability", nfr.Availability)
		checkOptionalSlice("non_functional_requirements.scalability", nfr.Scalability)
		checkOptionalSlice("non_functional_requirements.accessibility", nfr.Accessibility)
		checkOptionalSlice("non_functional_requirements.observability", nfr.Observability)
	}

	checkString("architecture.style", spec.Architecture.Style)
	checkRequiredSlice("architecture.components", spec.Architecture.Components, 1)
	checkString("architecture.deployment", spec.Architecture.Deployment)
	checkOptionalSlice("architecture.integrations", spec.Architecture.Integrations)

	requiredChecks++
	if len(spec.DataModel) < 1 {
		emptyArrays++
		errors = append(errors, ValidationError{Path: "data_model", Code: "empty_array", Message: "En az bir veri varlığı gerekli"})
	} else {
		passedChecks++
		for i, ent := range spec.DataModel {
			prefix := "data_model[" + strconv.Itoa(i) + "]"
			checkString(prefix+".entity", ent.Entity)
			checkString(prefix+".purpose", ent.Purpose)
			checkRequiredSlice(prefix+".important_fields", ent.ImportantFields, 1)
			checkOptionalSlice(prefix+".relations", ent.Relations)
		}
	}

	checkString("security_and_privacy.authentication", spec.SecurityAndPrivacy.Authentication)
	checkString("security_and_privacy.authorization", spec.SecurityAndPrivacy.Authorization)
	checkRequiredSlice("security_and_privacy.data_protection", spec.SecurityAndPrivacy.DataProtection, 1)
	checkOptionalSlice("security_and_privacy.audit_logging", spec.SecurityAndPrivacy.AuditLogging)
	checkRequiredSlice("security_and_privacy.compliance", spec.SecurityAndPrivacy.Compliance, 1)

	requiredChecks++
	if len(spec.Roadmap) < 1 {
		emptyArrays++
		errors = append(errors, ValidationError{Path: "roadmap", Code: "empty_array", Message: "En az bir yol haritası fazı gerekli"})
	} else {
		passedChecks++
		for i, phase := range spec.Roadmap {
			prefix := "roadmap[" + strconv.Itoa(i) + "]"
			checkString(prefix+".phase", phase.Phase)
			checkRequiredSlice(prefix+".scope", phase.Scope, 1)
			checkRequiredSlice(prefix+".exit_criteria", phase.ExitCriteria, 1)
		}
	}

	coverage := 0.0
	if requiredChecks > 0 {
		coverage = float64(passedChecks) / float64(requiredChecks)
	}

	return ValidationResult{
		Valid:                    len(errors) == 0,
		Errors:                   errors,
		RequiredFieldCoverage:    coverage,
		EmptyRequiredArrayCount:  emptyArrays,
		EmptyRequiredStringCount: emptyStrings,
	}
}

func hasPlaceholder(s string) bool {
	t := strings.TrimSpace(s)
	if t == "..." || t == "-" || t == "TBD" || t == "TODO" {
		return true
	}
	return placeholderRE.MatchString(t) || strings.Contains(t, "...")
}

func hasForeignScript(s string) bool {
	return cjkRE.MatchString(s)
}
