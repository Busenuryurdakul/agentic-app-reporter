# Architecture decisions

Product: **AI Development Configuration Studio**

## Repository layout

**Status:** Accepted (updated)

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

Domain depends on `LLMProvider` only (implement in generation phase).
First provider: backend-orchestrated Gemma.

---

## Workspace

Reuse Tenant `Workspace` in backend. No new Workspace bounded context.

---

## Language

- UI: Turkish
- Generated docs: Turkish and English (per-workspace preference)

---

## Monitoring storage

Do not store raw prompts/outputs by default.

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
| 3 Generation / LLMProvider | Not started |
| 4+ Scoring, monitoring, export | Not started |
