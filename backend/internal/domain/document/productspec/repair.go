package productspec

import (
	"encoding/json"
	"fmt"
	"strings"
)

const maxRepairAttempts = 2

// BuildRepairUserPrompt creates a targeted repair prompt for invalid structured JSON.
func BuildRepairUserPrompt(language string, currentJSON string, validation ValidationResult) string {
	var b strings.Builder
	if language == "en" {
		b.WriteString("The following JSON fields are invalid:\n\n")
	} else {
		b.WriteString("Aşağıdaki JSON alanları geçersizdir:\n\n")
	}
	for _, e := range validation.Errors {
		b.WriteString("- ")
		b.WriteString(e.Path)
		b.WriteString(": ")
		b.WriteString(e.Message)
		b.WriteString("\n")
	}
	b.WriteString("\n")
	if language == "en" {
		b.WriteString("Return ONLY the corrected FULL JSON object.\n")
		b.WriteString("Do not change valid fields.\n")
		b.WriteString("Do not wrap in markdown code blocks.\n\n")
	} else {
		b.WriteString("Yalnızca düzeltilmiş TAM JSON nesnesini döndür.\n")
		b.WriteString("Geçerli alanları değiştirme.\n")
		b.WriteString("Markdown kod bloğu kullanma.\n")
		b.WriteString("Şema örneğindeki yer tutucu metinleri (ör. \"Saglanan deger\", \"Is hedefi\", \"Ozellik basligi\") kullanma; bağlama uygun somut Türkçe içerik yaz.\n\n")
	}
	b.WriteString("Current JSON:\n")
	b.WriteString(strings.TrimSpace(currentJSON))
	return b.String()
}

// BuildRepairSystemPrompt returns the repair system prompt.
func BuildRepairSystemPrompt(language string) string {
	if language == "en" {
		return "You fix invalid Product Spec JSON. Output valid JSON only."
	}
	return "Geçersiz Product Spec JSON'unu düzelt. Yalnızca geçerli JSON döndür."
}

// SpecJSON returns compact JSON for a structured spec (for repair prompts).
func SpecJSON(spec *StructuredSpec) string {
	if spec == nil {
		return "{}"
	}
	b, err := json.Marshal(spec)
	if err != nil {
		return "{}"
	}
	return string(b)
}

// BuildParseRepairUserPrompt asks the model to re-emit parseable full JSON.
func BuildParseRepairUserPrompt(language, lastRaw string) string {
	snippet := strings.TrimSpace(lastRaw)
	if len(snippet) > 1200 {
		snippet = snippet[:1200] + "…"
	}
	if language == "en" {
		return "Previous output was invalid or truncated JSON:\n" + snippet + "\n\nReturn ONLY a complete valid JSON object for the Product Spec schema. Every array item must be a quoted string."
	}
	return "Önceki çıktı geçersiz veya kesik JSON idi:\n" + snippet + "\n\nYalnızca Product Spec şemasına uygun TAM ve geçerli JSON nesnesi döndür. Dizi öğeleri çift tırnaklı string olmalı."
}

// FormatValidationSummary compresses validation errors for error_message storage.
func FormatValidationSummary(validation ValidationResult) string {
	if validation.Valid {
		return ""
	}
	var parts []string
	for _, e := range validation.Errors {
		if len(parts) >= 8 {
			parts = append(parts, fmt.Sprintf("...+%d more", len(validation.Errors)-8))
			break
		}
		parts = append(parts, e.Path+": "+e.Code)
	}
	return "structured_validation_failed: " + strings.Join(parts, "; ")
}
