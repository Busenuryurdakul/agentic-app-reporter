# Ollama VPS setup (production)

Run Ollama on a **separate VPS** with HTTPS. Render (`agentic-app-reporter-api`) calls it via
`LLM_PROVIDER=ollama` and `LLM_BASE_URL=https://<your-domain>/v1`.

**Do not commit real domains, IPs, or secrets to git.** Keep them in:

- VPS: `/etc/caddy/Caddyfile` (Bearer token)
- Local: `backend/.env` (never committed)
- Render: Dashboard env vars (or `sync_render_llm_ollama.mjs` from local `.env`)

## Prerequisites

| Item | Notes |
|------|--------|
| VPS | Ubuntu 22.04+ recommended; 8 GB+ RAM for `llama3.2` CPU inference |
| DNS | `A` record: `ollama.example.com` → VPS public IPv4 |
| Firewall | Allow **22**, **80**, **443**; **do not** expose `11434` publicly |
| Render | `LLM_PROVIDER=ollama`, `LLM_MODEL=llama3.2` already set |

## Step 1 — Provision VPS and DNS

1. Create a VPS (Hetzner, DigitalOcean, AWS Lightsail, etc.).
2. Point your subdomain (e.g. `ollama.example.com`) to the VPS IP.
3. Wait for DNS propagation (`dig +short ollama.example.com`).

## Step 2 — Install Ollama + Caddy on the VPS

SSH into the VPS, copy this folder's `setup-ollama-vps.sh` to the server, then:

```bash
export OLLAMA_DOMAIN="ollama.example.com"
export OLLAMA_BEARER_TOKEN="$(openssl rand -hex 32)"
export OLLAMA_MODEL="llama3.2"

sudo -E bash setup-ollama-vps.sh
```

Save the printed `OLLAMA_BEARER_TOKEN` — you will need the same value as Render `LLM_API_KEY`.

## Step 3 — Verify HTTPS endpoint (from your laptop)

Add to `backend/.env` (local only, not committed):

```env
OLLAMA_BASE_URL=https://ollama.example.com/v1
OLLAMA_BEARER_TOKEN=<same secret as Caddy>
OLLAMA_MODEL=llama3.2
```

Run:

```bash
cd backend
node ./scripts/verify_ollama_endpoint.mjs
```

Expected:

- `GET /v1/models` → 200, model list includes `llama3.2`
- `POST /v1/chat/completions` → 200, non-empty assistant content

## Step 4 — Update Render (after verification passes)

In `backend/.env` also set:

```env
RENDER_API_KEY=rnd_...
LLM_BASE_URL=https://ollama.example.com/v1
LLM_API_KEY=<same OLLAMA_BEARER_TOKEN>
```

Then:

```bash
cd backend
node ./scripts/sync_render_llm_ollama.mjs
```

This updates Render `LLM_BASE_URL` (and `LLM_API_KEY` if set), triggers redeploy, and **never**
writes URLs into the repo.

## Step 5 — Production smoke (after Render redeploy)

```bash
node ./scripts/diagnose_production_generate.mjs
```

Also check JWT `GET /api/v1/llm/health` and a document generate call.

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `401` on `/v1/models` | Wrong or missing `Authorization: Bearer` |
| `502` / connection refused | Caddy not running or DNS not pointing to VPS |
| Model missing in `/v1/models` | Run `ollama pull llama3.2` on VPS |
| Render generate still fails | Render still on old `LLM_BASE_URL` (Hugging Face); re-run sync script |
| Health OK, generate fails | Org-level LLM override — reset in Settings → LLM Ayarları |

## Files in this folder

| File | Purpose |
|------|---------|
| `setup-ollama-vps.sh` | Idempotent Ollama + Caddy install on Ubuntu |
| `Caddyfile.example` | Reference Caddy config (Bearer auth + TLS) |
| [`KURULUM-KONTROL-LISTESI.md`](KURULUM-KONTROL-LISTESI.md) | Güvenli kurulum denetim checklist'i (TR) |

See also: [`../render-ollama-production.md`](../render-ollama-production.md)
