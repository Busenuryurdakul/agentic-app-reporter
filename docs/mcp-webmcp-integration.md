# MCP / WebMCP Entegrasyon Tanımı

**Ürün:** AI Development Configuration Studio (ADCS)  
**Durum:** Backend MCP **canlı** · WebMCP **tasarım fazı**

Bu belge üç katmanı ayırır: Product Spec anlatımı, Backend MCP (dış ajanlar), WebMCP (tarayıcı içi ajan — gelecek).

---

## 1. Katman modeli

```
┌─────────────────────────────────────────────────────────────────┐
│  Product Spec §6 (üretilen Markdown)                            │
│  Anket → LLM → dokümanda MCP/otomasyon *anlatımı*               │
└─────────────────────────────────────────────────────────────────┘
                              ↓ bağımsız
┌─────────────────────────────────────────────────────────────────┐
│  Backend MCP (CANLI)                                            │
│  Cursor / CI / otomasyon → HTTP /api/v1/mcp/*                   │
│  Auth: JWT veya kullanıcı API anahtarı (adcs_…)                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓ gelecek faz
┌─────────────────────────────────────────────────────────────────┐
│  WebMCP (PLANLANAN)                                             │
│  Next.js UI içinde ajan → aynı tool sözleşmesi, oturum JWT      │
└─────────────────────────────────────────────────────────────────┘
```

| Katman | Amaç | Auth | Durum |
|--------|------|------|-------|
| **Product Spec §6** | Üretilen dokümanda entegrasyon tasviri | — | ✅ Generate pipeline |
| **Backend MCP** | Dış ajanların workspace okuması | `adcs_` key veya JWT | ✅ HTTP + Cursor bridge |
| **WebMCP** | Uygulama içi ajan (chat, öneri, wizard) | Oturum JWT (cookie) | 📋 Tasarım |

---

## 2. Backend MCP (mevcut)

Detay: [`mcp-backend-integration.md`](./mcp-backend-integration.md)

### Araçlar (read-only)

| Tool | Org gerekli? | Açıklama |
|------|--------------|----------|
| `get_me` | Hayır | Oturum açmış kullanıcı profili |
| `llm_health` | Hayır | LLM sağlayıcı durumu |
| `list_documents` | Evet | Workspace belgeleri |
| `get_document` | Evet | Belge + markdown gövdesi |
| `workspace_readiness` | Evet | Hazırlık skoru + eksik sorular |

### Kimlik doğrulama

1. **JWT** — UI oturumu (geliştirme / test)
2. **User API key** (`adcs_<64 hex>`) — Cursor MCP, CI, headless otomasyon

Anahtar yaşam döngüsü: UI `/account/api-keys` → SHA-256 hash DB'de → ham key yalnızca oluşturulurken.

### Cursor entegrasyonu

```
Cursor stdio MCP
  → backend/scripts/adcs_mcp_bridge.mjs
    → GET/POST /api/v1/mcp/*
```

Ortam değişkenleri:

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `ADCS_API_KEY` | Evet | `adcs_…` kullanıcı anahtarı |
| `ADCS_ORG_ID` | Workspace araçları için | `X-Organization-ID` varsayılanı |
| `ADCS_WORKSPACE_ID` | Workspace araçları için | `workspace_id` varsayılanı |
| `ADCS_API_BASE` | Hayır | Varsayılan `http://127.0.0.1:8080/api/v1` |

Örnek config: `backend/deployments/cursor-mcp.example.json`

Smoke test: `cd backend && node scripts/smoke_api_keys_mcp.mjs`

---

## 3. WebMCP (planlanan)

### Hedef

Kullanıcı ADCS arayüzünden ayrılmadan workspace bağlamında ajan desteği:

- Eksik anket sorularını önerme
- Belge özeti / readiness yorumu
- “Bu workspace’te neler eksik?” gibi doğal dil soruları

### Tasarım ilkeleri

1. **Aynı tool sözleşmesi** — WebMCP, Backend MCP'nin HTTP API'sini yeniden kullanır; ayrı tool seti tanımlanmaz (v1).
2. **Oturum JWT** — Tarayıcı `adcs_` key taşımaz; mevcut login cookie / Bearer JWT kullanılır.
3. **Tenant bağlamı otomatik** — UI'daki seçili org + workspace header'lara enjekte edilir.
4. **Backend-only LLM** — Product Spec ile uyumlu; tarayıcıda doğrudan LLM çağrısı yok.
5. **Onay kapısı** — Yazma araçları (gelecek) kullanıcı onayı olmadan çalışmaz.

### Önerilen mimari (v1)

```
Next.js (App Router)
  AgentPanel / Chat UI
    → POST /api/agent/chat          (BFF route, JWT forward)
      → Backend orchestrator        (gelecek endpoint)
        → LLMProvider + MCP tool loop
          → POST /api/v1/mcp/tools/call (internal)
```

**Alternatif (daha ince v1):** Frontend doğrudan `/api/v1/mcp/tools/call` çağırır (JWT ile); LLM döngüsü yalnızca backend'de kalır. **WebMCP-1 bu yolu kullanır** — `frontend/src/features/agent/`, `frontend/src/lib/api/mcp.ts`.

### WebMCP vs Backend MCP

| | Backend MCP | WebMCP |
|---|-------------|--------|
| İstemci | Cursor, script | Next.js UI |
| Auth | `adcs_` key | Session JWT |
| Org/workspace | Env veya arg | UI seçiminden |
| Tool set | 5 read-only | Aynı 5 (v1) |
| Transport | HTTP + stdio bridge | HTTP (same-origin) |

### Faz planı

| Faz | Kapsam | Çıktı |
|-----|--------|-------|
| **MCP-1** ✅ | User API keys + HTTP tools + Cursor bridge | Bu repo |
| **MCP-2** | Tool JSON Schema, scopes, CI smoke, prod verify | ✅ This release |
| **WebMCP-1** | JWT ile MCP read tools + workspace agent panel | ✅ Frontend agent drawer |
| **WebMCP-2** | Yazma araçları (`upsert_answer`, `generate_document`) + onay UX | Genişletilmiş catalog |
| **WebMCP-3** | Streaming SSE, tool consent, audit log | Production-ready |

---

## 4. Güvenlik

- API anahtarları: hash-only storage, revoke destekli
- Org üyeliği: `X-Organization-ID` ile MCP route'larda zorunlu kontrol
- Workspace izolasyonu: workspace org'a ait değilse 403/404
- WebMCP: CSRF + same-origin; key asla localStorage'a yazılmaz
- Product Spec §6 metni runtime MCP erişimini **vermez** — yalnızca dokümantasyon

---

## 5. Product Spec §6 ilişkisi

Anket anahtarları (`uses_mcp`, `mcp_servers_list`, `automation_workflows`, …) üretilen Markdown'da **entegrasyon hikâyesini** anlatır.

Runtime MCP/WebMCP ise **canlı sistem davranışıdır**. İkisi senkronize değildir; gelecekte Product Spec generate sırasında kayıtlı MCP sunucu listesi özetlenebilir (opsiyonel).

---

## 6. Bilinen sınırlamalar (MCP-2)

- Araçlar yalnızca **okuma** — generate/approve/export yok
- Bridge minimal MCP: `initialize`, `tools/list`, `tools/call` only
- Full prod MCP smoke requires `MCP_SMOKE_EMAIL` / `MCP_SMOKE_PASSWORD` env vars

---

## 7. Hızlı başlangıç

```bash
# Altyapı
cd backend/deployments && docker compose up -d postgres redis
cd backend && goose … up && make run

# Frontend
cd frontend && npm run dev

# API key oluştur → http://localhost:3000/account/api-keys

# Cursor (~/.cursor/mcp.json veya proje .cursor/mcp.json)
# backend/deployments/cursor-mcp.example.json örneğine bakın

# Doğrulama
cd backend && node scripts/smoke_api_keys_mcp.mjs
```

---

## İlgili belgeler

- [Backend MCP](./mcp-backend-integration.md)
- [Product Spec şeması §6](./product-spec-schema.md)
- [Backend STUDIO](../backend/STUDIO.md)
