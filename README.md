# AI Development Configuration Studio

Monorepo for the platform-independent development configuration studio.

```
agentic-app-reporter/
  frontend/   # Next.js (Turkish UI)
  backend/    # Go API (extended from masterfabric-go)
  docs/       # Product / architecture docs
```

Frontend and backend live as **folders in one Git repository**. They remain separate applications (separate runtimes), not a single deployable binary.

## Prerequisites

- Node.js 20+
- Go 1.26+
- Docker Desktop (PostgreSQL + Redis for backend)

## Frontend

```bash
cd frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
npm install
npm run dev
```

App: http://localhost:3000

## Backend

```bash
cd backend
cp .env.example.studio .env
# CORS_ALLOWED_ORIGINS=http://localhost:3000

# Git Bash / WSL:
./dev.sh infra
./dev.sh migrate
go run scripts/seed.go
make run
# or: go run ./cmd/server
```

API: http://localhost:8080  
Health: http://localhost:8080/health/live

See `backend/STUDIO.md` for Phase 1–5 backend notes (including LLM + document APIs).

### MLC LLM — Hybrid (Stage 3)

Five modes (A–E): mock dev, HF external, Compose mock, local GPU MLC, Render prod.
Same `gemma` adapter — only env changes.

```bash
make llm-hybrid          # quick reference
# Guide: backend/deployments/LLM_HYBRID.md
```

```bash
# Daily: mock or HF (your .env)
make run

# Integration: Compose mock stack
make compose-up-full && make verify-mlc

# GPU MLC (optional)
make compose-up-mlc-gpu

# Render: deployments/render-external-llm.md
```

Details: `backend/deployments/LLM_HYBRID.md`, `STAGE3_MLC_PLAN.md`

## Architecture

- Separate apps in a monorepo
- Backend extends masterfabric-go conventions
- LLM via `LLMProvider` abstraction (Phase 3 Done) — mock/Gemma adapters; not coupled to Cursor
- Docs: `docs/architecture-decisions.md`, plan: `PHASE3_PLAN.md`

## Remote

`origin` → https://github.com/Busenuryurdakul/agentic-app-reporter.git
