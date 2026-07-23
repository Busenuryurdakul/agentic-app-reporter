package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	// Infrastructure
	infraAuth "github.com/masterfabric-go/masterfabric/internal/infrastructure/auth"
	apimgmtHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/apimanagement"
	auditHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/audit"
	generationHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/generation"
	iamHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/iam"
	exportHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/export"
	observeHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/observe"
	projectprofileHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/projectprofile"
	questionnaireHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/questionnaire"
	realtimeHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/realtime"
	tenantHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/tenant"
	"github.com/masterfabric-go/masterfabric/internal/infrastructure/http/router"
	infraKafka "github.com/masterfabric-go/masterfabric/internal/infrastructure/kafka"
	infraLLM "github.com/masterfabric-go/masterfabric/internal/infrastructure/llm"
	pgApimgmt "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/apimanagement"
	pgAudit "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/audit"
	pgDocument "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/document"
	pgIam "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/iam"
	pgProjectProfile "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/projectprofile"
	pgQuestionnaire "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/questionnaire"
	pgBootstrap "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/bootstrap"
	pgTenant "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/tenant"
	infraWS "github.com/masterfabric-go/masterfabric/internal/infrastructure/websocket"

	// Application use cases
	apimgmtUC "github.com/masterfabric-go/masterfabric/internal/application/apimanagement/usecase"
	generationUC "github.com/masterfabric-go/masterfabric/internal/application/generation/usecase"
	iamUC "github.com/masterfabric-go/masterfabric/internal/application/iam/usecase"
	exportUC "github.com/masterfabric-go/masterfabric/internal/application/export/usecase"
	observeUC "github.com/masterfabric-go/masterfabric/internal/application/observe/usecase"
	projectprofileUC "github.com/masterfabric-go/masterfabric/internal/application/projectprofile/usecase"
	questionnaireUC "github.com/masterfabric-go/masterfabric/internal/application/questionnaire/usecase"
	realtimeUC "github.com/masterfabric-go/masterfabric/internal/application/realtime/usecase"
	tenantUC "github.com/masterfabric-go/masterfabric/internal/application/tenant/usecase"

	// Gateway
	"github.com/masterfabric-go/masterfabric/internal/gateway"
	gatewayInterceptors "github.com/masterfabric-go/masterfabric/internal/infrastructure/gateway/interceptors"

	// Shared
	"github.com/masterfabric-go/masterfabric/internal/shared/cache"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	"github.com/masterfabric-go/masterfabric/internal/shared/database"
	"github.com/masterfabric-go/masterfabric/internal/shared/events"
	"github.com/masterfabric-go/masterfabric/internal/shared/logger"
	"github.com/masterfabric-go/masterfabric/internal/shared/telemetry"
	"github.com/masterfabric-go/masterfabric/internal/shared/version"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	// Load configuration
	cfg := config.Load()

	// Initialize logger
	log := logger.New(cfg.Log.Level, cfg.Log.Format)
	slog.SetDefault(log)

	log.Info("starting masterfabric-go",
		"host", cfg.Server.Host,
		"port", cfg.Server.Port,
	)

	if cfg.JWT.Secret == "change-me-in-production" {
		log.Warn("JWT_SECRET is unset; authentication uses a known default value")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Initialize OpenTelemetry
	otelShutdown, err := telemetry.Setup(ctx, version.ServiceName, version.Version)
	if err != nil {
		log.Warn("opentelemetry setup failed", "error", err)
	} else {
		defer func() { _ = otelShutdown(context.Background()) }()
		log.Info("opentelemetry initialized")
	}

	// Initialize PostgreSQL
	db, err := database.NewPostgresPool(ctx, cfg.Database)
	if err != nil {
		log.Warn("postgres unavailable, running without database", "error", err)
		db = nil
	} else {
		defer db.Close()
		log.Info("connected to postgres")

		bootstrapCtx, bootstrapCancel := context.WithTimeout(context.Background(), 60*time.Second)
		if err := pgBootstrap.Run(bootstrapCtx, db, log); err != nil {
			bootstrapCancel()
			return fmt.Errorf("database bootstrap: %w", err)
		}
		bootstrapCancel()
	}

	// Initialize Redis
	redisClient, err := cache.NewRedisClient(ctx, cfg.Redis)
	if err != nil {
		log.Warn("redis unavailable, running without cache", "error", err)
		redisClient = nil
	} else {
		defer redisClient.Close()
		log.Info("connected to redis")
	}

	// Initialize event bus (Kafka or in-process)
	eventBus := initEventBus(ctx, cfg, log)
	defer func() { _ = eventBus.Close() }()

	// Build dependencies
	deps, generationLocker, err := buildDependencies(log, cfg, db, redisClient, eventBus)
	if err != nil {
		return err
	}

	// Production must never boot with Auth/RBAC disabled (maybeRequirePermission no-op).
	if err := router.ValidateSecureAuthWiring(deps, cfg.IsProduction()); err != nil {
		return err
	}

	var draining atomic.Bool
	deps.Draining = func() bool { return draining.Load() }

	// Build router
	r := router.New(deps)

	// Create HTTP server
	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	// Graceful shutdown
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)

	serverErr := make(chan error, 1)
	go func() {
		log.Info("listening", "addr", addr)
		serverErr <- srv.ListenAndServe()
	}()

	select {
	case err := <-serverErr:
		if err != nil && err != http.ErrServerClosed {
			return fmt.Errorf("server error: %w", err)
		}
	case sig := <-shutdown:
		log.Info("shutdown signal received", "signal", sig)
		draining.Store(true)

		waitBudget := time.Duration(cfg.LLM.TimeoutSeconds+30) * time.Second
		if waitBudget < 30*time.Second {
			waitBudget = 30 * time.Second
		}
		deadline := time.Now().Add(waitBudget)
		for generationLocker != nil && generationLocker.HasInflight() && time.Now().Before(deadline) {
			log.Info("waiting for in-flight LLM generations",
				"count", generationLocker.InflightCount(),
			)
			time.Sleep(500 * time.Millisecond)
		}
		if generationLocker != nil && generationLocker.HasInflight() {
			log.Warn("shutdown proceeding with in-flight generations still active",
				"count", generationLocker.InflightCount(),
			)
		}

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer shutdownCancel()

		if err := srv.Shutdown(shutdownCtx); err != nil {
			_ = srv.Close()
			return fmt.Errorf("graceful shutdown failed: %w", err)
		}
		log.Info("server stopped gracefully")
	}

	return nil
}

// initEventBus creates either a Kafka bus or an in-process bus based on config.
func initEventBus(ctx context.Context, cfg *config.Config, log *slog.Logger) events.EventBus {
	if !cfg.Kafka.Enabled {
		log.Info("using in-process event bus (set KAFKA_ENABLED=true to use Kafka)")
		return events.NewInProcessBus(log, 256)
	}

	log.Info("initializing kafka event bus",
		"brokers", cfg.Kafka.Brokers,
		"group_id", cfg.Kafka.GroupID,
	)

	// Ensure topics exist
	if len(cfg.Kafka.Brokers) > 0 {
		if err := infraKafka.EnsureTopics(
			ctx,
			cfg.Kafka.Brokers[0],
			infraKafka.DefaultTopics(),
			cfg.Kafka.NumPartitions,
			cfg.Kafka.ReplicationFactor,
			log,
		); err != nil {
			log.Warn("failed to ensure kafka topics, falling back to in-process bus", "error", err)
			return events.NewInProcessBus(log, 256)
		}
	}

	kafkaBus := infraKafka.NewBus(cfg.Kafka.Brokers, cfg.Kafka.GroupID, log)

	// Start consuming (after subscriptions are registered in buildDependencies)
	// We start consumption with a background context so it outlives the startup ctx.
	kafkaBus.Start(context.Background())

	log.Info("kafka event bus initialized")
	return kafkaBus
}

func buildDependencies(
	log *slog.Logger,
	cfg *config.Config,
	db *pgxpool.Pool,
	redisClient *redis.Client,
	eventBus events.EventBus,
) (router.Dependencies, generationUC.GenerationLocker, error) {
	deps := router.Dependencies{
		Logger:             log,
		DB:                 db,
		Redis:              redisClient,
		CORSAllowedOrigins: cfg.Server.CORSAllowedOrigins,
		MaxBodyBytes:       cfg.Server.MaxBodyBytes,
	}

	// LLM provider is independent of the database (mock / gemma via LLMProvider).
	if err := config.ValidateLLMConfig(cfg.LLM, cfg.IsProduction()); err != nil {
		return deps, nil, fmt.Errorf("llm config: %w", err)
	}
	llmProvider, err := infraLLM.NewProvider(cfg.LLM)
	if err != nil {
		return deps, nil, fmt.Errorf("llm provider: %w", err)
	}
	deps.LLMProvider = llmProvider
	providerHealthUC := generationUC.NewProviderHealthUseCase(llmProvider, cfg.LLM.Enabled)
	// Document use-cases are wired after DB repos are available; health works without DB.
	deps.GenerationHandler = generationHandler.NewHandler(providerHealthUC, nil, nil, nil, nil, nil)
	log.Info("llm provider configured",
		"provider", llmProvider.Name(),
		"enabled", cfg.LLM.Enabled,
	)

	if db == nil {
		log.Warn("database not available, API endpoints will not work")
		return deps, nil, nil
	}

	// --- Repositories ---
	userRepo := pgIam.NewUserRepo(db)
	roleRepo := pgIam.NewRoleRepo(db)
	orgUserRepo := pgIam.NewOrgUserRepo(db)
	orgRepo := pgTenant.NewOrgRepo(db)
	workspaceRepo := pgTenant.NewWorkspaceRepository(db)
	appRepo := pgTenant.NewAppRepo(db)
	apiKeyRepo := pgTenant.NewAPIKeyRepo(db)
	endpointRepo := pgApimgmt.NewEndpointRepo(db)
	policyRepo := pgApimgmt.NewPolicyRepo(db)
	auditRepo := pgAudit.NewAuditRepo(db)
	profileRepo := pgProjectProfile.NewProfileRepository(db)
	questionnaireSetRepo := pgQuestionnaire.NewSetRepository(db)
	questionRepo := pgQuestionnaire.NewQuestionRepository(db)
	answerRepo := pgQuestionnaire.NewAnswerRepository(db)
	documentRepo := pgDocument.NewDocumentRepository(db)

	// --- Services ---
	jwtService := infraAuth.NewJWTService(cfg.JWT)
	rbacService := infraAuth.NewRBACService(roleRepo, redisClient)

	deps.AuthService = jwtService
	deps.RBACService = rbacService
	deps.OrgRepo = orgRepo
	deps.WorkspaceRepo = workspaceRepo

	// --- Use cases (with event bus for domain event publishing) ---
	registerUC := iamUC.NewRegisterUseCase(userRepo, jwtService, eventBus)
	loginUC := iamUC.NewLoginUseCase(userRepo, jwtService)
	assignRoleUC := iamUC.NewAssignRoleUseCase(roleRepo, rbacService, eventBus)
	createOrgUC := tenantUC.NewCreateOrgUseCase(orgRepo, orgUserRepo, roleRepo, eventBus)
	listOrgsUC := tenantUC.NewListOrgsUseCase(orgRepo, orgUserRepo)
	createWorkspaceUC := tenantUC.NewCreateWorkspaceUseCase(workspaceRepo, orgRepo, eventBus)
	listWorkspacesUC := tenantUC.NewListWorkspacesUseCase(workspaceRepo)
	getWorkspaceUC := tenantUC.NewGetWorkspaceUseCase(workspaceRepo)
	updateWorkspaceUC := tenantUC.NewUpdateWorkspaceUseCase(workspaceRepo)
	deleteWorkspaceUC := tenantUC.NewDeleteWorkspaceUseCase(workspaceRepo, eventBus)
	createAppUC := tenantUC.NewCreateAppUseCase(appRepo, orgRepo, eventBus)
	manageKeysUC := tenantUC.NewManageAPIKeysUseCase(apiKeyRepo)
	defineEndpointUC := apimgmtUC.NewDefineEndpointUseCase(endpointRepo, eventBus)
	updatePolicyUC := apimgmtUC.NewUpdatePolicyUseCase(policyRepo)
	retireEndpointUC := apimgmtUC.NewRetireEndpointUseCase(endpointRepo, eventBus)
	activateEndpointUC := apimgmtUC.NewActivateEndpointUseCase(endpointRepo, eventBus)

	// AI Development Configuration Studio: project profile use cases
	getProfileUC := projectprofileUC.NewGetProfileUseCase(profileRepo, workspaceRepo)
	upsertProfileUC := projectprofileUC.NewUpsertProfileUseCase(profileRepo, workspaceRepo)
	completenessUC := projectprofileUC.NewCompletenessUseCase(profileRepo, workspaceRepo)

	// AI Development Configuration Studio: questionnaire use cases
	listSetsUC := questionnaireUC.NewListSetsUseCase(questionnaireSetRepo)
	getSetUC := questionnaireUC.NewGetSetUseCase(questionnaireSetRepo, questionRepo)
	listWorkspaceQuestionsUC := questionnaireUC.NewListWorkspaceQuestionsUseCase(questionnaireSetRepo, questionRepo, answerRepo, workspaceRepo)
	listAnswersUC := questionnaireUC.NewListAnswersUseCase(answerRepo, workspaceRepo)
	upsertAnswerUC := questionnaireUC.NewUpsertAnswerUseCase(answerRepo, questionRepo, workspaceRepo)
	bulkUpsertAnswersUC := questionnaireUC.NewBulkUpsertAnswersUseCase(answerRepo, workspaceRepo)
	missingInformationUC := questionnaireUC.NewMissingInformationUseCase(questionnaireSetRepo, questionRepo, answerRepo, workspaceRepo)

	// Phase 3 S4: document generation (context + prompt + LLMProvider + persist)
	contextBuilder := generationUC.NewWorkspaceContextBuilder(
		workspaceRepo, profileRepo, questionnaireSetRepo, questionRepo, answerRepo,
	)
	promptBuilder := generationUC.NewPromptBuilder()
	lockTTL := time.Duration(cfg.LLM.TimeoutSeconds+30) * time.Second
	generationLocker := generationUC.NewGenerationLocker(redisClient, lockTTL)
	generateDocumentUC := generationUC.NewGenerateDocumentUseCase(
		contextBuilder, promptBuilder, llmProvider, documentRepo, generationLocker, cfg.LLM.Enabled, log,
	)
	regenerateDocumentUC := generationUC.NewRegenerateDocumentUseCase(generateDocumentUC, documentRepo, workspaceRepo)
	listDocumentsUC := generationUC.NewListDocumentsUseCase(documentRepo, workspaceRepo)
	getDocumentUC := generationUC.NewGetDocumentUseCase(documentRepo, workspaceRepo)
	approveDocumentUC := generationUC.NewApproveDocumentUseCase(documentRepo, workspaceRepo)

	// Phase 4 S1: readiness + observe summary (deterministic; reuses completeness + missing-info)
	readinessUC := observeUC.NewReadinessUseCase(completenessUC, missingInformationUC, documentRepo, workspaceRepo)
	observeSummaryUC := observeUC.NewObserveSummaryUseCase(documentRepo, workspaceRepo)

	// Phase 4 S5: sync Markdown / ZIP export (approved → succeeded fallback)
	exportPackageUC := exportUC.NewExportPackageUseCase(documentRepo, workspaceRepo)

	// --- Register sample Kafka consumers ---
	// Log all IAM events
	eventBus.Subscribe(events.TopicIAM, func(ctx context.Context, event events.Event) error {
		log.Info("iam event received", "event", event)
		return nil
	})
	// Log all tenant events
	eventBus.Subscribe(events.TopicTenant, func(ctx context.Context, event events.Event) error {
		log.Info("tenant event received", "event", event)
		return nil
	})
	// Log all API management events
	eventBus.Subscribe(events.TopicAPIManagement, func(ctx context.Context, event events.Event) error {
		log.Info("api-management event received", "event", event)
		return nil
	})

	// --- Handlers ---
	deps.IAMHandler = iamHandler.NewHandler(registerUC, loginUC, assignRoleUC, userRepo)
	deps.TenantHandler = tenantHandler.NewHandler(
		createOrgUC,
		listOrgsUC,
		createAppUC,
		manageKeysUC,
		createWorkspaceUC,
		listWorkspacesUC,
		getWorkspaceUC,
		updateWorkspaceUC,
		deleteWorkspaceUC,
		orgRepo,
		appRepo,
	)
	deps.APIMgmtHandler = apimgmtHandler.NewHandler(defineEndpointUC, updatePolicyUC, retireEndpointUC, activateEndpointUC, endpointRepo, policyRepo)
	deps.AuditHandler = auditHandler.NewHandler(auditRepo)
	deps.ProjectProfileHandler = projectprofileHandler.NewHandler(getProfileUC, upsertProfileUC, completenessUC)
	deps.QuestionnaireHandler = questionnaireHandler.NewHandler(
		listSetsUC,
		getSetUC,
		listWorkspaceQuestionsUC,
		listAnswersUC,
		upsertAnswerUC,
		bulkUpsertAnswersUC,
		missingInformationUC,
	)
	deps.GenerationHandler = generationHandler.NewHandler(
		providerHealthUC,
		generateDocumentUC,
		regenerateDocumentUC,
		listDocumentsUC,
		getDocumentUC,
		approveDocumentUC,
	)
	deps.ObserveHandler = observeHandler.NewHandler(readinessUC, observeSummaryUC)
	deps.ExportHandler = exportHandler.NewHandler(exportPackageUC)

	// --- WebSocket real-time hub ---
	wsHub := infraWS.NewHub(log, cfg.WebSocket.MaxConnections)
	eventBridge := infraWS.NewEventBridge(wsHub, appRepo, log)
	eventBridge.Register(eventBus)

	validateConnectUC := realtimeUC.NewValidateConnectUseCase(appRepo, rbacService)
	wsUpgrader := infraWS.NewUpgrader(infraWS.UpgraderConfig{
		ReadBufferSize:  cfg.WebSocket.ReadBufferSize,
		WriteBufferSize: cfg.WebSocket.WriteBufferSize,
		AllowedOrigins:  cfg.Server.CORSAllowedOrigins,
	})
	deps.RealtimeHandler = realtimeHandler.NewHandler(realtimeHandler.Config{
		ValidateUC:   validateConnectUC,
		AuthService:  jwtService,
		Hub:          wsHub,
		Upgrader:     wsUpgrader,
		PingInterval: cfg.WebSocket.PingIntervalSec,
		Logger:       log,
		Enabled:      cfg.WebSocket.Enabled,
	})

	// --- Gateway pipeline with interceptors ---
	// Create interceptor chain: schema validation, PII masking, request/response transformers
	piiMasker := gatewayInterceptors.NewPIIMasker(
		[]string{"password", "password_hash", "api_key", "secret", "token", "ssn", "credit_card"},
		"***",
	)
	schemaValidator := gatewayInterceptors.NewSchemaValidator()

	// Create dynamic handler resolver for routing requests to backend service handlers
	// This supports:
	// 1. Registered handlers (if you register specific handlers)
	// 2. HTTP proxy to external services (if backend_service is a URL or configured)
	// 3. Generic dynamic database handler (automatically performs CRUD operations)
	backendRegistry := gateway.NewBackendRegistry()
	dynamicResolver := gateway.NewDynamicHandlerResolver(backendRegistry, log, db)

	// Optional: Register service configurations for HTTP proxying
	// Example:
	// dynamicResolver.RegisterServiceConfig("product-service", gateway.ServiceConfig{
	//     BaseURL: "https://api.example.com/products",
	//     Headers: map[string]string{"Authorization": "Bearer token"},
	// })

	// Optional: Register specific handlers for services that need custom logic
	// Example:
	// productHandler := handlers.NewProductHandler(...)
	// backendRegistry.Register("product-service", productHandler)

	// Wire interceptors into gateway pipeline with dynamic resolver
	deps.GatewayPipeline = gateway.NewPipeline(
		endpointRepo,
		policyRepo,
		rbacService,
		redisClient,
		log,
		dynamicResolver, // Dynamic handler resolver (supports registered handlers, HTTP proxy, and generic handling)
		schemaValidator, // Schema validation interceptor
		piiMasker,       // PII masking interceptor
	)

	return deps, generationLocker, nil
}
