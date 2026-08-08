package productspec

import (
	"encoding/json"
	"strings"
)

// coerceStringSlices walks decoded JSON and stringifies mixed-type string arrays.
func coerceStringSlices(v any) any {
	switch t := v.(type) {
	case map[string]any:
		out := make(map[string]any, len(t))
		for k, val := range t {
			out[k] = coerceStringSlices(val)
		}
		return out
	case []any:
		if len(t) > 0 {
			if _, ok := t[0].(string); ok {
				return t
			}
			allStringish := true
			for _, item := range t {
				switch item.(type) {
				case string, float64, bool:
				default:
					allStringish = false
				}
			}
			if allStringish {
				out := make([]any, 0, len(t))
				for _, item := range t {
					out = append(out, stringifyJSONValue(item))
				}
				return out
			}
		}
		out := make([]any, 0, len(t))
		for _, item := range t {
			out = append(out, coerceStringSlices(item))
		}
		return out
	default:
		return v
	}
}

func stringifyJSONValue(v any) string {
	switch t := v.(type) {
	case string:
		return t
	case float64:
		b, _ := json.Marshal(t)
		return strings.Trim(string(b), `"`)
	default:
		b, _ := json.Marshal(t)
		return string(b)
	}
}
