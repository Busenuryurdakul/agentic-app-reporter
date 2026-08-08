package usecase

import (
	"encoding/json"
	"strings"
)

// readableValueTR maps questionnaire enum values to Turkish descriptions for LLM prompts.
// DB values are unchanged; only prompt rendering uses this map.
var readableValueTR = map[string]string{
	"rest":             "REST API",
	"graphql":          "GraphQL API",
	"grpc":             "gRPC API",
	"websocket":        "WebSocket",
	"webhook":          "Webhook",
	"github_actions":   "GitHub Actions tabanlı CI/CD",
	"gitlab_ci":        "GitLab CI tabanlı CI/CD",
	"jenkins":          "Jenkins tabanlı CI/CD",
	"azure_devops":     "Azure DevOps tabanlı CI/CD",
	"local":            "Yerel geliştirme ortamı",
	"dev":              "Geliştirme ortamı",
	"staging":          "Staging ortamı",
	"prod":             "Production ortamı",
	"preview":          "Preview ortamı",
	"stdout":           "Stdout loglama (konteyner dostu)",
	"centralized":      "Merkezi log toplama",
	"both":             "Stdout ve merkezi log toplama",
	"minimal":          "Minimal loglama",
	"github":           "GitHub",
	"gitlab":           "GitLab",
	"bitbucket":        "Bitbucket",
	"azure_repos":      "Azure Repos",
	"trunk_based":      "Kısa ömürlü dalların ana dala sık birleştirildiği trunk-based geliştirme",
	"gitflow":          "GitFlow dal modeli",
	"github_flow":      "GitHub Flow",
	"release_branches": "Release branch modeli",
	"web_app":          "Web uygulaması",
	"mobile_app":       "Mobil uygulama",
	"api_service":      "API servisi",
	"internal_tool":    "Kurumsal iç araç",
	"monolith":         "Monolith mimari",
	"modular_monolith": "Modüler monolith mimari",
	"microservices":    "Mikroservis mimarisi",
	"postgresql":       "PostgreSQL",
	"mysql":            "MySQL",
	"rbac":             "Rol tabanlı erişim kontrolü (RBAC)",
	"vault":            "HashiCorp Vault ile secret yönetimi",
	"cloud":            "Bulut barındırma",
	"hybrid":           "Hibrit barındırma",
	"on_prem":          "Şirket içi (on-prem) barındırma",
}

func formatAnswerForPrompt(lang, questionKey string, raw json.RawMessage) string {
	if len(raw) == 0 || string(raw) == "null" {
		return label(lang, "(cevap yok)", "(no answer)")
	}

	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
		return strings.TrimSpace(string(raw))
	}
	return formatAnyForPrompt(lang, v)
}

func formatAnyForPrompt(lang string, v any) string {
	switch typed := v.(type) {
	case bool:
		if typed {
			return label(lang, "Evet", "Yes")
		}
		return label(lang, "Hayır", "No")
	case float64:
		if typed == float64(int64(typed)) {
			return strings.TrimSpace(strings.TrimSuffix(strings.TrimSuffix(
				strings.TrimSpace(formatFloat(typed)), ".0"), ".0"))
		}
		return formatFloat(typed)
	case string:
		return readableEnum(lang, typed)
	case []any:
		parts := make([]string, 0, len(typed))
		for _, item := range typed {
			if s, ok := item.(string); ok {
				parts = append(parts, readableEnum(lang, s))
			} else {
				parts = append(parts, formatAnyForPrompt(lang, item))
			}
		}
		return strings.Join(parts, "; ")
	default:
		return compactJSON(mustMarshal(v))
	}
}

func readableEnum(lang, value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if mapped, ok := readableValueTR[value]; ok {
		if lang == "en" {
			return value
		}
		return mapped
	}
	if strings.Contains(value, "_") && !isAllowedTechnicalToken(value) {
		return humanizeSnakeCase(value)
	}
	return value
}

func humanizeSnakeCase(s string) string {
	parts := strings.Split(s, "_")
	for i, p := range parts {
		if p == "" {
			continue
		}
		parts[i] = strings.ToUpper(p[:1]) + strings.ToLower(p[1:])
	}
	return strings.Join(parts, " ")
}

func isAllowedTechnicalToken(s string) bool {
	allowed := map[string]struct{}{
		"ci_cd": {}, "api": {}, "oauth2": {}, "oidc": {},
	}
	_, ok := allowed[strings.ToLower(s)]
	return ok
}

func formatFloat(f float64) string {
	b, _ := json.Marshal(f)
	return strings.Trim(string(b), `"`)
}

func mustMarshal(v any) json.RawMessage {
	b, err := json.Marshal(v)
	if err != nil {
		return json.RawMessage(`{}`)
	}
	return b
}
