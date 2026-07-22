package seedcatalog_test

import (
	"testing"

	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/seedcatalog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoadStudioDefault_UniqueKeysAndCount(t *testing.T) {
	t.Parallel()
	questions, err := seedcatalog.LoadStudioDefault()
	require.NoError(t, err)
	assert.Equal(t, 117, len(questions))

	seen := map[string]struct{}{}
	for _, q := range questions {
		require.NotEmpty(t, q.Key)
		require.NotEmpty(t, q.Category)
		require.NotEmpty(t, q.Title)
		require.NotEmpty(t, q.Type)
		require.Greater(t, q.Order, 0)
		_, exists := seen[q.Key]
		assert.False(t, exists, "duplicate key %s", q.Key)
		seen[q.Key] = struct{}{}
	}
}

func TestVisibilityRulesJSON(t *testing.T) {
	t.Parallel()
	assert.Equal(t, `{}`, string(seedcatalog.VisibilityRulesJSON(nil)))
	assert.Equal(t, `{}`, string(seedcatalog.VisibilityRulesJSON([]byte("null"))))
	raw := []byte(`{"show_if":{"question_key":"uses_ai","op":"eq","value":true}}`)
	assert.Equal(t, string(raw), string(seedcatalog.VisibilityRulesJSON(raw)))
}

func TestLoadStudioDefault_IsIdempotent(t *testing.T) {
	t.Parallel()
	first, err := seedcatalog.LoadStudioDefault()
	require.NoError(t, err)
	second, err := seedcatalog.LoadStudioDefault()
	require.NoError(t, err)
	require.Equal(t, len(first), len(second))
	for i := range first {
		assert.Equal(t, first[i].Key, second[i].Key)
		assert.Equal(t, first[i].Order, second[i].Order)
	}
}
