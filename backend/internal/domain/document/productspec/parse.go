package productspec

import (
	"encoding/json"
	"strings"
)

// ExtractJSON isolates a JSON object from raw LLM output.
func ExtractJSON(raw string) (string, error) {
	s := strings.TrimSpace(raw)
	if s == "" {
		return "", errTruncatedJSON
	}

	// Strip markdown code fences.
	if strings.HasPrefix(s, "```") {
		lines := strings.Split(s, "\n")
		if len(lines) >= 2 {
			start := 1
			end := len(lines)
			if strings.HasPrefix(strings.TrimSpace(lines[len(lines)-1]), "```") {
				end = len(lines) - 1
			}
			s = strings.TrimSpace(strings.Join(lines[start:end], "\n"))
		}
	}

	start := strings.Index(s, "{")
	if start < 0 {
		return "", errNoJSONObject
	}
	s = s[start:]

	depth := 0
	inString := false
	escape := false
	lastClose := -1
	for i, r := range s {
		if inString {
			if escape {
				escape = false
				continue
			}
			if r == '\\' {
				escape = true
				continue
			}
			if r == '"' {
				inString = false
			}
			continue
		}
		switch r {
		case '"':
			inString = true
		case '{':
			depth++
		case '}':
			depth--
			if depth == 0 {
				lastClose = i
			}
		}
	}
	if lastClose < 0 || depth != 0 {
		if closed, ok := tryCloseTruncatedJSON(s); ok {
			return closed, nil
		}
		return "", errTruncatedJSON
	}
	return s[:lastClose+1], nil
}

func tryCloseTruncatedJSON(s string) (string, bool) {
	s = strings.TrimSpace(s)
	if !strings.HasPrefix(s, "{") {
		return "", false
	}
	depthObj := 0
	depthArr := 0
	inString := false
	escape := false
	for _, r := range s {
		if inString {
			if escape {
				escape = false
				continue
			}
			if r == '\\' {
				escape = true
				continue
			}
			if r == '"' {
				inString = false
			}
			continue
		}
		switch r {
		case '"':
			inString = true
		case '{':
			depthObj++
		case '}':
			if depthObj > 0 {
				depthObj--
			}
		case '[':
			depthArr++
		case ']':
			if depthArr > 0 {
				depthArr--
			}
		}
	}
	if depthObj == 0 && depthArr == 0 {
		return s, true
	}
	var b strings.Builder
	b.WriteString(s)
	for depthArr > 0 {
		b.WriteString("]")
		depthArr--
	}
	for depthObj > 0 {
		b.WriteString("}")
		depthObj--
	}
	closed := b.String()
	var probe any
	if err := json.Unmarshal([]byte(closed), &probe); err != nil {
		return "", false
	}
	return closed, true
}

// ParseStructured parses and unmarshals structured Product Spec JSON.
func ParseStructured(raw string) (*StructuredSpec, error) {
	jsonText, err := ExtractJSON(raw)
	if err != nil {
		return nil, err
	}
	jsonText = normalizeJSONText(jsonText)
	var spec StructuredSpec
	if err := json.Unmarshal([]byte(jsonText), &spec); err != nil {
		if spec2, err2 := parseStructuredFlexible(jsonText); err2 == nil {
			return spec2, nil
		}
		return nil, errInvalidJSON
	}
	return &spec, nil
}

func normalizeJSONText(s string) string {
	s = strings.ReplaceAll(s, "\u201c", `"`)
	s = strings.ReplaceAll(s, "\u201d", `"`)
	s = strings.ReplaceAll(s, "\u2018", `'`)
	s = strings.ReplaceAll(s, "\u2019", `'`)
	return s
}

func parseStructuredFlexible(jsonText string) (*StructuredSpec, error) {
	var generic map[string]any
	if err := json.Unmarshal([]byte(jsonText), &generic); err != nil {
		return nil, err
	}
	coerced := coerceStringSlices(generic)
	b, err := json.Marshal(coerced)
	if err != nil {
		return nil, err
	}
	var spec StructuredSpec
	if err := json.Unmarshal(b, &spec); err != nil {
		return nil, err
	}
	return &spec, nil
}

var (
	errTruncatedJSON = &parseError{code: "truncated_json", msg: "JSON kesik veya dengesiz"}
	errNoJSONObject  = &parseError{code: "no_json_object", msg: "JSON nesnesi bulunamadı"}
	errInvalidJSON   = &parseError{code: "invalid_json", msg: "JSON parse edilemedi"}
)

type parseError struct {
	code string
	msg  string
}

func (e *parseError) Error() string { return e.msg }
