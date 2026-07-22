package usecase

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerationGate_InflightTracking(t *testing.T) {
	gate := NewGenerationGate()
	wsID := uuid.New()
	ctx := context.Background()

	assert.False(t, gate.HasInflight())
	assert.Equal(t, 0, gate.InflightCount())

	ok, err := gate.TryBegin(ctx, wsID)
	require.NoError(t, err)
	require.True(t, ok)
	assert.True(t, gate.HasInflight())
	assert.Equal(t, 1, gate.InflightCount())

	ok, err = gate.TryBegin(ctx, wsID)
	require.NoError(t, err)
	assert.False(t, ok)

	gate.End(ctx, wsID)
	assert.False(t, gate.HasInflight())
}
