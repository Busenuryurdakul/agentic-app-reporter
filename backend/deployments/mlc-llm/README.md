# MLC-LLM GPU Server (Docker)

OpenAI-compatible REST server for local GPU inference. The Go backend connects via
`LLM_PROVIDER=gemma` and `LLM_BASE_URL=http://<host>:8081/v1` — no browser MLC runtime.

## Requirements

- NVIDIA GPU with sufficient VRAM (Gemma 2B q4 ≈ 2–4 GB)
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)
- Docker Desktop (Windows/macOS) or Docker Engine (Linux)

## Quick start (standalone)

```bash
cd backend
docker build -f deployments/mlc-llm/Dockerfile -t masterfabric-mlc-llm deployments/mlc-llm

docker run --gpus all -p 8081:8080 \
  -e MLC_MODEL=HF://mlc-ai/gemma-2b-it-q4f16_1-MLC \
  -v mlc-cache:/root/.cache/mlc_llm \
  masterfabric-mlc-llm
```

Probe: `curl http://127.0.0.1:8081/v1/models`

Backend `.env` (API on host):

```env
LLM_PROVIDER=gemma
LLM_BASE_URL=http://127.0.0.1:8081/v1
LLM_MODEL=HF://mlc-ai/gemma-2b-it-q4f16_1-MLC
LLM_API_KEY=local-dev
LLM_TIMEOUT_SECONDS=120
SERVER_WRITE_TIMEOUT_SECONDS=130
```

Verify: `node ./scripts/verify_mlc_compose.mjs`

## Compose full stack (GPU)

Replaces the mock `mlc-llm` service when the `mlc-gpu` profile is active:

```bash
make docker-up
make migrate && go run ./scripts
make compose-up-mlc-gpu
```

Without GPU, use the mock stack instead:

```bash
make compose-up-full
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MLC_MODEL` | `HF://mlc-ai/gemma-2b-it-q4f16_1-MLC` | Hugging Face MLC model URI |
| `MLC_HOST` | `0.0.0.0` | Bind address |
| `MLC_PORT` | `8080` | Container listen port |
| `MLC_MODE` | `local` | Engine mode: `local`, `interactive`, `server` |
| `MLC_DEVICE` | `auto` | Device: `cuda`, `auto`, etc. |

## Supported Gemma models (examples)

| Model | VRAM (approx.) |
|-------|----------------|
| `HF://mlc-ai/gemma-2b-it-q4f16_1-MLC` | 2–4 GB |
| `HF://mlc-ai/gemma-2-9b-it-q3f16_1-MLC` | 6–8 GB |

First run triggers model download and JIT compile — allow 5–15 minutes before `/v1/models` returns 200.

## Render + external LLM

Render cannot run GPU workloads on the free tier. Deploy this image on a GPU VM
(RunPod, Clore.ai, AWS g4dn, etc.) and point Render API env at the public HTTPS endpoint:

```env
LLM_PROVIDER=gemma
LLM_BASE_URL=https://mlc.your-domain.com/v1
LLM_MODEL=HF://mlc-ai/gemma-2b-it-q4f16_1-MLC
LLM_API_KEY=<shared-secret>
LLM_ALLOW_MOCK_IN_PRODUCTION=false
```

See `deployments/render-external-llm.md` for the full Render checklist.
