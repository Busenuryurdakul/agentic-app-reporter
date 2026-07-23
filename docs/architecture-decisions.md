# Architecture decisions

Product: **AI Development Configuration Studio**

## Repository layout

**Status:** Accepted

Monorepo root: `agentic-app-reporter`

```
frontend/   # Next.js application
backend/    # Go API (masterfabric-go based)
docs/
```

- One Git repository on GitHub: `Busenuryurdakul/agentic-app-reporter`
- Frontend and backend are separate folders and separate runtimes
- Do not nest a second `.git` inside `backend/`

---

## Platform-independent product direction

The application must remain independent from development tools and LLM vendors.
Cursor, OpenCode, Codex, Claude Code, Gemma are optional targets/providers — not core coupling.

---

## LLM provider architecture

**Status:** Done (Phase 3)

- Domain depends on `LLMProvider` only (`backend/internal/domain/llm`).
- First concrete providers: `mock` (dev/CI) and `gemma` (OpenAI-compatible HTTP).
- Application use-cases call the port; infrastructure registry selects the adapter.
- Context assembly and prompt building live in the application layer; HTTP handlers never
  accept client-assembled prompts or profile/answer payloads for generation.

---

## Workspace

Reuse Tenant `Workspace` in backend. No new Workspace bounded context.

---

## Language

- UI: Turkish
- Generated docs: Turkish and English (per-workspace preference)

---

## Monitoring storage

Do not store raw prompts/outputs by default. Persist Markdown documents + generation
metadata (`provider_name`, `model_name`, `source_fingerprint`, status, approval fields).

---

## Observe scoring (Phase 4)

**Status:** Done (Phase 4)

- Readiness is deterministic: weighted profile completeness + questionnaire fill +
  succeeded-document bonus. No LLM calls.
- Document quality is a fixed heuristic (`has_heading`, length, language) computed
  server-side from persisted Markdown + declared language.
- Export packages Markdown (+ optional ZIP) with YAML front-matter only — never prompts.
- Permissions reuse seed RBAC: `document:read`, `document:approve`, `export:create`.

---

## Phase 5 — MLC backend, observability, Compose scaling

**Status:** Done (Phase 5)

- LLM inference stays **backend-only**; frontend has no browser MLC/WebGPU runtime.
- Compose stack (`--profile stack`): mock MLC REST server, API replicas, nginx LB, Redis
  distributed generation lock, Prometheus + Grafana dashboards.
- Custom metrics: `llm_generation_duration_seconds`, `llm_generation_total`, `llm_inflight`.
- Graceful shutdown waits for in-flight generations; readiness returns `draining` during SIGTERM.
- Frontend `LlmActiveGuard` blocks page unload while generation/regeneration is pending.

---

## Deployment

- Frontend → Vercel (`frontend/`)
- Backend → Render (`backend/`)
- Database → PostgreSQL

---

## Phase status

| Phase | Status |
|-------|--------|
| 1 Foundation | Done (auth, org, workspace, shell) |
| 2 Profile + Questionnaire | Done (API + Turkish UI) |
| 3 Generation / LLMProvider | Done (mock + Gemma, documents API, Üret UI) |
| 4 Observe / scoring / export | Done (readiness, quality, approve, export, Gözlemle UI) |
| 5 MLC backend / Grafana / Compose scale | Done (Redis lock, mock MLC, nginx, reload guard) |
| 6+ PDF / score history / LLM critique | Not started |
