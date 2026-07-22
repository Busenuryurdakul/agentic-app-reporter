package usecase

import (
	"encoding/json"
	"strings"
)

var sensitiveKeyFragments = []string{
	"password",
	"passwd",
	"secret",
	"token",
	"api_key",
	"apikey",
	"access_key",
	"private_key",
	"authorization",
	"bearer",
	"credential",
}

func isSensitiveKey(key string) bool {
	normalized := strings.ToLower(strings.TrimSpace(key))
	normalized = strings.ReplaceAll(normalized, "-", "_")
	normalized = strings.ReplaceAll(normalized, " ", "_")
	for _, frag := range sensitiveKeyFragments {
		if strings.Contains(normalized, frag) {
			return true
		}
	}
	return false
}

// sanitizeJSONValue redacts objects/maps with sensitive keys and leaves scalars intact.
// Used so prompts never carry obvious secrets from profile JSON sections.
func sanitizeJSONValue(raw json.RawMessage) json.RawMessage {
	if len(raw) == 0 || string(raw) == "null" {
		return json.RawMessage(`{}`)
	}

	var anyVal any
	if err := json.Unmarshal(raw, &anyVal); err != nil {
		return json.RawMessage(`{}`)
	}
	sanitized := sanitizeAny(anyVal)
	out, err := json.Marshal(sanitized)
	if err != nil {
		return json.RawMessage(`{}`)
	}
	return out
}

func sanitizeAny(v any) any {
	switch typed := v.(type) {
	case map[string]any:
		out := make(map[string]any, len(typed))
		for k, child := range typed {
			if isSensitiveKey(k) {
				out[k] = "***"
				continue
			}
			out[k] = sanitizeAny(child)
		}
		return out
	case []any:
		out := make([]any, len(typed))
		for i, child := range typed {
			out[i] = sanitizeAny(child)
		}
		return out
	default:
		return v
	}
}

func compactJSON(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	var compact json.RawMessage
	if err := json.Unmarshal(raw, &compact); err != nil {
		return string(raw)
	}
	b, err := json.Marshal(compact)
	if err != nil {
		return string(raw)
	}
	return string(b)
}
