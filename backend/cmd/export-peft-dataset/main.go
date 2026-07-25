package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	exportdto "github.com/masterfabric-go/masterfabric/internal/application/datasetexport/dto"
	datasetexportUC "github.com/masterfabric-go/masterfabric/internal/application/datasetexport/usecase"
	generationUC "github.com/masterfabric-go/masterfabric/internal/application/generation/usecase"
	pgDocument "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/document"
	pgProjectProfile "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/projectprofile"
	pgQuestionnaire "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/questionnaire"
	pgTenant "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/tenant"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	"github.com/masterfabric-go/masterfabric/internal/shared/database"
	"github.com/masterfabric-go/masterfabric/internal/shared/logger"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
)

const cliTimeout = 5 * time.Minute

func main() {
	os.Exit(run(os.Args[1:]))
}

func run(args []string) int {
	fs := flag.NewFlagSet("export-peft-dataset", flag.ExitOnError)
	outDir := fs.String("out-dir", "./peft-export", "output directory for JSONL + manifest")
	orgIDStr := fs.String("org-id", "", "organization UUID (required)")
	workspaceIDStr := fs.String("workspace-id", "", "optional workspace UUID filter")
	sinceStr := fs.String("since", "", "optional approved_at lower bound (RFC3339 or YYYY-MM-DD)")
	split := fs.Float64("split", 0, "train split ratio 0-1 (default 0.9)")
	splitSalt := fs.String("split-salt", "", "salt for reproducible workspace split")
	dedupe := fs.String("dedupe", "", "dedupe mode: none|fingerprint|workspace-latest")
	minQuality := fs.Int("min-quality", 0, "minimum quality_score (default 80)")
	allowLowQuality := fs.Bool("allow-low-quality", false, "bypass section coverage requirement")
	includeLegacyFP := fs.Bool("include-legacy-no-fingerprint", false, "export rows with empty source_fingerprint")
	dryRun := fs.Bool("dry-run", false, "write manifest only, skip JSONL files")
	writeSkipped := fs.Bool("write-skipped", false, "write skipped.jsonl when rows were skipped")
	scanSecrets := fs.Bool("scan-assistant-secrets", false, "reject assistant bodies matching secret patterns")
	force := fs.Bool("force", false, "overwrite non-empty out-dir")
	verbose := fs.Bool("verbose", false, "log skip reasons to stderr")

	if err := fs.Parse(args); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		return 1
	}

	orgID, err := uuid.Parse(strings.TrimSpace(*orgIDStr))
	if err != nil || orgID == uuid.Nil {
		fmt.Fprintln(os.Stderr, "error: --org-id is required and must be a valid UUID")
		return 1
	}

	opts := exportdto.ExportOptions{
		OrganizationID:             orgID,
		OutDir:                     strings.TrimSpace(*outDir),
		SplitRatio:                 *split,
		SplitSalt:                  strings.TrimSpace(*splitSalt),
		MinQualityScore:            *minQuality,
		AllowLowQuality:            *allowLowQuality,
		IncludeLegacyNoFingerprint: *includeLegacyFP,
		DryRun:                     *dryRun,
		WriteSkipped:               *writeSkipped,
		ScanAssistantSecrets:       *scanSecrets,
	}
	if mode, err := parseDedupeMode(*dedupe); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		return 1
	} else if mode != "" {
		opts.Dedupe = mode
	}
	if wsRaw := strings.TrimSpace(*workspaceIDStr); wsRaw != "" {
		wsID, err := uuid.Parse(wsRaw)
		if err != nil {
			fmt.Fprintf(os.Stderr, "error: invalid --workspace-id: %v\n", err)
			return 1
		}
		opts.WorkspaceID = &wsID
	}
	if sinceRaw := strings.TrimSpace(*sinceStr); sinceRaw != "" {
		since, err := parseSince(sinceRaw)
		if err != nil {
			fmt.Fprintf(os.Stderr, "error: invalid --since: %v\n", err)
			return 1
		}
		opts.Since = &since
	}

	cfg := config.Load()
	ctx, cancel := context.WithTimeout(context.Background(), cliTimeout)
	defer cancel()
	ctx = contextWithOrganization(ctx, orgID)

	db, err := database.NewPostgresPool(ctx, cfg.Database)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: database connection failed: %v\n", err)
		return 3
	}
	defer db.Close()

	workspaceRepo := pgTenant.NewWorkspaceRepository(db)
	profileRepo := pgProjectProfile.NewProfileRepository(db)
	setRepo := pgQuestionnaire.NewSetRepository(db)
	questionRepo := pgQuestionnaire.NewQuestionRepository(db)
	answerRepo := pgQuestionnaire.NewAnswerRepository(db)
	documentRepo := pgDocument.NewDocumentRepository(db)

	contextBuilder := generationUC.NewWorkspaceContextBuilder(
		workspaceRepo, profileRepo, setRepo, questionRepo, answerRepo,
	)
	exportUC := datasetexportUC.NewExportPEFTDatasetUseCase(
		documentRepo,
		&datasetexportUC.GenerationContextRebuilder{Builder: contextBuilder},
		&datasetexportUC.GenerationPromptAssembler{Builder: generationUC.NewPromptBuilder()},
	)

	result, execErr := exportUC.Execute(ctx, opts)
	if *verbose && result != nil {
		for _, s := range result.Skipped {
			log.Printf("skipped document_id=%s reason=%s detail=%s", s.DocumentID, s.Reason, s.Detail)
		}
	}

	if result != nil {
		if err := datasetexportUC.WriteExportArtifacts(opts.OutDir, result, datasetexportUC.WriteArtifactsOptions{
			Force:        *force,
			DryRun:       *dryRun,
			WriteSkipped: *writeSkipped,
		}); err != nil {
			fmt.Fprintf(os.Stderr, "error: write artifacts: %v\n", err)
			return 1
		}
		printSummary(opts.OutDir, result)
	}

	if execErr != nil {
		if errors.Is(execErr, datasetexportUC.ErrNoExportRows) {
			fmt.Fprintln(os.Stderr, "warning: no rows exported (see manifest.json skip_reasons)")
			return 2
		}
		fmt.Fprintf(os.Stderr, "error: export failed: %v\n", execErr)
		return 1
	}
	return 0
}

func parseDedupeMode(raw string) (exportdto.DedupeMode, error) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "", "fingerprint":
		return exportdto.DedupeFingerprint, nil
	case "none":
		return exportdto.DedupeNone, nil
	case "workspace-latest":
		return exportdto.DedupeWorkspaceLatest, nil
	default:
		return "", fmt.Errorf("unsupported --dedupe %q", raw)
	}
}

func parseSince(raw string) (time.Time, error) {
	if t, err := time.Parse(time.RFC3339, raw); err == nil {
		return t.UTC(), nil
	}
	t, err := time.Parse("2006-01-02", raw)
	if err != nil {
		return time.Time{}, err
	}
	return t.UTC(), nil
}

func printSummary(outDir string, result *exportdto.ExportResult) {
	c := result.Manifest.Counts
	fmt.Printf("PEFT export complete → %s\n", outDir)
	fmt.Printf("  candidates=%d exported=%d skipped=%d train=%d val=%d\n",
		c.Candidates, c.Exported, c.Skipped, c.Train, c.Val)
}

func contextWithOrganization(ctx context.Context, orgID uuid.UUID) context.Context {
	ctx = context.WithValue(ctx, middleware.ContextKeyTenantID, orgID)
	return logger.ContextWithOrganizationID(ctx, orgID.String())
}
