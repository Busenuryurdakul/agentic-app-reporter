.PHONY: build run test lint migrate migrate-down docker-up docker-down compose-up-full compose-up-mlc-gpu compose-down-mlc-gpu compose-down-full compose-monitoring-native compose-scale-api verify-mlc verify-hybrid llm-hybrid export-peft-dataset k8s-apply k8s-delete clean help

APP_NAME := masterfabric
BUILD_DIR := bin
MAIN_PATH := ./cmd/server
MIGRATION_DIR := internal/infrastructure/postgres/migrations
DB_DSN ?= postgres://masterfabric:masterfabric@localhost:5432/masterfabric?sslmode=disable
COMPOSE_FILE := deployments/docker-compose.yml
COMPOSE_LLM_FILE := deployments/docker-compose.llm.yml
COMPOSE := docker compose -f $(COMPOSE_FILE)
COMPOSE_GPU := docker compose -f $(COMPOSE_FILE) -f $(COMPOSE_LLM_FILE)
K8S_DIR := deployments/kubernetes

## help: Show this help message
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## /  /'

## build: Build the application binary
build:
	@echo "Building $(APP_NAME)..."
	go build -o $(BUILD_DIR)/$(APP_NAME) $(MAIN_PATH)

## run: Run the application
run:
	@echo "Running $(APP_NAME)..."
	go run $(MAIN_PATH)

## test: Run all tests
test:
	@echo "Running tests..."
	go test -v -race -count=1 ./...

## test-cover: Run tests with coverage
test-cover:
	@echo "Running tests with coverage..."
	go test -v -race -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

## lint: Run linter
lint:
	@echo "Running linter..."
	golangci-lint run ./...

## migrate: Run database migrations up
migrate:
	@echo "Running migrations..."
	goose -dir $(MIGRATION_DIR) postgres "$(DB_DSN)" up

## migrate-down: Rollback last migration
migrate-down:
	@echo "Rolling back last migration..."
	goose -dir $(MIGRATION_DIR) postgres "$(DB_DSN)" down

## migrate-status: Show migration status
migrate-status:
	@echo "Migration status..."
	goose -dir $(MIGRATION_DIR) postgres "$(DB_DSN)" status

## docker-up: Start Docker Compose services
docker-up:
	@echo "Starting Docker services..."
	$(COMPOSE) up -d

## docker-down: Stop Docker Compose services
docker-down:
	@echo "Stopping Docker services..."
	$(COMPOSE) down

## compose-up-full: Infra + API + MLC mock + nginx + Prometheus + Grafana
compose-up-full:
	@echo "Starting full Phase 5 stack..."
	$(COMPOSE) --profile stack up -d --build --scale api=2

## compose-up-mlc-gpu: Full stack with real MLC-LLM (NVIDIA GPU required)
compose-up-mlc-gpu:
	@echo "Starting GPU MLC stack (requires NVIDIA Container Toolkit)..."
	$(COMPOSE_GPU) --profile stack --profile mlc-gpu up -d --build --scale api=2

## compose-down-mlc-gpu: Stop GPU MLC stack
compose-down-mlc-gpu:
	$(COMPOSE_GPU) --profile stack --profile mlc-gpu down

## verify-mlc: Probe local MLC/mock endpoint (:8081)
verify-mlc:
	node ./scripts/verify_mlc_compose.mjs

## verify-hybrid: Verify LLM wiring from .env (mock / HF / local MLC)
verify-hybrid:
	node ./scripts/check-no-browser-llm.mjs
	node ./scripts/verify_hybrid_llm.mjs

## smoke-compose-full: Full Compose integration smoke (infra + API + observe + monitoring)
smoke-compose-full:
	node ./scripts/smoke_compose_full.mjs
	node ./scripts/smoke_phase3_documents.mjs
	node ./scripts/smoke_phase4_release.mjs
	node ./scripts/smoke_phase5_compose.mjs

## compose-scale-api: Scale API replicas (default 3)
compose-scale-api:
	@echo "Scaling API replicas..."
	$(COMPOSE) --profile stack up -d --scale api=3

## compose-down-full: Stop mock or GPU stack (whichever is running)
compose-down-full:
	-$(COMPOSE_GPU) --profile stack --profile mlc-gpu down
	$(COMPOSE) --profile stack down

## llm-hybrid: Print hybrid LLM mode guide
llm-hybrid:
	@echo "Hybrid LLM guide: deployments/LLM_HYBRID.md"
	@echo ""
	@echo "  Mode A — fast dev:        LLM_PROVIDER=mock  +  make run"
	@echo "  Mode B — HF external:   LLM_PROVIDER=gemma + HF URL  +  make run"
	@echo "  Mode C — compose mock:  make compose-up-full"
	@echo "  Mode D — local MLC GPU: make compose-up-mlc-gpu"
	@echo "  Mode E — Render prod:    see deployments/render-external-llm.md"
	@echo ""
	@echo "  Verify hybrid (from .env): make verify-hybrid"
	@echo "  Verify MLC endpoint:       make verify-mlc"

## compose-monitoring-native: Prometheus + Grafana + Alertmanager scraping host API (:8080)
## Use when running backend\\bin\\server.exe natively on Windows/macOS with Docker Desktop.
compose-monitoring-native:
	@echo "Starting monitoring stack (native API scrape via host.docker.internal:8080)..."
	PROMETHEUS_CONFIG=prometheus.native.yml $(COMPOSE) --profile monitoring up -d prometheus alertmanager grafana loki promtail

## compose-down-monitoring: Stop monitoring profile services
compose-down-monitoring:
	PROMETHEUS_CONFIG=prometheus.native.yml $(COMPOSE) --profile monitoring down

## k8s-apply: Deploy Kubernetes stack (requires kubectl + nginx ingress controller)
k8s-apply:
	@echo "Building image and applying K8s manifests..."
	docker build -f deployments/Dockerfile -t $(APP_NAME):latest .
	kubectl apply -k $(K8S_DIR)

## k8s-delete: Remove Kubernetes stack
k8s-delete:
	kubectl delete -k $(K8S_DIR) --ignore-not-found

## docker-build: Build Docker image
docker-build:
	@echo "Building Docker image..."
	docker build -f deployments/Dockerfile -t $(APP_NAME):latest .

## clean: Clean build artifacts
clean:
	@echo "Cleaning..."
	rm -rf $(BUILD_DIR) coverage.out coverage.html tmp

## seed: Seed the database with sample data
seed:
	@echo "Seeding database..."
	go run ./scripts

## seed-questionnaire: Idempotent studio-default questionnaire seed (production-safe)
seed-questionnaire:
	@echo "Seeding studio-default questionnaire..."
	go run ./cmd/seed-questionnaire

## export-peft-dataset: Export approved product_spec JSONL for PEFT (requires ORG_ID)
export-peft-dataset:
	@test -n "$(ORG_ID)" || (echo "Set ORG_ID=<organization-uuid>" && exit 1)
	go run ./cmd/export-peft-dataset --org-id=$(ORG_ID) --out-dir=$(or $(OUT_DIR),./peft-export) $(ARGS)
