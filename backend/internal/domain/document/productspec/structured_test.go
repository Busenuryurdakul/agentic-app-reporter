package productspec_test

import (
	"strings"
	"testing"

	"github.com/masterfabric-go/masterfabric/internal/domain/document/productspec"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseStructured_ValidJSON(t *testing.T) {
	raw := productspec.SampleValidSpecJSON()
	spec, err := productspec.ParseStructured(raw)
	require.NoError(t, err)
	assert.Equal(t, "Demo Platform", spec.Summary.ProjectName)
}

func TestParseStructured_CodeFence(t *testing.T) {
	raw := "```json\n" + productspec.SampleValidSpecJSON() + "\n```"
	spec, err := productspec.ParseStructured(raw)
	require.NoError(t, err)
	assert.NotEmpty(t, spec.Summary.Description)
}

func TestParseStructured_RejectsProseWrapper(t *testing.T) {
	raw := "Here is JSON:\n" + productspec.SampleValidSpecJSON()
	spec, err := productspec.ParseStructured(raw)
	require.NoError(t, err)
	assert.NotNil(t, spec)
}

func TestParseStructured_TruncatedJSON(t *testing.T) {
	raw := `{"summary":{"project_name":"Kesik`
	_, err := productspec.ParseStructured(raw)
	assert.Error(t, err)
}

func TestParseStructured_AutoCloseTruncatedJSON(t *testing.T) {
	raw := `{"summary":{"project_name":"X","description":"Aciklama","problem":"P","value_proposition":"V"},"goals":{"business_goals":["H"],"success_metrics":["M"]}`
	spec, err := productspec.ParseStructured(raw)
	require.NoError(t, err)
	assert.Equal(t, "X", spec.Summary.ProjectName)
}

func TestValidateStructured_MissingFieldReportsPath(t *testing.T) {
	spec := productspec.SampleValidSpec()
	spec.Summary.ProjectName = ""
	result := productspec.ValidateStructured(spec)
	assert.False(t, result.Valid)
	assert.True(t, containsPath(result.Errors, "summary.project_name"))
}

func TestValidateStructured_EmptyArrayRejected(t *testing.T) {
	spec := productspec.SampleValidSpec()
	spec.Goals.BusinessGoals = []string{}
	result := productspec.ValidateStructured(spec)
	assert.False(t, result.Valid)
	assert.True(t, containsPath(result.Errors, "goals.business_goals"))
}

func TestValidateStructured_PlaceholderRejected(t *testing.T) {
	spec := productspec.SampleValidSpec()
	spec.Roadmap[0].ExitCriteria = []string{"..."}
	result := productspec.ValidateStructured(spec)
	assert.False(t, result.Valid)
}

func TestSanitizeStructured_ReplacesSchemaEcho(t *testing.T) {
	spec := productspec.SampleValidSpec()
	spec.Summary.ValueProposition = "Saglanan deger"
	replaced := productspec.SanitizeStructured(spec)
	assert.Equal(t, 1, replaced)
	assert.False(t, productspec.IsSchemaExampleEcho(spec.Summary.ValueProposition))
	result := productspec.ValidateStructured(spec)
	assert.True(t, result.Valid)
}

func TestValidateStructured_CJKRejected(t *testing.T) {
	spec := productspec.SampleValidSpec()
	spec.Summary.Description = "测试 metin"
	result := productspec.ValidateStructured(spec)
	assert.False(t, result.Valid)
}

func TestValidateStructured_AllowsTechnicalLatin(t *testing.T) {
	spec := productspec.SampleValidSpec()
	spec.Architecture.Integrations = []string{"REST API ve PostgreSQL"}
	result := productspec.ValidateStructured(spec)
	assert.True(t, result.Valid)
}

func TestRenderMarkdown_NineHeadings(t *testing.T) {
	md, err := productspec.RenderMarkdown(productspec.SampleValidSpec(), "tr")
	require.NoError(t, err)
	headings := productspec.StructuredHeadings("tr")
	for _, h := range headings {
		assert.Contains(t, md, h)
	}
	assert.True(t, strings.HasPrefix(md, productspec.StructuredMarkdownPrefix))
}

func TestRenderMarkdown_NoEmptyBullets(t *testing.T) {
	md, err := productspec.RenderMarkdown(productspec.SampleValidSpec(), "tr")
	require.NoError(t, err)
	assert.NotContains(t, md, "- ...")
	assert.NotContains(t, md, "- \n")
}

func TestRenderMarkdown_NoSnakeCaseKeys(t *testing.T) {
	md, err := productspec.RenderMarkdown(productspec.SampleValidSpec(), "tr")
	require.NoError(t, err)
	assert.NotContains(t, md, "business_goals")
	assert.NotContains(t, md, "exit_criteria")
}

func TestRenderMarkdown_Deterministic(t *testing.T) {
	spec := productspec.SampleValidSpec()
	a, err := productspec.RenderMarkdown(spec, "tr")
	require.NoError(t, err)
	b, err := productspec.RenderMarkdown(spec, "tr")
	require.NoError(t, err)
	assert.Equal(t, a, b)
}

func TestBuildRepairUserPrompt_IncludesInvalidPaths(t *testing.T) {
	spec := productspec.SampleValidSpec()
	spec.UsersAndRoles[0].Responsibilities = []string{}
	validation := productspec.ValidateStructured(spec)
	prompt := productspec.BuildRepairUserPrompt("tr", productspec.SpecJSON(spec), validation)
	assert.Contains(t, prompt, "users_and_roles[0].responsibilities")
	assert.Contains(t, prompt, "Yalnızca düzeltilmiş TAM JSON")
}

func containsPath(errors []productspec.ValidationError, path string) bool {
	for _, e := range errors {
		if e.Path == path {
			return true
		}
	}
	return false
}
