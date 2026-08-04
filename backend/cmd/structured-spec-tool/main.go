package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/generation/usecase"
	docModel "github.com/masterfabric-go/masterfabric/internal/domain/document/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/productspec"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/quality"
)

type scenarioFile struct {
	Language  string     `json:"language"`
	Scenarios []scenario `json:"scenarios"`
}

type scenario struct {
	ID      string           `json:"id"`
	Profile profileInput     `json:"profile"`
	Answers []answerInput    `json:"answers"`
}

type profileInput struct {
	ProjectName        string `json:"project_name"`
	ProjectDescription string `json:"project_description"`
	ProductType        string `json:"product_type"`
	TargetUsers        string `json:"target_users"`
	MainProblem        string `json:"main_problem"`
	MainUseCases       string `json:"main_use_cases"`
	ProjectStatus      string `json:"project_status"`
}

type answerInput struct {
	Title string `json:"title"`
	Value string `json:"value"`
}

type processInput struct {
	Raw          string `json:"raw"`
	FinishReason string `json:"finish_reason"`
	Language     string `json:"language"`
}

type processOutput struct {
	InitialJSONParseSucceeded bool                           `json:"initial_json_parse_succeeded"`
	StructuredOutputValid     bool                           `json:"structured_output_valid"`
	JSONParseSucceeded        bool                           `json:"json_parse_succeeded"`
	MarkdownRenderSucceeded   bool                           `json:"markdown_render_succeeded"`
	FinishReason              string                         `json:"finish_reason"`
	FinishReasonLength        bool                           `json:"finish_reason_length"`
	Validation                productspec.ValidationResult   `json:"validation"`
	Markdown                  string                         `json:"markdown"`
	ContentMetrics            map[string]int                 `json:"content_metrics"`
	QualityScore              int                            `json:"quality_score"`
	SectionCoverageOK         bool                           `json:"section_coverage_ok"`
	RepairPrompts             *repairPromptBundle            `json:"repair_prompts,omitempty"`
}

type repairPromptBundle struct {
	SystemPrompt string `json:"system_prompt"`
	UserPrompt   string `json:"user_prompt"`
	Kind         string `json:"kind"`
}

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: structured-spec-tool <build-prompts|process-output>")
		os.Exit(2)
	}
	switch os.Args[1] {
	case "build-prompts":
		runBuildPrompts(os.Args[2:])
	case "process-output":
		runProcessOutput(os.Args[2:])
	default:
		fmt.Fprintf(os.Stderr, "unknown command: %s\n", os.Args[1])
		os.Exit(2)
	}
}

func runBuildPrompts(args []string) {
	fs := flag.NewFlagSet("build-prompts", flag.ExitOnError)
	in := fs.String("in", "", "scenario JSON file")
	out := fs.String("out", "", "output JSON file")
	_ = fs.Parse(args)
	if *in == "" || *out == "" {
		fmt.Fprintln(os.Stderr, "build-prompts requires --in and --out")
		os.Exit(2)
	}
	data, err := os.ReadFile(*in)
	if err != nil {
		fail(err)
	}
	var file scenarioFile
	if err := json.Unmarshal(data, &file); err != nil {
		fail(err)
	}
	lang := file.Language
	if lang == "" {
		lang = "tr"
	}
	builder := usecase.NewPromptBuilder()
	var prompts []map[string]string
	for _, sc := range file.Scenarios {
		ctx := scenarioToContext(sc, lang)
		req, err := builder.Build(ctx, docModel.DocumentTypeProductSpec)
		if err != nil {
			fail(err)
		}
		prompts = append(prompts, map[string]string{
			"id":            sc.ID,
			"system_prompt": req.SystemPrompt,
			"user_prompt":   req.UserPrompt,
		})
	}
	outData, err := json.MarshalIndent(map[string]any{
		"language": lang,
		"chat_template": "gemma2",
		"prompts": prompts,
	}, "", "  ")
	if err != nil {
		fail(err)
	}
	if err := os.WriteFile(*out, outData, 0o644); err != nil {
		fail(err)
	}
}

func runProcessOutput(args []string) {
	fs := flag.NewFlagSet("process-output", flag.ExitOnError)
	in := fs.String("in", "", "process input JSON file")
	out := fs.String("out", "", "process output JSON file")
	_ = fs.Parse(args)
	if *in == "" || *out == "" {
		fmt.Fprintln(os.Stderr, "process-output requires --in and --out")
		os.Exit(2)
	}
	data, err := os.ReadFile(*in)
	if err != nil {
		fail(err)
	}
	var input processInput
	if err := json.Unmarshal(data, &input); err != nil {
		fail(err)
	}
	result := processRaw(input.Raw, input.FinishReason, input.Language)
	outData, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		fail(err)
	}
	if err := os.WriteFile(*out, outData, 0o644); err != nil {
		fail(err)
	}
}

func processRaw(raw, finishReason, language string) processOutput {
	if language == "" {
		language = "tr"
	}
	lengthFinish := isTruncatedFinishReason(finishReason)
	out := processOutput{
		FinishReason:       finishReason,
		FinishReasonLength: lengthFinish,
	}
	if lengthFinish {
		out.Validation = productspec.ValidationResult{
			Valid: false,
			Errors: []productspec.ValidationError{{
				Path: "root", Code: "truncated_output", Message: "Model çıktısı token limitinde kesildi",
			}},
		}
		out.RepairPrompts = &repairPromptBundle{
			SystemPrompt: productspec.BuildRepairSystemPrompt(language),
			UserPrompt:   productspec.BuildParseRepairUserPrompt(language, raw),
			Kind:         "parse_repair",
		}
		return out
	}
	spec, parseOK, validation := parseAndValidate(raw)
	out.InitialJSONParseSucceeded = parseOK
	out.JSONParseSucceeded = parseOK
	out.Validation = validation
	out.StructuredOutputValid = validation.Valid
	if spec != nil {
		productspec.AssignRequirementIDs(spec)
		out.ContentMetrics = contentMetrics(spec)
	}
	if !validation.Valid || spec == nil {
		if spec != nil {
			out.RepairPrompts = &repairPromptBundle{
				SystemPrompt: productspec.BuildRepairSystemPrompt(language),
				UserPrompt:   productspec.BuildRepairUserPrompt(language, productspec.SpecJSON(spec), validation),
				Kind:         "validation_repair",
			}
		} else {
			out.RepairPrompts = &repairPromptBundle{
				SystemPrompt: productspec.BuildRepairSystemPrompt(language),
				UserPrompt:   productspec.BuildParseRepairUserPrompt(language, raw),
				Kind:         "parse_repair",
			}
		}
		return out
	}
	md, err := productspec.RenderMarkdown(spec, language)
	if err != nil {
		out.MarkdownRenderSucceeded = false
		return out
	}
	out.Markdown = md
	out.MarkdownRenderSucceeded = true
	out.StructuredOutputValid = true
	qs := quality.EvaluateForType(md, language, docModel.DocumentTypeProductSpec)
	out.QualityScore = qs.QualityScore
	out.SectionCoverageOK = qs.SectionCoverageOK
	return out
}

func contentMetrics(spec *productspec.StructuredSpec) map[string]int {
	securityCount := len(spec.SecurityAndPrivacy.DataProtection) + len(spec.SecurityAndPrivacy.AuditLogging) + len(spec.SecurityAndPrivacy.Compliance)
	if strings.TrimSpace(spec.SecurityAndPrivacy.Authentication) != "" {
		securityCount++
	}
	if strings.TrimSpace(spec.SecurityAndPrivacy.Authorization) != "" {
		securityCount++
	}
	acceptance := 0
	for _, fr := range spec.FunctionalRequirements {
		acceptance += len(fr.AcceptanceCriteria)
	}
	return map[string]int{
		"functional_requirement_count":      len(spec.FunctionalRequirements),
		"measurable_success_metric_count":   len(spec.Goals.SuccessMetrics),
		"acceptance_criteria_count":         acceptance,
		"user_role_count":                   len(spec.UsersAndRoles),
		"data_entity_count":                 len(spec.DataModel),
		"security_control_count":            securityCount,
		"roadmap_phase_count":               len(spec.Roadmap),
	}
}

func parseAndValidate(raw string) (*productspec.StructuredSpec, bool, productspec.ValidationResult) {
	spec, err := productspec.ParseStructured(raw)
	if err != nil {
		return nil, false, productspec.ValidationResult{
			Valid: false,
			Errors: []productspec.ValidationError{{
				Path: "root", Code: "parse_error", Message: err.Error(),
			}},
		}
	}
	productspec.SanitizeStructured(spec)
	return spec, true, productspec.ValidateStructured(spec)
}

func isTruncatedFinishReason(reason string) bool {
	r := strings.ToLower(strings.TrimSpace(reason))
	return r == "length" || r == "max_tokens"
}

func scenarioToContext(sc scenario, lang string) *usecase.WorkspaceLLMContext {
	answers := make([]usecase.VisibleAnswer, 0, len(sc.Answers))
	for i, a := range sc.Answers {
		val, _ := json.Marshal(a.Value)
		answers = append(answers, usecase.VisibleAnswer{
			Key:      fmt.Sprintf("q_%d", i),
			Title:    a.Title,
			Value:    val,
			Answered: true,
		})
	}
	return &usecase.WorkspaceLLMContext{
		OrganizationID:   uuid.New(),
		WorkspaceID:      uuid.New(),
		WorkspaceName:    sc.Profile.ProjectName,
		WorkspaceSlug:    strings.ToLower(strings.ReplaceAll(sc.ID, "_", "-")),
		Language:         lang,
		QuestionnaireSet: "eval-structured-final-30",
		Profile: usecase.ProfileSnapshot{
			ProjectName:               sc.Profile.ProjectName,
			ProjectDescription:        sc.Profile.ProjectDescription,
			ProductType:               sc.Profile.ProductType,
			TargetUsers:               sc.Profile.TargetUsers,
			MainProblem:               sc.Profile.MainProblem,
			MainUseCases:              sc.Profile.MainUseCases,
			ProjectStatus:             sc.Profile.ProjectStatus,
			PreferredDocumentLanguage: lang,
		},
		Answers: answers,
	}
}

func fail(err error) {
	fmt.Fprintf(os.Stderr, "error: %v\n", err)
	os.Exit(1)
}

