package productspec

import "strings"

// schemaExampleEchoValues are literal template strings from ExampleJSONSchema that must not
// appear verbatim in model output (they indicate prompt/schema echo, not real content).
var schemaExampleEchoValues = []string{
	"Ornek Urun",
	"Kisa proje aciklamasi",
	"Cozulecek ana problem",
	"Saglanan deger",
	"Is hedefi",
	"Olculen basari metrigi",
	"Rol adi",
	"Ozellik basligi",
	"Gereksinim aciklamasi",
	"Kabul kriteri",
	"Performans hedefi",
	"Bilesen",
	"Deployment modeli",
	"Varlik",
	"Amac",
	"alan1",
	"Kimlik dogrulama",
	"Yetkilendirme",
	"Veri koruma",
	"Kapsam maddesi",
	"Cikis kriteri",
}

func IsSchemaExampleEcho(s string) bool {
	return isSchemaExampleEcho(s)
}

func isSchemaExampleEcho(s string) bool {
	t := strings.TrimSpace(s)
	if t == "" {
		return false
	}
	lower := strings.ToLower(t)
	for _, echo := range schemaExampleEchoValues {
		if lower == strings.ToLower(echo) {
			return true
		}
	}
	// Common partial echoes from training/export artifacts.
	if lower == "sorumluluk" || lower == "temel ihtiyac" || lower == "mimari stil" {
		return true
	}
	return false
}
