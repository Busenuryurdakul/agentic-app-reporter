# AI Development Configuration Studio — Backend

This repository is a working copy of [gurkanfikretgunak/masterfabric-go](https://github.com/gurkanfikretgunak/masterfabric-go).

It is the **backend** for the frontend repo `agentic-app-reporter`.

## Branch

Product foundation work lives on:

`feature/ai-config-studio-phase1`

## Local setup

1. Install **Docker Desktop** (PostgreSQL + Redis via compose).
2. Copy env:

```bash
cp .env.example.studio .env
```

3. Start infrastructure and migrate (from repo root):

```bash
# Git Bash / WSL:
./dev.sh infra
./dev.sh migrate

# Or:
make docker-up
make migrate
```

4. Seed roles (required for org create → org_admin):

```bash
go run scripts/seed.go
```

5. Run API:

```bash
make run
# or: go run ./cmd/server
```

API: `http://localhost:8080`  
Health: `http://localhost:8080/health/live`

## Frontend pairing

In `agentic-app-reporter/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Backend CORS must allow the Next.js origin (`CORS_ALLOWED_ORIGINS=http://localhost:3000`).

## Phase 1 extensions already applied

- Workspace GET / DELETE
- Resolve org from `X-Organization-ID`
- `workspace:read` / `workspace:write` RBAC
- Product permission placeholders in seed
- Org create → membership + `org_admin`
- CORS headers for workspace

## Do not

- Copy this backend into the frontend repository
- Couple domain code to Gemma or Cursor
