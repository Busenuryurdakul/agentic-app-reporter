# Render API + VPS Ollama (production)

Render free tier has **no GPU** and cannot reach `localhost`, `127.0.0.1`, or
`host.docker.internal`. Run Ollama on a VPS with a public HTTPS endpoint and point
the Render-deployed Go API at that URL via environment variables.

## Architecture

```
Vercel (frontend) → Render (Go API + Postgres) → VPS (Ollama + Caddy/Nginx TLS)
```

The backend uses the `ollama` provider, which speaks Ollama's OpenAI-compatible API
(`GET /v1/models`, `POST /v1/chat/completions`).

## 1. VPS — install Ollama

On Ubuntu 22.04+ (or similar):

```bash
curl -fsSL https://ollama.com/install.sh | sh
sudo systemctl enable ollama
sudo systemctl start ollama
ollama pull llama3.2
```

Verify locally on the VPS:

```bash
curl -s http://127.0.0.1:11434/v1/models
```

Ollama listens on `127.0.0.1:11434` by default. Do **not** expose that port directly
to the internet.

## 2. Reverse proxy — Caddy (recommended)

Install Caddy and terminate TLS with Let's Encrypt. Example `/etc/caddy/Caddyfile`:

```caddyfile
ollama.example.com {
    @authorized {
        header Authorization "Bearer YOUR_SHARED_SECRET"
    }
    handle @authorized {
        reverse_proxy 127.0.0.1:11434
    }
    respond "Unauthorized" 401
}
```

Reload:

```bash
sudo systemctl reload caddy
```

Production base URL for Render:

```text
https://ollama.example.com/v1
```

## 2b. Reverse proxy — Nginx (alternative)

```nginx
server {
    listen 443 ssl http2;
    server_name ollama.example.com;

    ssl_certificate     /etc/letsencrypt/live/ollama.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ollama.example.com/privkey.pem;

    location / {
        if ($http_authorization != "Bearer YOUR_SHARED_SECRET") {
            return 401;
        }
        proxy_pass http://127.0.0.1:11434;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_read_timeout 300s;
    }
}
```

## 3. Bearer token auth

When the reverse proxy validates `Authorization: Bearer …`, set the same secret on
Render as `LLM_API_KEY`. The backend sends it on every LLM request.

If your proxy does not require auth (not recommended), leave `LLM_API_KEY` unset.

## 4. Render environment variables

Set these in the Render dashboard for `agentic-app-reporter-api`:

| Variable | Example | Required |
|----------|---------|----------|
| `APP_ENV` | `production` | yes |
| `LLM_ENABLED` | `true` | yes |
| `LLM_PROVIDER` | `ollama` | yes |
| `LLM_BASE_URL` | `https://ollama.example.com/v1` | yes (real URL; not in repo) |
| `LLM_MODEL` | `llama3.2` | yes |
| `LLM_API_KEY` | same as Caddy/Nginx Bearer secret | if proxy requires auth |
| `LLM_TIMEOUT_SECONDS` | `120` | recommended |
| `LLM_MAX_RETRIES` | `2` | optional |
| `LLM_ALLOW_MOCK_IN_PRODUCTION` | `false` | yes |
| `SERVER_WRITE_TIMEOUT_SECONDS` | `130` | must exceed LLM timeout |
| `CORS_ALLOWED_ORIGINS` | your Vercel URL(s) | yes |

`render.yaml` declares `LLM_BASE_URL` and optional `LLM_API_KEY` with `sync: false`
so blueprint updates never overwrite your production secrets or URL.

### Config validation (production)

The API refuses to start when:

- `LLM_PROVIDER=ollama` and `LLM_BASE_URL` is empty
- `LLM_BASE_URL` uses `localhost`, `127.0.0.1`, or `host.docker.internal`

Development (`APP_ENV=development`) still allows local Ollama URLs.

## 5. Org-level override cleanup

If you previously saved org-level LLM settings (e.g. Hugging Face / Gemma during E2E
tests), reset them so production uses environment defaults:

1. Open **Settings → LLM Ayarları** in the frontend.
2. Click **Ortam varsayılanına sıfırla** (Reset to environment default).

Or delete the row in `organization_llm_settings` for that org.

Org overrides that point at localhost will fail validation in production when saved.

## 6. Production smoke tests

Replace placeholders with your real values.

### Direct Ollama probe (from your machine)

```bash
export OLLAMA_URL="https://ollama.example.com/v1"
export OLLAMA_TOKEN="YOUR_SHARED_SECRET"

curl -s -H "Authorization: Bearer ${OLLAMA_TOKEN}" "${OLLAMA_URL}/models"
```

### Render API health (no auth)

```bash
curl -s https://agentic-app-reporter-api.onrender.com/health/live
```

### Backend LLM health (JWT required)

```bash
export API_BASE="https://agentic-app-reporter-api.onrender.com/api/v1"
export EMAIL="your-user@example.com"
export PASSWORD="your-password"

TOKEN=$(curl -s -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" | jq -r .access_token)

curl -s "${API_BASE}/llm/health" \
  -H "Authorization: Bearer ${TOKEN}"
```

Expect `healthy: true` and `provider: ollama`.

### Org LLM test connection (frontend or API)

```bash
export ORG_ID="your-org-uuid"

curl -s -X POST "${API_BASE}/organizations/${ORG_ID}/llm-settings/test-connection" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Product spec generate

```bash
curl -s -X POST "${API_BASE}/organizations/${ORG_ID}/apps/${APP_ID}/product-spec/generate" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "X-Organization-ID: ${ORG_ID}" \
  -H "X-App-ID: ${APP_ID}" \
  -d '{"prompt":"Short smoke test spec"}'
```

Confirm response metadata shows `provider_name=ollama`, `model_name=llama3.2`, and no
Hugging Face `provider_quota` errors.

## Production verification (2026-07-28) — GO

Verified on `agentic-app-reporter-api.onrender.com` after VPS Ollama URL and Render
env vars were configured (values live in Render dashboard only; not in repo).

| Check | Result |
|-------|--------|
| `GET /health/live` | 200 |
| `GET /health/ready` | 200 |
| Settings → Test Connection | succeeded |
| `product_spec` generate | succeeded |
| regenerate | succeeded |
| `provider_name` | `ollama` |
| `model_name` | `llama3.2` |
| `provider_quota` | no longer returned (HF quota path removed) |

## Operations — org-level Gemma/HF override cleanup

E2E or manual tests may have saved org-level overrides pointing at Hugging Face /
Gemma. Before relying on platform env defaults for all orgs:

1. **Settings → LLM Ayarları → Ortam varsayılanına sıfırla** per affected org, or
2. Delete the row in `organization_llm_settings` for that `organization_id`.

Until reset, an org override takes precedence over Render env vars.

## Known technical debt (out of scope for this migration)

`go test ./...` reports two pre-existing failures in
`internal/application/datasetexport/usecase`:

- `TestExportPEFTDataset_BT6_IncludesLegacyNoFingerprintWhenFlagSet`
- `TestExportPEFTDataset_BT8_AssistantContentEqualsMarkdownBody`

Track and fix in a separate commit; not part of the Ollama production migration.

## Rollback

If the VPS Ollama host is unavailable, temporarily on Render:

```env
LLM_PROVIDER=mock
LLM_ALLOW_MOCK_IN_PRODUCTION=true
```

Remove after Ollama is healthy. Mock returns deterministic Markdown only.

## Related docs

- [`render-external-llm.md`](render-external-llm.md) — legacy MLC / Hugging Face setup
- [`../../docs/deployment.md`](../../docs/deployment.md) — full deployment guide
