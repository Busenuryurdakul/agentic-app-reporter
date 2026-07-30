package usecase_test

import (
	"testing"

	"github.com/masterfabric-go/masterfabric/internal/application/iam/usecase"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalizeUserAPIKeyScopes(t *testing.T) {
	t.Parallel()

	scopes, err := usecase.NormalizeUserAPIKeyScopes(nil)
	require.NoError(t, err)
	assert.Equal(t, model.DefaultUserAPIKeyScopes, scopes)

	_, err = usecase.NormalizeUserAPIKeyScopes([]string{"mcp:admin"})
	require.Error(t, err)

	custom, err := usecase.NormalizeUserAPIKeyScopes([]string{model.ScopeMCPProfile})
	require.NoError(t, err)
	assert.Equal(t, []string{model.ScopeMCPProfile}, custom)
}
