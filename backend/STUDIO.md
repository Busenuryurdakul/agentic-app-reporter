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
go run ./scripts
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

## Access model (Phase 2)

### Workspaces are organization-scoped, not user-owned

- A workspace belongs to exactly one organization (`organization_id`).
- There is **no per-user workspace owner** field and no user-level ACL on workspaces.
- Access is granted when the caller has a valid JWT **and** the required RBAC permission
  (`profile:*`, `questionnaire:*`, `answer:*`, `workspace:*`) **in that organization**.
- Any member of the organization who holds the relevant permission can access that
  organization's workspaces. This is the expected product behavior.
- Cross-organization access is denied: path `workspaceId` must belong to the active
  organization resolved from `X-Organization-ID` / JWT / subdomain (403 otherwise).

### Organization context and RBAC

- `TenantResolver` places `X-Organization-ID` into request context; it does **not**
  verify membership by itself.
- Membership / authorization is enforced by `RequirePermission` → `RBACService.HasPermission`,
  which loads permissions from `user_roles` for `(user_id, organization_id)`.
  Spoofing `X-Organization-ID` for an organization where the user has no role yields **403**.
- In production (`APP_ENV=production|prod`), the server refuses to start if `AuthService`
  or `RBACService` is nil, so permission middleware cannot silently become a no-op.

### Questionnaire sets

- Global / default sets (`organization_id IS NULL`, e.g. `studio-default`) are readable
  by every organization that has `questionnaire:read`.
- Organization-specific sets are readable only by their owning organization.
  Knowing a set UUID is not sufficient for cross-org access (403).

## Do not

- Copy this backend into the frontend repository
- Couple domain code to Gemma or Cursor
