# Compose Integration Smoke Report

**Date:** 2026-07-25  
**Stack:** `docker compose -f deployments/docker-compose.yml --profile stack`  
**Result:** ✅ **SUCCESS** (Render deploy için hazır)

---

## 1. Çalışan servisler

| Servis | Container | Durum | Port (host) | Health |
|--------|-----------|-------|-------------|--------|
| PostgreSQL | `masterfabric-postgres` | Up (healthy) | `127.0.0.1:5432` | `pg_isready` OK |
| Redis | `masterfabric-redis` | Up (healthy) | `127.0.0.1:6379` | ready probe OK |
| MLC runtime (mock) | `masterfabric-mlc-llm` | Up (healthy) | `127.0.0.1:8081` | `/health`, `/v1/models` OK |
| API (×2) | `deployments-api-1/2` | Up (healthy) | internal `:8080` | `/health/live` OK |
| nginx LB | `masterfabric-nginx` | Up | `127.0.0.1:8080` | proxies API |
| Kafka | `masterfabric-kafka` | Up (healthy) | `127.0.0.1:9092` | (API: KAFKA_ENABLED=false) |
| Kafka UI | `masterfabric-kafka-ui` | Up | `127.0.0.1:8090` | optional |
| Prometheus | `masterfabric-prometheus` | Up | `127.0.0.1:9090` | `/-/ready` OK |
| Alertmanager | `masterfabric-alertmanager` | Up | `127.0.0.1:9093` | status API OK |
| Grafana | `masterfabric-grafana` | Up | `127.0.0.1:3001` | `/api/health` OK |
| Loki | `masterfabric-loki` | Up | `127.0.0.1:3100` | `/ready` OK |
| Promtail | `masterfabric-promtail` | Up | — | log shipping |
| **Frontend** | *(Compose dışı)* | Up | `localhost:3000` | HTTP 200 (`npm run dev`) |

---

## 2. Başarısız servisler

**Yok** — tüm kontroller geçti.

---

## 3. Yapılan düzeltmeler (bu smoke oturumunda)

| Düzeltme | Dosya |
|----------|-------|
| `smoke_phase3_documents.mjs` — Compose'ta `gemma` provider kabul | `backend/scripts/smoke_phase3_documents.mjs` |
| `verify_mlc_compose.mjs` — `/health` SKIP (gerçek MLC uyumu) | `backend/scripts/verify_mlc_compose.mjs` |
| `smoke_phase5_compose.mjs` — MLC `/v1/models` fallback + healthy assert | `backend/scripts/smoke_phase5_compose.mjs` |
| Yeni birleşik smoke script | `backend/scripts/smoke_compose_full.mjs` |
| Slug validation fix (`compose-smoke` → `composesmoke`) | `smoke_compose_full.mjs` |
| Frontend takılı process restart | manuel (`taskkill` + `npm run dev`) |

---

## 4. Docker Compose dosyasında değişiklikler

**Bu smoke için Compose YAML değişikliği gerekmedi.** Mevcut `docker-compose.yml` + `stack` profile yeterli.

Önceden Stage 3'te yapılan ilgili değişiklikler:
- `docker-compose.llm.yml` — GPU MLC overlay (bu smoke'ta kullanılmadı)
- `deployments/mlc-llm/` — gerçek GPU image (opsiyonel)

---

## 5. Gerçek belge üretimi

| Kontrol | Sonuç |
|---------|--------|
| `POST /documents/generate` | ✅ `status=succeeded` |
| Provider | `gemma` (Compose API → mock-llm HTTP) |
| Markdown body | ✅ 72 bytes (mock deterministik içerik) |
| Regenerate | ✅ yeni satır, kaynak korunur |
| Observe readiness | ✅ `overall=20` (minimal profil/anket) |
| Observe summary | ✅ `succeeded=1` |
| Export / approve (phase 4) | ✅ 12/12 PASS |

**Not:** Compose stack **mock MLC** kullanır — inference gerçek HTTP akışıdır, model çıktısı stub Markdown'dır. Gerçek Gemma için `compose-up-mlc-gpu` (NVIDIA GPU) gerekir.

---

## 6. Smoke test sonuçları

| Script | Sonuç |
|--------|-------|
| `smoke_compose_full.mjs` | **14/14 PASS** |
| `smoke_phase3_documents.mjs` | **10/10 PASS** |
| `smoke_phase4_release.mjs` | **12/12 PASS** |
| `smoke_phase5_compose.mjs` | **13/13 PASS** |
| `verify_mlc_compose.mjs` | **3/3 PASS** |

**Komut:**
```bash
cd backend
node ./scripts/smoke_compose_full.mjs
node ./scripts/smoke_phase3_documents.mjs
node ./scripts/smoke_phase4_release.mjs
node ./scripts/smoke_phase5_compose.mjs
```

---

## 7. Health endpoint özeti

| Endpoint | Sonuç |
|----------|--------|
| `GET /health/live` | alive |
| `GET /health/ready` | ready (postgres + redis healthy) |
| `GET /api/v1/llm/health` | gemma, healthy=true |
| `GET :8081/v1/models` | mock-mlc-model listed |
| `GET :9090/-/ready` | Prometheus ready |
| `GET :3001/api/health` | Grafana OK |
| `GET :3100/ready` | Loki OK |

---

## 8. Log incelemesi (kritik hata)

Son 40 satır taranan container'lar: `deployments-api-1`, `masterfabric-mlc-llm`, `masterfabric-nginx`, `masterfabric-postgres`, `masterfabric-prometheus`

**Sonuç:** `error` / `fatal` / `panic` eşleşmesi **yok**.

---

## 9. Bilinen açıklar / sınırlamalar

| Konu | Açıklama |
|------|----------|
| Frontend Compose'da değil | Bilinçli — ayrı `npm run dev`; `.env.local` → `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080` |
| Mock MLC ≠ gerçek Gemma | Mode C stack; GPU overlay ayrı doğrulanmalı |
| Kafka çalışıyor ama API'de kapalı | `KAFKA_ENABLED=false` — smoke'u etkilemez |
| Windows'ta `make` yok | `docker compose` + `goose` doğrudan kullan |
| Render deploy | Compose smoke ✅ — prod için dashboard env (`LLM_*`) hâlâ manuel |

---

## 10. Render deploy öncesi checklist

- [x] Compose full stack ayakta
- [x] PostgreSQL + Redis healthy
- [x] Backend → MLC bağlantısı
- [x] Document generate + observe + monitoring
- [x] Frontend → API (native dev)
- [ ] Render `LLM_BASE_URL` / `LLM_MODEL` / `LLM_API_KEY` set (prod adımı)
- [ ] (Opsiyonel) GPU `compose-up-mlc-gpu` doğrulaması

**Karar:** Compose integration smoke **başarılı** — Render deploy'a geçilebilir (prod env set edildikten sonra).
