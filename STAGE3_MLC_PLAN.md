# Stage 3 — MLC LLM: Render / Local Docker Run

**Durum:** Uygulandı (Stage 3 altyapı)  
**Kapsam:** MLC runtime altyapısı — Product Specs, Source Code Intelligence, Admin Panel **dışında**  
**Tarih:** 2026-07-25

---

## 1. Özet

Projede LLM katmanı **Clean Architecture port/adapter** modeliyle zaten kurulu. MLC entegrasyonu için **yeni bir Go provider yazmaya gerek yok** — MLC-LLM, OpenAI-uyumlu REST sunucusu sağlar ve mevcut `gemma` HTTP adapter'ı üzerinden bağlanır.

Stage 3 hedefi:

| Ortam | LLM runtime | Backend provider |
|-------|-------------|------------------|
| Local dev (hızlı) | `mock` (in-process) | `LLM_PROVIDER=mock` |
| Local Docker (Compose) | `mock-llm` container veya gerçek MLC | `LLM_PROVIDER=gemma` + `LLM_BASE_URL` |
| Render (production API) | Harici LLM endpoint (GPU VM / HF / vb.) | `LLM_PROVIDER=gemma` + `LLM_BASE_URL` |
| GPU workstation | MLC `mlc_llm serve` (Docker) | `LLM_PROVIDER=gemma` + `LLM_BASE_URL` |

**Temel kural:** Frontend'de tarayıcı LLM yok (`@mlc-ai/web-llm` vb.). Tüm inference backend üzerinden.

---

## 2. Mevcut Altyapı Analizi

### 2.1 Domain — `LLMProvider` interface

**Dosya:** `backend/internal/domain/llm/provider.go`

```go
type LLMProvider interface {
    Name() string
    Generate(ctx context.Context, req GenerateRequest) (GenerateResponse, error)
    Health(ctx context.Context) (ProviderHealth, error)
}
```

| Sabit | Değer | Anlam |
|-------|-------|-------|
| `ProviderMock` | `"mock"` | In-process deterministik provider |
| `ProviderGemma` | `"gemma"` | OpenAI-compatible HTTP adapter (Ollama, HF, **MLC**, vLLM) |

`GenerateRequest`: `SystemPrompt`, `UserPrompt`, `MaxTokens`  
`GenerateResponse`: `Content`, `Provider`, `Model`, `FinishReason`, `Usage`

**Değerlendirme:** Interface MLC için yeterli. Application katmanı vendor-agnostic kalır.

---

### 2.2 Infrastructure — Registry

**Dosya:** `backend/internal/infrastructure/llm/registry.go`

- `SupportedProviders()` → `["mock", "gemma"]`
- `NewProvider(cfg)` → inner provider + `ResilientProvider` wrapper
- `LLM_ENABLED=false` → mock (Health/Name wiring korunur)
- Bilinmeyen provider → hard error (silent fallback yok)

**Değerlendirme:** MLC için registry'ye yeni key eklenmesi **gerekmez**. MLC bir deployment hedefi, Go registry anahtarı değil.

---

### 2.3 Mock Provider

**Dosya:** `backend/internal/infrastructure/llm/mock/provider.go`

- Deterministik Markdown üretir
- Prompt içeriği loglanmaz
- Test hook'ları: `WithGenerateError`, `WithHealthError`, `WithDelay`
- Default model: `"mock-model"`

**Compose mock sunucusu:** `backend/deployments/mock-llm/main.go`

| Endpoint | Davranış |
|----------|----------|
| `GET /health` | `"ok"` (MLC container healthcheck için) |
| `GET /v1/models` | OpenAI model listesi |
| `POST /v1/chat/completions` | Deterministik Markdown |

**Değerlendirme:** Mock provider ve mock-llm container korunmalı. Dev/CI/smoke testlerinin temeli.

---

### 2.4 Gemma Client (MLC bağlantı noktası)

**Dosya:** `backend/internal/infrastructure/llm/gemma/client.go`

| İşlem | HTTP | Not |
|-------|------|-----|
| `Generate` | `POST {baseURL}/chat/completions` | System prompt user message'a merge edilir (HF uyumu) |
| `Health` | `GET {baseURL}/models` | Network hatası → unhealthy struct, error dönmez |

Hata eşlemesi:
- 429 → `ErrRateLimited` (retry edilir)
- 5xx → retry edilir
- 4xx → retry edilmez

HTTP client default timeout: **60s** (ResilientProvider timeout'undan bağımsız).

**Değerlendirme:** MLC REST API ile uyumlu (`/v1/chat/completions`, `/v1/models`). Stage 3'te gerçek MLC container'a karşı entegrasyon testi eklenmeli.

---

### 2.5 ResilientProvider — Timeout & Retry

**Dosya:** `backend/internal/infrastructure/llm/resilient.go`

| Parametre | Env | Default |
|-----------|-----|---------|
| Per-attempt timeout | `LLM_TIMEOUT_SECONDS` | 60s |
| Max retries | `LLM_MAX_RETRIES` | 2 (toplam 3 deneme) |
| Backoff | — | `(attempt+1) × 100ms` |

Retry koşulları: `DeadlineExceeded`, `ErrRateLimited`, net errors, mesajda `timeout`/`connection refused`/vb.

Health: **tek probe, retry yok** (retry storm önleme).

**Değerlendirme:** MLC cold start / JIT compile sırasında timeout artırılmalı (`LLM_TIMEOUT_SECONDS=120+`). Gemma HTTP client timeout'u da config'den türetilmeli (çift timeout uyumsuzluğu giderilmeli).

---

### 2.6 Context Builder

**Dosya:** `backend/internal/application/generation/usecase/workspace_context_builder.go`

- Workspace + org çözümleme (multi-tenant)
- Profile, questionnaire, visibility kuralları (Phase 2)
- Secret sanitization (`api_key`, `token`, vb.)
- Soft gate: `MissingRequired` listelenir, generate **bloklanmaz**

**Değerlendirme:** MLC entegrasyonundan etkilenmez. Değişiklik gerekmez.

---

### 2.7 Prompt Builder

**Dosya:** `backend/internal/application/generation/usecase/prompt_builder.go`

- TR/EN system + user prompt
- `MaxTokens` **set edilmiyor** (0 → JSON'da omit)
- Prompt body loglanmaz

**Değerlendirme:** Opsiyonel iyileştirme — `LLM_MAX_TOKENS` env eklenebilir (Stage 3 nice-to-have, zorunlu değil).

---

### 2.8 Health Endpoint

**Route:** `GET /api/v1/llm/health`  
**Handler:** `backend/internal/infrastructure/http/handler/generation/handler.go`  
**Use case:** `backend/internal/application/generation/usecase/provider_health.go`

| Durum | Response | HTTP |
|-------|----------|------|
| `LLM_ENABLED=false` | `{ enabled: false, healthy: false }` | 200 |
| Provider healthy | `{ enabled: true, healthy: true, provider, message }` | 200 |
| Provider unhealthy | `{ enabled: true, healthy: false, message }` | 200 |
| Context canceled | error response | — |

Prometheus: `llm_provider_health` gauge güncellenir.

**Zincir:** API health → `ProviderHealthUseCase` → `ResilientProvider.Health` → `gemma.Client.Health` → `GET {LLM_BASE_URL}/models`

**Not:** MLC mock ayrıca `GET /health` sunar; backend bunu kullanmaz, OpenAI `/v1/models` kullanır.

**Değerlendirme:** MLC ile uyumlu. MLC container healthcheck'i için Compose'da `/health` veya `/v1/models` kullanılabilir.

---

### 2.9 Config Yapısı

**Dosya:** `backend/internal/shared/config/config.go`

| Field | Env | Default |
|-------|-----|---------|
| `Enabled` | `LLM_ENABLED` | `true` |
| `Provider` | `LLM_PROVIDER` | `mock` |
| `BaseURL` | `LLM_BASE_URL` | `""` |
| `APIKey` | `LLM_API_KEY` | `""` |
| `Model` | `LLM_MODEL` | `""` |
| `TimeoutSeconds` | `LLM_TIMEOUT_SECONDS` | `60` |
| `MaxRetries` | `LLM_MAX_RETRIES` | `2` |
| `AllowMockInProduction` | `LLM_ALLOW_MOCK_IN_PRODUCTION` | `false` |

Validation:
- `gemma` → `LLM_BASE_URL` zorunlu
- Production + `gemma` → `LLM_API_KEY` zorunlu
- Production + `mock` → `LLM_ALLOW_MOCK_IN_PRODUCTION=true` gerekir

**Örnek env:** `backend/.env.example.studio`

**Değerlendirme:** MLC için yeni env'ler eklenebilir (Compose tarafında model path, port); backend tarafında mevcut `LLM_*` yeterli.

---

### 2.10 Docker Compose (mevcut)

**Dosya:** `backend/deployments/docker-compose.yml`

| Servis | Profile | Rol |
|--------|---------|-----|
| `mlc-llm` | `stack` | `mock-llm` build — OpenAI-compatible stand-in |
| `api` | `stack` | `LLM_PROVIDER=gemma`, `LLM_BASE_URL=http://mlc-llm:8080/v1` |
| `nginx`, `prometheus`, `grafana`, `loki`, `promtail` | `stack` | Phase 5 observability |

Port: MLC mock → `127.0.0.1:8081` (host) → container `:8080`

**GPU overlay:** `backend/deployments/docker-compose.llm.yml`

```yaml
image: mlcai/mlc-llm:latest  # ⚠ resmi image değil — doğrulanmalı/değiştirilmeli
profile: mlc-gpu
```

**Değerlendirme:** Mock stack hazır. GPU overlay resmi olmayan image kullanıyor; Stage 3'te custom Dockerfile ile değiştirilmeli.

---

### 2.11 Render (mevcut)

**Dosya:** `render.yaml`

```yaml
LLM_PROVIDER: mock
LLM_ALLOW_MOCK_IN_PRODUCTION: "true"
```

Render free tier GPU desteklemez → MLC container Render'da çalıştırılamaz. API Render'da, LLM harici endpoint'te olmalı.

---

### 2.12 Mevcut Durum vs Eksikler

| Alan | Durum |
|------|-------|
| LLMProvider port/adapter | ✅ Tamam |
| Mock provider + mock-llm container | ✅ Tamam |
| Gemma HTTP adapter (MLC uyumlu) | ✅ Tamam |
| Resilient timeout/retry | ✅ Tamam |
| Context/Prompt builder | ✅ Tamam (MaxTokens opsiyonel) |
| Health endpoint + metrics | ✅ Tamam |
| Compose mock stack | ✅ Tamam |
| Gerçek MLC Docker image | ❌ Resmi image yok, overlay doğrulanmamış |
| MLC entegrasyon testi | ❌ Go testi yok |
| K8s mlc-llm manifest | ❌ API referans veriyor, manifest yok |
| Gemma HTTP timeout sync | ⚠ Çift timeout (60s client + LLM_TIMEOUT_SECONDS) |
| Render production LLM | ⚠ Mock; harici endpoint planlanmalı |
| Production API key bypass (local MLC) | ⚠ MLC auth gerektirmez, validation esnetilmeli |

---

## 3. MLC Runtime Araştırması

### 3.1 Docker içinde nasıl çalıştırılır?

**Resmi pre-built Docker image yok.** MLC ekibi pip wheel kurulumunu önerir.

Önerilen yaklaşım:

```dockerfile
# Base: NVIDIA CUDA
FROM nvidia/cuda:12.1.0-devel-ubuntu22.04

# pip install mlc-llm (CUDA wheel)
RUN pip install --pre -U -f https://mlc.ai/wheels mlc-llm-nightly-cu121 mlc-ai-nightly-cu121

# Serve
CMD ["mlc_llm", "serve", "HF://mlc-ai/gemma-2b-it-q4f16_1-MLC",
     "--host", "0.0.0.0", "--port", "8080", "--mode", "local"]
```

Compose gereksinimleri:
- `runtime: nvidia` veya `deploy.resources.reservations.devices` (NVIDIA)
- Volume: model cache (`~/.cache/mlc_llm`)
- `start_period`: 120–300s (ilk çalıştırmada JIT compile sürebilir)
- Port: proje içi `:8080` (mock ile uyumlu) veya `:8000` (MLC default)

**Not:** Mevcut `docker-compose.llm.yml` içindeki `mlcai/mlc-llm:latest` resmi değil; Stage 3'te `deployments/mlc-llm/Dockerfile` ile değiştirilecek.

---

### 3.2 HTTP API sağlıyor mu?

**Evet.** MLC-LLM OpenAI-compatible REST sunar.

| Endpoint | Method | Kullanım |
|----------|--------|----------|
| `/v1/models` | GET | Health probe (backend gemma client) |
| `/v1/chat/completions` | POST | Document generation |
| `/docs` | GET | Swagger/OpenAPI (MLC sunucusu) |

Default port: **8000** (MLC docs). Proje mock'u **8080** kullanıyor — Compose'da `--port 8080` ile hizalanmalı.

Launch komutu:

```bash
mlc_llm serve HF://mlc-ai/gemma-2b-it-q4f16_1-MLC \
  --host 0.0.0.0 \
  --port 8080 \
  --mode local
```

Mode seçenekleri:
- `local` — düşük concurrency, max batch 4 (dev/GPU workstation)
- `interactive` — tek istek
- `server` — yüksek concurrency, production GPU sunucu

---

### 3.3 Gemma model desteği

MLC, Hugging Face üzerinde derlenmiş Gemma modellerini destekler:

| Model | Quantization | VRAM (tahmini) |
|-------|--------------|----------------|
| `HF://mlc-ai/gemma-2b-it-q4f16_1-MLC` | q4f16_1 | ~2–4 GB |
| `HF://mlc-ai/gemma-2-9b-it-q3f16_1-MLC` | q3f16_1 | ~6–8 GB |

İlk çalıştırmada JIT compile otomatik tetiklenir (model indirme + derleme).

Backend `LLM_MODEL` env'i, MLC'ye gönderilen `model` field'ına map edilir:

```
LLM_MODEL=HF://mlc-ai/gemma-2b-it-q4f16_1-MLC
```

---

### 3.4 Backend nasıl bağlanacak?

**Değişiklik yok** — mevcut `gemma` adapter yeterli:

```env
LLM_ENABLED=true
LLM_PROVIDER=gemma
LLM_BASE_URL=http://mlc-llm:8080/v1    # Compose internal DNS
LLM_MODEL=HF://mlc-ai/gemma-2b-it-q4f16_1-MLC
LLM_API_KEY=local-dev                  # MLC auth gerektirmez; production validation için placeholder
LLM_TIMEOUT_SECONDS=120
LLM_MAX_RETRIES=2
SERVER_WRITE_TIMEOUT_SECONDS=130
```

Native dev (API host'ta, MLC Docker'da):

```env
LLM_BASE_URL=http://localhost:8081/v1
```

Render production (harici GPU sunucu):

```env
LLM_BASE_URL=https://mlc.your-domain.com/v1
LLM_API_KEY=<shared-secret-or-real-key>
LLM_ALLOW_MOCK_IN_PRODUCTION=false
```

Bağlantı akışı:

```
Frontend → POST /documents/generate
         → GenerateDocumentUseCase
         → WorkspaceContextBuilder + PromptBuilder
         → ResilientProvider.Generate
         → gemma.Client → POST http://mlc-llm:8080/v1/chat/completions
         → MLC MLCEngine
         → Markdown → generated_documents table
```

---

### 3.5 Health endpoint nasıl çalışacak?

**Backend health (`GET /api/v1/llm/health`):**

1. `ProviderHealthUseCase.Execute`
2. `gemma.Client.Health` → `GET {LLM_BASE_URL}/models`
3. 2xx → `healthy: true`
4. Network/5xx → `healthy: false`, HTTP 200 (API stabil kalır)

**MLC container healthcheck (Compose):**

```yaml
healthcheck:
  test: ["CMD-SHELL", "wget -q -O- http://127.0.0.1:8080/v1/models || exit 1"]
  interval: 15s
  timeout: 10s
  retries: 10
  start_period: 180s   # JIT compile için uzun
```

**Readiness ayrımı:**
- MLC container `healthy` → model yüklü ve inference hazır
- API `/health/ready` → DB + Redis + LLM provider (opsiyonel probe)

Stage 3'te API readiness'e LLM probe eklenmesi **opsiyonel** (şu an sadece `/api/v1/llm/health`).

---

### 3.6 Timeout ve retry nasıl uygulanacak?

Mevcut katmanlar korunur, MLC için tuning:

| Katman | Ayar | MLC önerisi |
|--------|------|-------------|
| ResilientProvider | `LLM_TIMEOUT_SECONDS` | 120–180 (ilk inference yavaş olabilir) |
| ResilientProvider | `LLM_MAX_RETRIES` | 2 (429/5xx/timeout) |
| HTTP Server | `SERVER_WRITE_TIMEOUT_SECONDS` | `LLM_TIMEOUT_SECONDS + 10` |
| Gemma HTTP client | hardcoded 60s | **Config'den türet** (`LLM_TIMEOUT_SECONDS`) |
| Generation lock TTL | `LLM_TIMEOUT_SECONDS + 30` | main.go'da mevcut |
| Graceful shutdown | `LLM_TIMEOUT_SECONDS + 30` | main.go'da mevcut |
| MLC container | `--mode local` | Dev için yeterli |

Retry **health probe'da uygulanmaz** (mevcut davranış korunur).

---

### 3.7 Mock provider nasıl korunacak?

| Senaryo | Provider | Runtime |
|---------|----------|---------|
| Unit testler | `mock` | In-process |
| CI smoke | `mock` | In-process |
| Local hızlı dev | `mock` | In-process (default) |
| Compose stack (GPU yok) | `gemma` | `mock-llm` container |
| Compose stack (GPU var) | `gemma` | Gerçek MLC container |
| Render (geçici) | `mock` + override | In-process |

Koruma kuralları:
1. `LLM_PROVIDER=mock` default kalır (`.env.example.studio`)
2. `mock-llm/` container silinmez — Compose `stack` profile'ında kalır
3. Production'da mock bloklanır (`ValidateLLMConfig`) — override sadece Render geçiş dönemi
4. `scripts/check-no-browser-llm.sh` frontend guard korunur
5. Smoke script'ler mock ile çalışmaya devam eder

---

## 4. Hedef Mimari

```
┌─────────────────────────────────────────────────────────────────┐
│                        Deployment Targets                        │
├─────────────────┬───────────────────────┬───────────────────────┤
│  Local Dev      │  Docker Compose       │  Render + External    │
│  mock in-proc   │  mock-llm OR mlc-llm  │  API only; LLM remote │
└────────┬────────┴───────────┬───────────┴───────────┬───────────┘
         │                    │                       │
         ▼                    ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              Go Backend (LLMProvider port)                       │
│  Registry: mock | gemma                                          │
│  ResilientProvider (timeout + retry)                             │
│  GenerateDocumentUseCase + Context/Prompt Builder                │
└────────────────────────────┬────────────────────────────────────┘
                             │ OpenAI-compatible HTTP
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  LLM Runtime (deployment-specific, NOT in Go code)               │
│  • mock (in-process)                                             │
│  • mock-llm container (dev/staging)                            │
│  • mlc_llm serve (GPU Docker)                                    │
│  • External MLC/HF/Ollama endpoint (Render prod)                 │
└─────────────────────────────────────────────────────────────────┘
```

**Karar:** Go kodunda `ProviderMLC` eklenmeyecek. MLC = `LLM_PROVIDER=gemma` + doğru `LLM_BASE_URL`.

---

## 5. Uygulama Fazları

### Faz 3.1 — Dokümantasyon & env şablonları

- `.env.example.studio` MLC örnekleri genişlet
- `backend/STUDIO.md` Phase 5 MLC bölümü güncelle
- `render.yaml` yorumları: harici LLM endpoint planı

### Faz 3.2 — MLC Docker image (custom)

- `deployments/mlc-llm/Dockerfile` oluştur (CUDA base + pip install)
- `deployments/mlc-llm/entrypoint.sh` — model env, port, mode
- `docker-compose.llm.yml` güncelle: resmi olmayan `mlcai/mlc-llm:latest` → custom build
- Model cache volume tanımı

### Faz 3.3 — Config & adapter iyileştirmeleri

- `gemma.Client` HTTP timeout → `LLM_TIMEOUT_SECONDS`'dan türet
- (Opsiyonel) Production'da `LLM_API_KEY` zorunluluğunu local MLC için bypass: `LLM_API_KEY_OPTIONAL=true` veya boş key'e izin (non-production)
- (Opsiyonel) `LLM_MAX_TOKENS` env + PromptBuilder

### Faz 3.4 — Test & smoke

- `scripts/verify_mlc_compose.mjs` — gerçek/mock MLC endpoint probe
- `gemma/client_test.go` — MLC response shape edge case'leri
- `smoke_phase5_compose.mjs` güncelle (MLC health beklentisi)
- Makefile target: `compose-up-mlc-gpu`

### Faz 3.5 — Kubernetes & Render

- `deployments/kubernetes/deployment-mlc-llm.yaml` + Service
- Kustomize overlay: mock-llm vs mlc-llm profile
- Render: env group dokümantasyonu (harici LLM URL)

### Faz 3.6 — Observability

- Grafana LLM dashboard — MLC latency/error alert tuning
- Promtail: `mlc-llm` container log label (mevcut, doğrula)
- Prometheus alert: `LLMProviderUnhealthy` start_period uyumu

---

## 6. Değişecek / Eklenecek Dosyalar

### Yeni dosyalar

| Dosya | Amaç |
|-------|------|
| `STAGE3_MLC_PLAN.md` | Bu plan |
| `backend/deployments/mlc-llm/Dockerfile` | Custom MLC GPU image |
| `backend/deployments/mlc-llm/entrypoint.sh` | Model/port/mode başlatma |
| `backend/deployments/mlc-llm/README.md` | GPU gereksinimleri, model seçimi |
| `backend/deployments/kubernetes/deployment-mlc-llm.yaml` | K8s MLC deployment |
| `backend/deployments/kubernetes/service-mlc-llm.yaml` | K8s MLC service |
| `backend/scripts/verify_mlc_compose.mjs` | MLC endpoint doğrulama |

### Güncellenecek dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `backend/deployments/docker-compose.llm.yml` | Custom Dockerfile build, env vars, healthcheck tuning |
| `backend/deployments/docker-compose.yml` | MLC env yorumları, opsiyonel profile birleştirme |
| `backend/.env.example.studio` | MLC/Gemma/Compose örnekleri, timeout önerileri |
| `backend/STUDIO.md` | Stage 3 MLC runbook, port/model tablosu |
| `backend/internal/infrastructure/llm/gemma/client.go` | HTTP client timeout config'den |
| `backend/internal/infrastructure/llm/registry.go` | (Minimal) gemma.New'a timeout geçir |
| `backend/internal/shared/config/config.go` | (Opsiyonel) `LLM_MAX_TOKENS`, API key optional flag |
| `backend/Makefile` | `compose-up-mlc-gpu`, `verify-mlc` targets |
| `backend/scripts/smoke_phase5_compose.mjs` | MLC-specific assertions |
| `backend/scripts/verify_llm.mjs` | MLC model ID örnekleri |
| `render.yaml` | Yorum + production LLM env şablonu (mock'tan geçiş) |
| `docs/architecture-decisions.md` | Stage 3 MLC kararı |
| `README.md` | MLC Docker quick start link |

### Değişmeyecek dosyalar (bilinçli)

| Dosya | Neden |
|-------|-------|
| `backend/internal/domain/llm/provider.go` | Interface yeterli |
| `backend/internal/infrastructure/llm/mock/*` | Dev/CI korunur |
| `backend/internal/application/generation/usecase/workspace_context_builder.go` | LLM-vendor agnostic |
| `backend/internal/application/generation/usecase/prompt_builder.go` | (MaxTokens hariç) değişmez |
| `frontend/**` | Browser LLM yok kuralı |
| `backend/deployments/mock-llm/*` | Compose dev stand-in |

---

## 7. Ortam Matrisi (Uygulama Sonrası)

| Ortam | Komut | LLM_PROVIDER | LLM_BASE_URL | LLM Runtime |
|-------|-------|--------------|--------------|-------------|
| Dev hızlı | `go run ./cmd/server` | `mock` | — | In-process |
| Dev + HF | native API | `gemma` | `https://router.huggingface.co/v1` | HF Inference |
| Compose stack | `make compose-up-full` | `gemma` | `http://mlc-llm:8080/v1` | mock-llm container |
| Compose GPU | `make compose-up-mlc-gpu` | `gemma` | `http://mlc-llm:8080/v1` | mlc_llm serve |
| Render prod | Blueprint deploy | `gemma` | `https://<external-llm>/v1` | Harici GPU VM |
| K8s | `make k8s-apply` | `gemma` | `http://mlc-llm:8080/v1` | mlc-llm pod |

---

## 8. Riskler ve Azaltma

| Risk | Etki | Azaltma |
|------|------|---------|
| Resmi MLC Docker image yok | Build karmaşıklığı | Custom Dockerfile + dokümantasyon |
| JIT compile süresi (5–15 dk) | Healthcheck fail | `start_period: 180s+`, uzun timeout |
| GPU yok (dev laptop) | Gerçek MLC çalışmaz | mock-llm container default |
| Render GPU yok | Production inference | Harici LLM endpoint (RunPod, HF, vb.) |
| Çift HTTP timeout | Erken kesilme | gemma client timeout sync |
| Production API key validation | Local MLC bağlanamaz | Optional key flag veya placeholder |
| `mlcai/mlc-llm:latest` mevcut overlay | Image pull fail | Custom build ile değiştir |

---

## 9. Doğrulama Checklist (Uygulama Sonrası)

- [x] Hibrit rehber (`deployments/LLM_HYBRID.md`) + `make llm-hybrid`
- [x] `make verify-hybrid` — mock / HF / local MLC (.env'e göre)
- [x] `make verify-mlc` — `/health` SKIP, `/v1/models` + chat
- [x] `check-no-browser-llm.mjs` (Windows uyumlu)
- [x] Render env dokümante (`render-external-llm.md`, `render.yaml`)
- [x] Gemma HTTP timeout = `LLM_TIMEOUT_SECONDS`
- [x] `make compose-up-full` → smoke_phase5_compose.mjs
- [x] `smoke_compose_full.mjs` — E2E generate + observe + monitoring
- [ ] GPU ortamda `compose-up-mlc-gpu` → gerçek Gemma inference
- [ ] Render dashboard'da `LLM_BASE_URL` / `LLM_MODEL` / `LLM_API_KEY` set

---

## 10. Bilinçli Olmayan Kapsam (Stage 3 dışı)

- Product Specs
- Source Code Intelligence
- Admin Panel
- Streaming LLM response (SSE)
- Browser/WebGPU MLC (`@mlc-ai/web-llm`)
- Model fine-tuning / custom quantization pipeline
- Dedicated `ProviderMLC` Go adapter (API uyumlu olduğu sürece gerek yok)

---

## 11. Sonuç

Proje **MLC entegrasyonuna mimari olarak hazır**. Stage 3'ün asıl işi:

1. **Deployment katmanını tamamlamak** — custom MLC Dockerfile, Compose/K8s manifest
2. **Operasyonel tuning** — timeout, healthcheck, env şablonları
3. **Doğrulama** — MLC-specific smoke/integration test
4. **Render stratejisi** — API Render'da, LLM harici GPU endpoint'te

Go application katmanında büyük refactor gerekmez; `gemma` adapter zaten MLC REST API'nin OpenAI-compatible yüzeyine map ediyor.
