# Fine-tune Gemma 2B (Unsloth LoRA)

Offline LoRA training for **`product_spec`** documents exported by the Studio PEFT CLI.
Training runs **outside** the Go API — on a CUDA GPU host — then the adapter is served via
an OpenAI-compatible endpoint and selected in org LLM settings.

## Pipeline

```
Studio (generate → approve product_spec)
    ↓
export-peft-dataset CLI  →  train.jsonl / val.jsonl / manifest.json
    ↓
train_lora.py (this folder, Unsloth + TRL)
    ↓
lora_adapter/  (+ optional merged_16bit/)
    ↓
vLLM / Ollama / MLC serve  →  LLM_BASE_URL + LLM_MODEL in Studio
```

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| **CUDA GPU** | Gemma 2 2B 4-bit LoRA ≈ 8 GB VRAM |
| **Linux** | Recommended (RunPod, WSL2, GPU VM). Windows native CUDA may work but is untested here |
| **Python 3.10+** | 3.11 preferred |
| **Dataset** | Output of `make export-peft-dataset` |

### Minimum dataset size

| Rows | Guidance |
|------|----------|
| **1–10** | Smoke / pipeline validation only — will overfit |
| **10–50** | Early experiments |
| **50+** | Recommended before production fine-tune |
| **100+** | Better generalization for Turkish product specs |

The training script warns below 50 rows unless `--force` is passed.

---

## Dataset Readiness

Fine-tuning quality depends on **human-approved, real** `product_spec` documents — not smoke seed data.

### Readiness levels

| Total records | Level | Use |
|---------------|-------|-----|
| 0–9 | **smoke only** | Pipeline / export / train script validation (`--force`) |
| 10–29 | **experimental** | Early LoRA experiments — expect overfitting |
| 30–99 | **initial fine-tune** | Minimum recommended band for first real model |
| 100–299 | **usable** | Production experiments |
| 300+ | **strong dataset** | Best generalization |

With **1 exported row**, expect `train=1`, `val=0` — enough for smoke only.

Seed script output (`smoke_peft_seed.mjs`) is tagged with `[[PEFT_SMOKE_TEST]]` and must **not** be used as production training data. Prefer real workspaces where specs were reviewed and approved in the UI.

### Analyze before training

```bash
make finetune-analyze-dataset DATASET_DIR=./peft-export
# Windows / no local Python:
node scripts/analyze_peft_dataset.mjs --dataset-dir=./peft-export
```

Writes `dataset-analysis.json` alongside `train.jsonl` and prints:

- Record counts, language mix, role length stats
- Short/empty assistant bodies
- Duplicate fingerprints, user prompts, assistant replies
- Train/val fingerprint overlap (should be **0**)
- Smoke-marker row count
- Readiness level and `finetune_ready` flag (true when ≥30 rows and no smoke markers)

Unit tests (stdlib):

```bash
python -m unittest deployments/finetune/test_analyze_dataset.py
```

### Train / validation split

Export uses a **deterministic workspace hash** (default):

| Setting | Default |
|---------|---------|
| Split ratio | `0.9` (90% train) |
| Split salt | `peft-export-v1` |

Algorithm: `SHA256(workspace_id + salt) % 100 < ratio×100` → train, else val.

Properties:

- Same workspace → same split on every re-export (stable fingerprints)
- **No row appears in both** train and val (partition by workspace)
- **Single exported row** → always train, val empty
- Small datasets may have **empty val** — normal until enough distinct workspaces exist

Override via CLI: `--split=0.9 --split-salt=custom-salt`

### Duplicate & fingerprint controls

Export pipeline (before JSONL):

- **Dedupe** (default `fingerprint`): keeps latest approved doc per fingerprint
- **Fingerprint gate**: skips rows where rebuilt context ≠ stored `source_fingerprint`
- **Quality gate**: min score + section coverage for `product_spec`
- **`--exclude-smoke-markers`**: skips rows tagged with `[[PEFT_SMOKE_TEST]]` (recommended for production org exports)

Analysis script (after JSONL):

- Counts duplicate fingerprints, user prompts, assistant bodies
- Detects train/val fingerprint leakage
- Flags `[[PEFT_SMOKE_TEST]]` rows

### Batch smoke seed (split testing)

Create 12 isolated workspaces under one smoke org:

```bash
node ./scripts/smoke_peft_batch_seed.mjs --count=12
go run ./cmd/export-peft-dataset --org-id=<ORG_ID> --out-dir=./peft-export-batch --force
node ./scripts/analyze_peft_dataset.mjs --dataset-dir=./peft-export-batch
```

Production export (real org):

```bash
go run ./cmd/export-peft-dataset --org-id=<PROD_ORG> --exclude-smoke-markers --out-dir=./peft-export
```

---

## 1. Export dataset (Studio backend)

```bash
cd backend

# Smoke: pick org with approved product_spec + dry-run + full export
node ./scripts/smoke_peft_export.mjs

# Or explicit org
make export-peft-dataset ORG_ID=<ORG_UUID> OUT_DIR=./peft-export ARGS="--write-skipped --verbose"
```

Expected artifacts in `./peft-export/`:

| File | Description |
|------|-------------|
| `train.jsonl` | Training conversations (system / user / assistant) |
| `val.jsonl` | Validation split (may be empty with very small datasets) |
| `manifest.json` | Export counts, skip reasons, split metadata |
| `skipped.jsonl` | Optional — rows filtered by quality/fingerprint gates |

JSONL format matches [product-spec-schema.md](../../docs/product-spec-schema.md#peft-veri-export-cli--uygulandı).

---

## 2. Validate dataset (no GPU)

Works on any machine — validates JSONL schema before moving to a GPU host.

```bash
cd backend/deployments/finetune

# Copy or symlink peft-export here, or pass absolute path
python train_lora.py --dataset-dir ../../peft-export --dry-run
python analyze_dataset.py --dataset-dir ../../peft-export
```

Or from backend root:

```bash
make finetune-validate-dataset DATASET_DIR=./peft-export
make finetune-analyze-dataset DATASET_DIR=./peft-export
```

---

## 3. Install dependencies (GPU host)

Follow [Unsloth install docs](https://docs.unsloth.ai/get-started/installing-and-updating) for your CUDA version, then:

```bash
cd backend/deployments/finetune
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Copy `.env.example` → `.env` and adjust paths if needed.

---

## 4. Train LoRA

```bash
python train_lora.py \
  --dataset-dir ../../peft-export \
  --output-dir ./output \
  --epochs 3 \
  --batch-size 2 \
  --grad-accum 4
```

Useful flags:

| Flag | Purpose |
|------|---------|
| `--dry-run` | Validate JSONL only |
| `--force` | Train with fewer than 50 samples (smoke) |
| `--save-merged-16bit` | Export merged weights for some serving stacks |
| `--model-name` | Override base model (default: `unsloth/gemma-2-2b-it-bnb-4bit`) |

Outputs:

```
output/
  lora_adapter/       # PEFT adapter + tokenizer
  run_meta.json       # Training metadata
  checkpoint-*/       # TRL epoch checkpoints
  merged_16bit/       # Optional (--save-merged-16bit)
```

---

## 5. Serve fine-tuned model

Pick one serving path and expose an OpenAI-compatible `/v1/chat/completions` endpoint.

### Option A — vLLM (LoRA adapter)

```bash
# Merge adapter locally or mount lora_adapter at serve time
vllm serve unsloth/gemma-2-2b-it-bnb-4bit \
  --enable-lora \
  --lora-modules product-spec=./output/lora_adapter
```

### Option B — Ollama (merged model)

After `--save-merged-16bit`, import into Ollama Modelfile or push to a registry your Ollama host can pull.

### Option C — Hugging Face Hub

Upload `lora_adapter/` or merged weights, then point inference at the repo id.

See also: [deployments/mlc-llm/README.md](../mlc-llm/README.md), [render-external-llm.md](../render-external-llm.md).

---

## 6. Connect Studio

Set org LLM settings (or backend `.env` for global default):

```env
LLM_PROVIDER=gemma
LLM_BASE_URL=https://your-gpu-host/v1
LLM_MODEL=product-spec          # vLLM lora module name or your served model id
LLM_API_KEY=<shared-secret>
```

Generate a new `product_spec` in the UI and compare quality scores in **Gözlemle** against the base model.

---

## Smoke test results (local)

Last verified export smoke (`node ./scripts/smoke_peft_export.mjs`):

| Metric | Value |
|--------|-------|
| Org | PEFT Smoke Org (`925f186f-b748-483c-a42d-7a74c7b01923`) |
| Candidates | 1 |
| Exported | 1 |
| Train / val | 1 / 0 |
| Avg assistant length | ~1441 chars |
| Language | `tr` |

This is enough to validate the export → train script path with `--force`, not for production quality.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `train.jsonl not found` | Run `make export-peft-dataset` first |
| `exported=0` in dry-run | Check `manifest.json` → `skip_reasons` (fingerprint, quality, empty body) |
| `CUDA GPU not detected` | Run on GPU VM; use `--dry-run` locally |
| Empty `val.jsonl` | Normal for small datasets; training uses train rows only |
| OOM | Lower `--batch-size`, reduce `--max-seq-length`, or use smaller base model |

---

## Related docs

- [STUDIO.md](../../STUDIO.md) — PEFT export CLI
- [product-spec-schema.md](../../docs/product-spec-schema.md)
- [peft-dataset-export-phase-ab.md](../../docs/issues/peft-dataset-export-phase-ab.md)
- [LLM_HYBRID.md](../LLM_HYBRID.md) — inference modes
