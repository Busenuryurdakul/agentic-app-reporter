# Hybrid LLM Strategy

One Go codebase (`LLMProvider` port), multiple runtimes selected by **environment only**.
No frontend changes between modes.

## Modes

| Mode | When | Provider | Runtime | Start |
|------|------|----------|---------|-------|
| **A — Fast dev** | Daily UI/API work | `mock` | In-process | `make run` |
| **B — External HF** | Real model, no GPU | `gemma` | Hugging Face Inference | `make run` + HF env |
| **C — Compose mock** | Integration / smoke | `gemma` | `mock-llm` container | `make compose-up-full` |
| **D — Local MLC GPU** | MLC validation | `gemma` | `mlc-llm` container | `make compose-up-mlc-gpu` |
| **E — Render prod** | Production | `gemma` | External URL (HF or GPU VM) | Render + manual env |

## Recommended workflow

```
Daily dev     → Mode A (mock) or B (HF if you have a key)
Before PR     → Mode C (compose-up-full + smoke_phase5_compose.mjs)
MLC tuning    → Mode D (GPU machine only)
Production    → Mode E (Render API + same HF URL or MLC GPU host)
```

## Environment templates

Copy the block you need into `backend/.env` (from `.env.example.studio`).

### A — Fast dev (default)

```env
LLM_PROVIDER=mock
LLM_TIMEOUT_SECONDS=60
SERVER_WRITE_TIMEOUT_SECONDS=90
```

### B — Hugging Face (native API)

```env
LLM_PROVIDER=gemma
LLM_BASE_URL=https://router.huggingface.co/v1
LLM_MODEL=google/gemma-2-2b-it:featherless-ai
LLM_API_KEY=hf_...
LLM_TIMEOUT_SECONDS=120
SERVER_WRITE_TIMEOUT_SECONDS=130
```

Verify: `node ./scripts/verify_llm.mjs`

### C — Compose mock stack

Start stack (API on nginx `:8080`, MLC mock on `:8081`):

```bash
make docker-up && make migrate && go run ./scripts
make compose-up-full
```

Frontend: `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`

Verify: `make verify-mlc` then `node ./scripts/smoke_phase5_compose.mjs`

### D — Local MLC GPU

Requires NVIDIA Container Toolkit.

```bash
make docker-up && make migrate && go run ./scripts
make compose-up-mlc-gpu    # first run: JIT compile may take 5–15 min
make verify-mlc
```

Stop: `make compose-down-mlc-gpu` or `make compose-down-full`

### E — Render production

1. Deploy blueprint (`render.yaml`)
2. Set in Render dashboard:
   - `LLM_BASE_URL` — HF router or `https://mlc.your-domain.com/v1`
   - `LLM_MODEL`
   - `LLM_API_KEY`
3. See `deployments/render-external-llm.md`

## Verify commands

| Check | Command |
|-------|---------|
| **Hybrid (recommended)** | `make verify-hybrid` |
| MLC/mock endpoint (:8081) | `make verify-mlc` |
| HF + API (legacy script) | `node ./scripts/verify_llm.mjs` |
| Full Compose stack | `node ./scripts/smoke_phase5_compose.mjs` |
| No browser LLM guard | `node ./scripts/check-no-browser-llm.mjs` |

## Stop stacks

| Started with | Stop with |
|--------------|-----------|
| `compose-up-full` | `make compose-down-full` |
| `compose-up-mlc-gpu` | `make compose-down-mlc-gpu` or `make compose-down-full` |

`compose-down-full` stops both mock and GPU overlay stacks safely.

## Rules

- Never add browser MLC (`@mlc-ai/web-llm`) to the frontend
- Production: `LLM_ALLOW_MOCK_IN_PRODUCTION=false`
- Keep `SERVER_WRITE_TIMEOUT_SECONDS` > `LLM_TIMEOUT_SECONDS`
- Same `gemma` adapter for HF, MLC, Ollama — only `LLM_BASE_URL` changes
