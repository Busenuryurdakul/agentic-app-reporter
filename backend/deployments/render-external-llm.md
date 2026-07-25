# Render API + External LLM (MLC / OpenAI-compatible)

Render free tier has **no GPU**. Run MLC-LLM on a separate GPU host and point the
Render-deployed Go API at that endpoint via environment variables.

## Architecture

```
Vercel (frontend) → Render (Go API + Postgres) → External GPU host (mlc_llm serve)
```

The backend uses the existing `gemma` HTTP adapter — no Render-side LLM container.

## Render environment variables

Set these in the Render dashboard for `agentic-app-reporter-api`:

| Variable | Example | Required |
|----------|---------|----------|
| `LLM_ENABLED` | `true` | yes |
| `LLM_PROVIDER` | `gemma` | yes |
| `LLM_BASE_URL` | `https://mlc.example.com/v1` | yes |
| `LLM_MODEL` | `HF://mlc-ai/gemma-2b-it-q4f16_1-MLC` | yes |
| `LLM_API_KEY` | shared secret or provider key | yes (production) |
| `LLM_TIMEOUT_SECONDS` | `120` | recommended |
| `LLM_MAX_RETRIES` | `2` | optional |
| `LLM_ALLOW_MOCK_IN_PRODUCTION` | `false` | yes |
| `SERVER_WRITE_TIMEOUT_SECONDS` | `130` | must exceed LLM timeout |
| `CORS_ALLOWED_ORIGINS` | your Vercel URL(s) | yes |

`render.yaml` declares `LLM_BASE_URL`, `LLM_MODEL`, and `LLM_API_KEY` with `sync: false`
so you set them manually after the first deploy.

Full deployment guide (Vercel, CORS, questionnaire seed, smoke tests):
[`docs/deployment.md`](../../docs/deployment.md)

## External GPU host options

1. **Self-hosted Docker** — `deployments/mlc-llm/Dockerfile` on a GPU VM
2. **RunPod / Clore.ai / similar** — CUDA VM + same Docker image
3. **Hugging Face Inference** — `LLM_BASE_URL=https://router.huggingface.co/v1` (no MLC container)

### Expose MLC securely

- Put **nginx or Caddy** in front with TLS (Let's Encrypt)
- Restrict ingress to Render outbound IPs if possible, or require `Authorization: Bearer`
- Match `LLM_API_KEY` on Render with the reverse-proxy or MLC auth layer

### Minimal GPU VM run

```bash
docker build -f deployments/mlc-llm/Dockerfile -t masterfabric-mlc-llm deployments/mlc-llm
docker run -d --gpus all --restart unless-stopped \
  -p 8080:8080 \
  -e MLC_MODE=server \
  -v mlc-cache:/root/.cache/mlc_llm \
  masterfabric-mlc-llm
```

Public URL (with TLS terminator): `https://mlc.example.com/v1`

## Verification

From your machine (after Render deploy):

```bash
# Direct LLM probe
curl -s https://mlc.example.com/v1/models

# Full backend health (requires JWT — see scripts/verify_llm.mjs)
LLM_BASE_URL=https://mlc.example.com/v1 \
LLM_API_KEY=your-key \
LLM_MODEL=HF://mlc-ai/gemma-2b-it-q4f16_1-MLC \
API_BASE=https://your-render-api.onrender.com/api/v1 \
node ./scripts/verify_llm.mjs
```

## Rollback

If the external LLM is unavailable, temporarily set on Render:

```env
LLM_PROVIDER=mock
LLM_ALLOW_MOCK_IN_PRODUCTION=true
```

Remove after the GPU host is healthy. Mock returns deterministic Markdown only.

## Local parity

See **`deployments/LLM_HYBRID.md`** for the full hybrid mode matrix (A–E).

| Local | Production equivalent |
|-------|------------------------|
| Mode A mock / Mode B HF | Render Mode E (same HF URL) |
| `make compose-up-full` (mock) | Render mock override (dev only) |
| `make compose-up-mlc-gpu` | GPU VM + `LLM_BASE_URL` on Render |
