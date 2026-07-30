package model_test

import (
	"testing"

	"github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	"github.com/stretchr/testify/assert"
)

func TestScopesAllowMCPTool(t *testing.T) {
	t.Parallel()

	assert.True(t, model.ScopesAllowMCPTool([]string{model.ScopeMCPProfile}, "get_me"))
	assert.False(t, model.ScopesAllowMCPTool([]string{model.ScopeMCPProfile}, "llm_health"))
	assert.True(t, model.ScopesAllowMCPTool([]string{model.ScopeMCPRead}, "workspace_readiness"))
	assert.True(t, model.ScopesAllowMCPTool(nil, "get_me"))
}
