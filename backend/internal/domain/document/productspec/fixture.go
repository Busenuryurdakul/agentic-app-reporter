package productspec

import "encoding/json"

// SampleValidSpec returns a minimal valid structured spec for tests and mock provider.
func SampleValidSpec() *StructuredSpec {
	return &StructuredSpec{
		Summary: SummarySection{
			ProjectName:      "Demo Platform",
			Description:      "Kurumsal ekipler için operasyon paneli.",
			Problem:          "Dağınık süreçler ve düşük görünürlük.",
			ValueProposition: "Tek panelden izleme ve yönetim.",
		},
		Goals: GoalsSection{
			BusinessGoals:  []string{"Operasyon verimliliğini artırmak"},
			SuccessMetrics: []string{"%95 işlem 500 ms altında tamamlanmalı"},
		},
		UsersAndRoles: []UserRole{{
			Role:             "Operasyon Uzmanı",
			Responsibilities: []string{"Olayları triyaj etmek"},
			MainNeeds:        []string{"Anlık durum görünürlüğü"},
		}},
		FunctionalRequirements: []FunctionalRequirement{{
			ID:                 "FR-001",
			Title:              "Olay listesi",
			Description:        "Kullanıcı filtreli olay listesini görür.",
			Priority:           "must",
			AcceptanceCriteria: []string{"Liste 2 sn içinde yüklenmeli"},
		}},
		NonFunctionalRequirements: NonFunctionalRequirements{
			Performance:   []string{"API gecikmesi p95 400 ms altında"},
			Availability:  []string{"%99,5 aylık erişilebilirlik"},
			Observability: []string{"Merkezi log toplama"},
		},
		Architecture: ArchitectureSection{
			Style:        "Modüler monolith",
			Components:   []string{"API", "Web arayüzü"},
			Integrations: []string{"GitHub Actions"},
			Deployment:   "Kubernetes üzerinde konteyner",
		},
		DataModel: []DataEntity{{
			Entity:          "Incident",
			Purpose:         "Operasyon olaylarını saklar",
			ImportantFields: []string{"id", "severity", "status"},
			Relations:       []string{"User"},
		}},
		SecurityAndPrivacy: SecuritySection{
			Authentication: "JWT tabanlı kimlik doğrulama",
			Authorization:  "RBAC",
			DataProtection: []string{"TLS zorunlu"},
			AuditLogging:   []string{"Kritik işlemler loglanır"},
			Compliance:     []string{"KVKK"},
		},
		Roadmap: []RoadmapPhase{{
			Phase:         "MVP",
			Scope:         []string{"Olay listesi ve filtreleme"},
			ExitCriteria:  []string{"10 pilot kullanıcı ile canlı test"},
		}},
	}
}

// SampleValidSpecJSON returns marshaled sample JSON for mock LLM responses.
func SampleValidSpecJSON() string {
	b, err := json.Marshal(SampleValidSpec())
	if err != nil {
		return "{}"
	}
	return string(b)
}
