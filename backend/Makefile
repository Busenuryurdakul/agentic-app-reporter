.PHONY: build run test lint migrate migrate-down docker-up docker-down compose-up-full compose-scale-api k8s-apply k8s-delete clean help

APP_NAME := masterfabric
BUILD_DIR := bin
MAIN_PATH := ./cmd/server
MIGRATION_DIR := internal/infrastructure/postgres/migrations
DB_DSN ?= postgres://masterfabric:masterfabric@localhost:5432/masterfabric?sslmode=disable
COMPOSE_FILE := deployments/docker-compose.yml
COMPOSE := docker compose -f $(COMPOSE_FILE)
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

## compose-scale-api: Scale API replicas (default 3)
compose-scale-api:
	@echo "Scaling API replicas..."
	$(COMPOSE) --profile stack up -d --scale api=3

## compose-down-full: Stop full stack including profile services
compose-down-full:
	$(COMPOSE) --profile stack down

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
