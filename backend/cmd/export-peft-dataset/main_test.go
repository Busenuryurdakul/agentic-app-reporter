package main

import (
	"testing"

	exportdto "github.com/masterfabric-go/masterfabric/internal/application/datasetexport/dto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseSince(t *testing.T) {
	t.Parallel()
	ts, err := parseSince("2026-07-01")
	require.NoError(t, err)
	assert.False(t, ts.IsZero())
	_, err = parseSince("not-a-date")
	require.Error(t, err)
}

func TestParseDedupeMode(t *testing.T) {
	t.Parallel()
	mode, err := parseDedupeMode("workspace-latest")
	require.NoError(t, err)
	assert.Equal(t, exportdto.DedupeWorkspaceLatest, mode)
	_, err = parseDedupeMode("invalid")
	require.Error(t, err)
}

func TestRun_MissingOrgID(t *testing.T) {
	code := run([]string{})
	assert.Equal(t, 1, code)
}
