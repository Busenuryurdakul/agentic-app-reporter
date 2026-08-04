package productspec

// ExampleJSONSchema returns a minimal schema hint for LLM prompts (no placeholder tokens).
func ExampleJSONSchema() string {
	return `{
  "summary": {"project_name": "Ornek Urun", "description": "Kisa proje aciklamasi", "problem": "Cozulecek ana problem", "value_proposition": "Saglanan deger"},
  "goals": {"business_goals": ["Is hedefi"], "success_metrics": ["Olculen basari metrigi"]},
  "users_and_roles": [{"role": "Rol adi", "responsibilities": ["Sorumluluk"], "main_needs": ["Temel ihtiyac"]}],
  "functional_requirements": [{"id": "FR-001", "title": "Ozellik basligi", "description": "Gereksinim aciklamasi", "priority": "must", "acceptance_criteria": ["Kabul kriteri"]}],
  "non_functional_requirements": {"performance": ["Performans hedefi"], "availability": [], "scalability": [], "accessibility": [], "observability": []},
  "architecture": {"style": "Mimari stil", "components": ["Bilesen"], "integrations": [], "deployment": "Deployment modeli"},
  "data_model": [{"entity": "Varlik", "purpose": "Amac", "important_fields": ["alan1"], "relations": []}],
  "security_and_privacy": {"authentication": "Kimlik dogrulama", "authorization": "Yetkilendirme", "data_protection": ["Veri koruma"], "audit_logging": [], "compliance": ["KVKK"]},
  "roadmap": [{"phase": "MVP", "scope": ["Kapsam maddesi"], "exit_criteria": ["Cikis kriteri"]}]
}`
}

// GenerationLimitsText returns concise count limits for structured prompts.
func GenerationLimitsText(lang string) string {
	if lang == "en" {
		return `- Produce at most 4 functional requirements (FR-001 through FR-004 only).
- Produce at most 3 user roles, 3 data entities, and 2 roadmap phases.
- Keep each text value to at most 2 sentences; avoid repetition.
- functional_requirements must be a JSON array; each requirement is a separate object.
- Do not append extra items beyond these limits.`
	}
	return `- En fazla 4 fonksiyonel gereksinim üret (yalnızca FR-001..FR-004).
- En fazla 3 kullanıcı rolü, 3 veri modeli varlığı ve 2 yol haritası fazı üret.
- Her metin değeri en fazla 2 cümle olsun; tekrarlayan ifade kullanma.
- functional_requirements bir JSON dizisi olmalı; her gereksinim ayrı nesne.
- Bu sınırların dışına çıkma; fazladan öğe ekleme.`
}
