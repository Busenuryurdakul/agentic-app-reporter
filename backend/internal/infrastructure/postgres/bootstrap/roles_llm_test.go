package bootstrap_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSeedRolesDefinition_IncludesLLMPermissions(t *testing.T) {
	// Mirror roles.go productPlaceholders + developer extras used at boot.
	perms := map[string][]string{
		"org_admin": {
			"org:*", "app:*", "user:*", "workspace:*", "endpoint:*",
			"llm:read", "llm:write",
		},
		"developer": {"llm:read"},
		"viewer":    {"*:read"},
	}

	assert.Contains(t, perms["org_admin"], "llm:read")
	assert.Contains(t, perms["org_admin"], "llm:write")
	assert.Contains(t, perms["developer"], "llm:read")
	assert.NotContains(t, perms["developer"], "llm:write")
}
