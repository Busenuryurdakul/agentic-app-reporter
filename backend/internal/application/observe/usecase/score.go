package usecase

import "math"

// CalculateReadinessScore computes the Phase 4 deterministic readiness score.
//
// Formula (0–100):
//
//	round(0.4 * profileOverall + 0.4 * questionnairePct + 0.2 * documentBonus)
//
// where:
//   - profileOverall is CompletenessUseCase overall (0–100)
//   - questionnairePct is 100 * answered / total for required, active, visible
//     questions; when total is 0 the component is 100 (vacuously complete)
//   - documentBonus is 100 when succeededDocumentCount > 0, else 0
func CalculateReadinessScore(profileOverall, answeredRequired, totalRequired, succeededDocumentCount int) (overall int, components struct {
	Profile       int
	Questionnaire int
	Documents     int
}) {
	profile := clampScore(profileOverall)
	questionnaire := questionnairePct(answeredRequired, totalRequired)
	documents := 0
	if succeededDocumentCount > 0 {
		documents = 100
	}

	overall = int(math.Round(0.4*float64(profile) + 0.4*float64(questionnaire) + 0.2*float64(documents)))
	overall = clampScore(overall)
	components.Profile = profile
	components.Questionnaire = questionnaire
	components.Documents = documents
	return overall, components
}

func questionnairePct(answered, total int) int {
	if total <= 0 {
		return 100
	}
	if answered < 0 {
		answered = 0
	}
	if answered > total {
		answered = total
	}
	return (answered * 100) / total
}

func clampScore(v int) int {
	if v < 0 {
		return 0
	}
	if v > 100 {
		return 100
	}
	return v
}
