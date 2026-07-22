package model

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIsEmptyValue(t *testing.T) {
	t.Parallel()

	emptyCases := []struct {
		name  string
		value json.RawMessage
	}{
		{name: "absent", value: nil},
		{name: "empty bytes", value: json.RawMessage(``)},
		{name: "null", value: json.RawMessage(`null`)},
		{name: "empty string", value: json.RawMessage(`""`)},
		{name: "empty array", value: json.RawMessage(`[]`)},
		{name: "empty object", value: json.RawMessage(`{}`)},
		{name: "whitespace raw", value: json.RawMessage(`   `)},
	}
	for _, tc := range emptyCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			assert.True(t, IsEmptyValue(tc.value))
		})
	}

	nonEmptyCases := []struct {
		name  string
		value json.RawMessage
	}{
		{name: "string", value: json.RawMessage(`"Reporter"`)},
		{name: "true", value: json.RawMessage(`true`)},
		{name: "zero", value: json.RawMessage(`0`)},
		{name: "array", value: json.RawMessage(`[1]`)},
		{name: "object", value: json.RawMessage(`{"a":1}`)},
	}
	for _, tc := range nonEmptyCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			assert.False(t, IsEmptyValue(tc.value))
		})
	}
}
