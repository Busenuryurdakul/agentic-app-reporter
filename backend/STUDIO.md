# AI Development Configuration Studio — Backend

This repository is a working copy of [gurkanfikretgunak/masterfabric-go](https://github.com/gurkanfikretgunak/masterfabric-go).

It is the **backend** for the frontend in the monorepo `agentic-app-reporter/frontend`.

## Local setup

1. Install **Docker Desktop** (PostgreSQL + Redis via compose), or use a local PostgreSQL.
2. Copy env:

```bash
cp .env.example.studio .env
```

3. Start infrastructure and migrate:

```bash
# Git Bash / WSL:
./dev.sh infra
./dev.sh migrate

# Or:
make docker-up
make migrate
```

4. Seed roles (required for org create → org_admin) and questionnaire catalog:

```bash
go run ./scripts
```

5. Run API:

```bash
make run
# or: go run ./cmd/server
```

API: `http://localhost:8080`  
Health: `http://localhost:8080/health/live`  
LLM health: `http://localhost:8080/api/v1/llm/health` (JWT + `generation:read`)

## Frontend pairing

In `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Backend CORS must allow the Next.js origin (`CORS_ALLOWED_ORIGINS=http://localhost:3000`).

## Phase 1 extensions

- Workspace GET / DELETE
- Resolve org from `X-Organization-ID`
- `workspace:read` / `workspace:write` RBAC
- Product permission placeholders in seed
- Org create → membership + `org_admin`
- CORS headers for workspace

## Access model (Phase 2)

### Workspaces are organization-scoped, not user-owned

- A workspace belongs to exactly one organization (`organization_id`).
- There is **no per-user workspace owner** field and no user-level ACL on workspaces.
- Access is granted when the caller has a valid JWT **and** the required RBAC permission
  (`profile:*`, `questionnaire:*`, `answer:*`, `workspace:*`, `document:*`, `generation:*`)
  **in that organization**.
- Cross-organization access is denied: path `workspaceId` must belong to the active
  organization resolved from `X-Organization-ID` / JWT / subdomain (403 otherwise).

### Organization context and RBAC

- `TenantResolver` places `X-Organization-ID` into request context; it does **not**
  verify membership by itself.
- Membership / authorization is enforced by `RequirePermission` → `RBACService.HasPermission`.
- Spoofing `X-Organization-ID` for an organization where the user has no role yields **403**.
- In production (`APP_ENV=production|prod`), the server refuses to start if `AuthService`
  or `RBACService` is nil, so permission middleware cannot silently become a no-op.

### Questionnaire sets

- Global / default sets (`organization_id IS NULL`, e.g. `studio-default`) are readable
  by every organization that has `questionnaire:read`.
- Organization-specific sets are readable only by their owning organization.

## Phase 3 — LLM + Markdown generation

### Architecture rules

1. Business logic depends only on `domain/llm.LLMProvider` — never on Gemma concretions.
2. Workspace LLM context is assembled **only on the backend** (`WorkspaceContextBuilder` +
   `PromptBuilder`). The frontend must not send profile/answers/prompts for generation.
3. Phase 2 visibility applies: inactive or hidden questions never enter the prompt context.
4. Secrets (`api_key`, tokens, etc.) are redacted before prompt assembly; logs record
   provider/workspace/duration only — never full prompts or API keys.
5. Persisted product artifact is Markdown in `generated_documents` (+ metadata). Raw
   prompts/outputs are not stored by default.

### Providers

| Name | Config | Notes |
|------|--------|--------|
| `mock` | `LLM_PROVIDER=mock` | Deterministic Markdown; default for local/CI |
| `gemma` | `LLM_PROVIDER=gemma` + `LLM_BASE_URL` | OpenAI-compatible `/v1/chat/completions` |

See `.env.example.studio` for `LLM_*` variables. Production blocks mock unless
`LLM_ALLOW_MOCK_IN_PRODUCTION=true`. Gemma in production also requires `LLM_API_KEY`.

Resilience: per-attempt timeout + retries on 429/5xx/timeout (`LLM_TIMEOUT_SECONDS`,
`LLM_MAX_RETRIES`). Set `SERVER_WRITE_TIMEOUT_SECONDS` ≥ `LLM_TIMEOUT_SECONDS` (+ buffer);
Default and `.env.example.studio` use `90` so sync generate is not cut off by the HTTP write timeout.

Overlapping generate/regenerate for the same workspace returns **409 Conflict** (in-process
gate; not a distributed lock across replicas). Provider failures return **502/503** with a
safe message and also persist a `status=failed` document row (`error_message` + fingerprint,
empty body) so the attempt appears in the list.

### Document API

All routes require JWT + `X-Organization-ID`. Workspace must belong to that org.

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/v1/llm/health` | `generation:read` |
| POST | `/api/v1/workspaces/{workspaceId}/documents/generate` | `generation:run` |
| GET | `/api/v1/workspaces/{workspaceId}/documents` | `document:read` |
| GET | `/api/v1/workspaces/{workspaceId}/documents/{documentId}` | `document:read` |
| POST | `/api/v1/workspaces/{workspaceId}/documents/{documentId}/regenerate` | `generation:run` |

Generate body (optional): `{ "title": "...", "language": "tr"|"en" }`.  
Language defaults to workspace `preferred_document_language`.  
Missing required questionnaire answers are a soft gate (listed in context; generate still runs).

Regenerate creates a **new** document row; the source document is kept.

Migration: `00016_generated_documents.sql`.

### Smoke

With the API running (`LLM_PROVIDER=mock`):

```bash
node ./scripts/smoke_phase3_documents.mjs
```

### Soft incompleteness

`WorkspaceContextBuilder` reports `MissingRequired` for visible required questions without
answers. Generation does **not** hard-fail with 422 for incomplete questionnaires in Phase 3.

## Do not

- Copy this backend into the frontend repository
- Couple domain / application code to Gemma or Cursor concretions
- Accept client-built LLM context (profile + answers) on generate endpoints
