package visibility_test

import (
	"testing"

	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/seedcatalog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// legacyTitleKeyPairs mirrors migration 00015 backfill mappings and must stay
// unique so UNIQUE(set_id, key) cannot fail during upgrade.
var legacyTitleKeyPairs = []struct {
	category string
	title    string
	key      string
}{
	{"Genel", "Proje adı nedir?", "project_name"},
	{"Genel", "Projeyi kısaca açıklayın.", "project_summary"},
	{"Genel", "Proje şu anda hangi aşamada?", "project_stage"},
	{"Frontend", "Hangi frontend framework'ü kullanılıyor?", "frontend_framework"},
	{"Frontend", "Stil/CSS çözümü nedir?", "styling_approach"},
	{"Frontend", "State management kütüphanesi kullanılıyor mu?", "state_management"},
	{"Backend", "Hangi backend dili/çatısı kullanılıyor?", "backend_language"},
	{"Backend", "API mimarisi nedir?", "api_styles"},
	{"Backend", "Mikroservis mimarisi kullanılıyor mu?", "architecture_style"},
	{"Veritabanı", "Birincil veritabanı nedir?", "primary_database"},
	{"Veritabanı", "Veritabanı ölçeği/beklenen veri hacmi nedir?", "data_modeling_style"},
	{"Veritabanı", "Cache katmanı kullanılıyor mu?", "secondary_datastores"},
	{"Altyapı", "Uygulama nerede barındırılıyor?", "hosting_model"},
	{"Altyapı", "Container orkestrasyonu kullanılıyor mu?", "orchestration"},
	{"Altyapı", "CI/CD aracı nedir?", "ci_cd_platform"},
	{"Yapay Zeka", "Projede yapay zeka/LLM entegrasyonu var mı?", "uses_ai"},
	{"Yapay Zeka", "Kullanılan model sağlayıcı(lar)ı nedir?", "llm_providers"},
	{"Yapay Zeka", "AI özellikleri hangi amaçla kullanılıyor?", "ai_use_cases"},
	{"Geliştirme Standartları", "Kod stil kılavuzu/linter kullanılıyor mu?", "lint_format_tooling"},
	{"Geliştirme Standartları", "Branch stratejisi nedir?", "branching_strategy"},
	{"Geliştirme Standartları", "Code review süreci zorunlu mu?", "code_review_required"},
	{"Güvenlik", "Kimlik doğrulama yöntemi nedir?", "auth_methods"},
	{"Güvenlik", "Hassas veriler nasıl korunuyor?", "secrets_management"},
	{"Güvenlik", "Düzenli güvenlik taraması yapılıyor mu?", "security_controls"},
	{"Test", "Hangi test türleri uygulanıyor?", "test_types"},
	{"Test", "Test coverage hedefi nedir?", "coverage_target"},
	{"Test", "Otomatik test pipeline'ı var mı?", "ci_tests_required"},
	{"Dağıtım", "Dağıtım sıklığı nedir?", "release_strategy"},
	{"Dağıtım", "Blue-green veya canary deployment kullanılıyor mu?", "environments"},
	{"Dağıtım", "Rollback stratejisi nedir?", "rollback_strategy"},
	{"Harici Araçlar", "Kullanılan proje yönetim aracı nedir?", "external_integrations"},
	{"Harici Araçlar", "Hangi izleme/monitoring araçları kullanılıyor?", "metrics_stack"},
	{"Harici Araçlar", "Üçüncü parti entegrasyonlar var mı?", "integration_auth_model"},
	{"MCP Entegrasyonları", "MCP (Model Context Protocol) sunucuları kullanılıyor mu?", "uses_mcp"},
	{"MCP Entegrasyonları", "Hangi MCP sunucuları entegre edildi?", "mcp_servers_list"},
	{"MCP Entegrasyonları", "MCP entegrasyonu hangi iş akışlarını destekliyor?", "automation_workflows"},
}

func TestLegacyBackfillKeysExistInCatalog(t *testing.T) {
	t.Parallel()
	questions, err := seedcatalog.LoadStudioDefault()
	require.NoError(t, err)
	catalogKeys := map[string]struct{}{}
	for _, q := range questions {
		catalogKeys[q.Key] = struct{}{}
	}
	for _, row := range legacyTitleKeyPairs {
		_, ok := catalogKeys[row.key]
		assert.True(t, ok, "backfill key %s missing from catalog — answers would not rematch", row.key)
	}
}
