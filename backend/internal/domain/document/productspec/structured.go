package productspec

// StructuredSpec is the canonical JSON contract for Product Spec LLM output.
// JSON keys are English; string values must be Turkish.
type StructuredSpec struct {
	Summary                   SummarySection            `json:"summary"`
	Goals                     GoalsSection              `json:"goals"`
	UsersAndRoles             []UserRole                `json:"users_and_roles"`
	FunctionalRequirements    []FunctionalRequirement   `json:"functional_requirements"`
	NonFunctionalRequirements NonFunctionalRequirements `json:"non_functional_requirements"`
	Architecture              ArchitectureSection       `json:"architecture"`
	DataModel                 []DataEntity              `json:"data_model"`
	SecurityAndPrivacy        SecuritySection           `json:"security_and_privacy"`
	Roadmap                   []RoadmapPhase            `json:"roadmap"`
}

type SummarySection struct {
	ProjectName      string `json:"project_name"`
	Description      string `json:"description"`
	Problem          string `json:"problem"`
	ValueProposition string `json:"value_proposition"`
}

type GoalsSection struct {
	BusinessGoals   []string `json:"business_goals"`
	SuccessMetrics  []string `json:"success_metrics"`
}

type UserRole struct {
	Role             string   `json:"role"`
	Responsibilities []string `json:"responsibilities"`
	MainNeeds        []string `json:"main_needs"`
}

type FunctionalRequirement struct {
	ID                 string   `json:"id"`
	Title              string   `json:"title"`
	Description        string   `json:"description"`
	Priority           string   `json:"priority"`
	AcceptanceCriteria []string `json:"acceptance_criteria"`
}

type NonFunctionalRequirements struct {
	Performance   []string `json:"performance"`
	Availability  []string `json:"availability"`
	Scalability   []string `json:"scalability"`
	Accessibility []string `json:"accessibility"`
	Observability []string `json:"observability"`
}

type ArchitectureSection struct {
	Style        string   `json:"style"`
	Components   []string `json:"components"`
	Integrations []string `json:"integrations"`
	Deployment   string   `json:"deployment"`
}

type DataEntity struct {
	Entity          string   `json:"entity"`
	Purpose         string   `json:"purpose"`
	ImportantFields []string `json:"important_fields"`
	Relations       []string `json:"relations"`
}

type SecuritySection struct {
	Authentication string   `json:"authentication"`
	Authorization  string   `json:"authorization"`
	DataProtection []string `json:"data_protection"`
	AuditLogging   []string `json:"audit_logging"`
	Compliance     []string `json:"compliance"`
}

type RoadmapPhase struct {
	Phase         string   `json:"phase"`
	Scope         []string `json:"scope"`
	ExitCriteria  []string `json:"exit_criteria"`
}

// ValidationError describes a single structured validation failure.
type ValidationError struct {
	Path    string `json:"path"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ValidationResult is returned by structured validation.
type ValidationResult struct {
	Valid                       bool              `json:"valid"`
	Errors                      []ValidationError `json:"errors"`
	RequiredFieldCoverage       float64           `json:"required_field_coverage"`
	EmptyRequiredArrayCount     int               `json:"empty_required_array_count"`
	EmptyRequiredStringCount    int               `json:"empty_required_string_count"`
}

// GenerationMeta captures structured generation diagnostics (API-only, not persisted).
type GenerationMeta struct {
	StructuredOutputValid    bool    `json:"structured_output_valid"`
	StructuredRepairAttempts int     `json:"structured_repair_attempts"`
	JSONParseSucceeded       bool    `json:"json_parse_succeeded"`
	MarkdownRenderSucceeded  bool    `json:"markdown_render_succeeded"`
	RequiredFieldCoverage    float64 `json:"required_field_coverage"`
	EmptyRequiredArrayCount  int     `json:"empty_required_array_count"`
	EmptyRequiredStringCount int     `json:"empty_required_string_count"`
}

// StructuredMarkdownPrefix identifies deterministic renderer output.
const StructuredMarkdownPrefix = "# Product Spec:"
