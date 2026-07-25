# Production Deployment (Render + Vercel)

Deploy the Go API and Postgres on **Render**, the Next.js frontend on **Vercel**.
External LLM (Hugging Face or GPU-hosted MLC) is required — Render has no GPU.

```
Vercel (frontend) → Render (API + Postgres) → External LLM (OpenAI-compatible /v1)
```

Detailed LLM options: [`backend/deployments/render-external-llm.md`](../backend/deployments/render-external-llm.md)

---

## 1. Render (backend)

### Blueprint

Repo root [`render.yaml`](../render.yaml) defines:

- Web service `agentic-app-reporter-api` (Docker, `rootDir: backend`)
- Postgres `agentic-app-reporter-db`
- Auto `DATABASE_URL`, generated `JWT_SECRET`
- Health check: `GET /health/live`
- Migrations on container start (`goose up` in `render-entrypoint.sh`)

**Render Dashboard → New → Blueprint** → connect repo → apply.

### Build / start (automatic)

| Step | Mechanism |
|------|-----------|
| Build | `docker build -f deployments/Dockerfile` (multi-stage Go binary) |
| Start | `/app/render-entrypoint.sh` → `goose up` → `/app/masterfabric` |
| Migrations | Every deploy (idempotent `goose up`) |

No manual build/start commands needed for Docker runtime.

### Render environment variables

**Set by Blueprint (no action):**

| Variable | Value |
|----------|--------|
| `APP_ENV` | `production` |
| `SERVER_HOST` | `0.0.0.0` |
| `PORT` | Injected by Render |
| `SERVER_WRITE_TIMEOUT_SECONDS` | `130` |
| `KAFKA_ENABLED` | `false` |
| `LLM_ENABLED` | `true` |
| `LLM_PROVIDER` | `gemma` |
| `LLM_ALLOW_MOCK_IN_PRODUCTION` | `false` |
| `LLM_TIMEOUT_SECONDS` | `120` |
| `LLM_MAX_RETRIES` | `2` |
| `LOG_LEVEL` | `info` |
| `LOG_FORMAT` | `json` |
| `JWT_SECRET` | Auto-generated |
| `DATABASE_URL` | From Render Postgres |
| `CORS_ALLOWED_ORIGINS` | Vercel URL(s) — verify after first Vercel deploy |

**Set manually in Render dashboard (secrets, `sync: false`):**

| Variable | Example |
|----------|---------|
| `LLM_BASE_URL` | `https://router.huggingface.co/v1` |
| `LLM_MODEL` | `google/gemma-2-2b-it:featherless-ai` |
| `LLM_API_KEY` | `hf_...` |

> Production blocks `LLM_PROVIDER=mock` unless `LLM_ALLOW_MOCK_IN_PRODUCTION=true` (not recommended).

**Optional:**

| Variable | When |
|----------|------|
| `REDIS_URL` | Upstash Redis if scaling beyond one instance |
| `CORS_ALLOWED_ORIGINS` | Update when Vercel URL or custom domain changes |

### Questionnaire seed (required once per database)

RBAC roles and the **studio-default questionnaire** seed automatically on API startup
(`pgBootstrap.Run` + Render entrypoint `seed-questionnaire`). The standalone command
remains for manual re-runs:

```bash
make seed-questionnaire   # or /app/seed-questionnaire on Render Shell
```

Properties:

- Idempotent (safe to re-run)
- Upserts by stable question keys (no duplicate rows)
- Verifies `studio-default` set exists, is active/default, question count matches catalog
- Exits non-zero with a clear message on failure

Full dev seed (roles + questionnaire):

```bash
make seed          # go run ./scripts
```

---

## 2. Vercel (frontend)

### Project settings

| Setting | Value |
|---------|--------|
| Root Directory | `frontend` |
| Framework | Next.js |
| Build Command | `npm run build` (default) |
| Install Command | `npm install` (default) |

### Vercel environment variables

| Variable | Production value |
|----------|------------------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://<your-render-service>.onrender.com` |

Rules:

- Use the **backend host root only** — do **not** append `/api/v1`
- Local example: `http://localhost:8080` (see `frontend/.env.example`)
- `NEXT_PUBLIC_*` is inlined at **build time** — redeploy after changing

Copy local env:

```bash
cd frontend
cp .env.example .env.local
```

---

## 3. CORS check

Backend reads comma-separated origins from `CORS_ALLOWED_ORIGINS`.

After Vercel deploy, confirm the **exact** Production URL is listed in Render, e.g.:

```
https://your-app.vercel.app
```

Include preview URLs only if you test preview deployments against production API.

Symptom of mismatch: browser Network tab shows CORS error; API logs show blocked origin.

---

## 4. Production smoke test order

Run in this order after both platforms are deployed and questionnaire seed succeeded.

### Infrastructure

1. `GET https://<render>/health/live` → `200`, `{"status":"alive"}`
2. `GET https://<render>/health/ready` → `200`, postgres `healthy`

### LLM

3. `GET https://<render>/api/v1/llm/health` (Bearer JWT) → `provider=gemma`, `healthy=true`

### Auth & tenant

4. `POST /api/v1/auth/register` → new user
5. `POST /api/v1/auth/login` → JWT
6. Create organization + workspace

### Studio flow

7. `GET /api/v1/questionnaires/default` → `studio-default` set with questions
8. Update project profile
9. Answer questionnaire items
10. `POST .../documents/generate` → markdown document (allow up to ~120s)
11. `GET .../readiness` → score
12. Export ZIP download

### Frontend (browser)

13. Open Vercel Production URL
14. Register / login → org → workspace
15. Plan / Anket / Üret / Gözlem pages load without CORS errors
16. Document generation completes and renders

### Scripts (optional, from `backend/`)

```bash
API_BASE=https://<render>/api/v1 node ./scripts/verify_hybrid_llm.mjs
```

---

## 5. Checklist before go-live

- [ ] `render.yaml` pushed (gemma provider, mock blocked)
- [ ] `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY` set on Render
- [ ] First deploy green; migrations applied
- [ ] `/app/seed-questionnaire` run once
- [ ] `CORS_ALLOWED_ORIGINS` matches Vercel URL
- [ ] `NEXT_PUBLIC_API_BASE_URL` set on Vercel + redeployed
- [ ] Production smoke list above passes
