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
metadata (`provider_name`, `model_name`, `source_fingerprint`, status).

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
| 4+ Scoring, monitoring, export | Not started |
