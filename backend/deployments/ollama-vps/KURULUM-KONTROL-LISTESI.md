# Ollama VPS — Güvenli Kurulum Kontrol Listesi

Production URL ve secret **repoya yazılmaz**. Değerler yalnızca VPS (`/etc/caddy/Caddyfile`),
lokal `backend/.env` (gitignore) ve Render Dashboard’da tutulur.

## Denetim özeti (dosya incelemesi)

| # | Kontrol | Sonuç | Not |
|---|---------|-------|-----|
| 1 | Secret ekrana/loga yazılmıyor | **PASS** | Script token’ı echo etmez; yalnızca `<secret>` placeholder |
| 2 | Ollama localhost/private dinliyor | **PASS** | `OLLAMA_HOST=127.0.0.1:11434` systemd override |
| 3 | Port 11434 internete açık değil | **PASS** | ufw’de 11434 açılmaz; yalnızca Caddy → 127.0.0.1:11434 |
| 4 | Yalnızca 22, 80, 443 gerekli | **PASS** | README + ufw kuralları; 80 ACME için |
| 5 | Caddy Bearer doğrulaması | **PASS** | `@authorized` + `401` yetkisiz isteklerde |
| 6 | `/v1/*` yolları Ollama’ya iletilir | **PASS** | `reverse_proxy 127.0.0.1:11434` path strip yok |
| 7 | TLS otomatik (Caddy) | **PASS** | Domain bloğu → Let’s Encrypt |
| 8 | `llama3.2` kurulumda indirilir | **PASS** | `ollama pull` + `/v1/models` doğrulama |
| 9 | Script tekrar çalıştırılabilir | **PASS** | Paket kurulumu koşullu; pull/idempotent |
| 10 | `.env`/token/domain commit edilmez | **PASS** | `.gitignore` → `.env`; örnekler placeholder |
| 11 | `verify_ollama_endpoint.mjs` | **PASS** | Model listesi, eşleşme, chat, secret log yok |
| 12 | `sync_render_llm_ollama.mjs` | **PASS** | Önce verify; `hf_` reddi; doğru servis; redeploy |
| 13 | Hardcoded production secret/URL yok | **PASS** | Yalnızca `example.com` / durum dokümantasyonu |

**Düzeltilen sorunlar:** `setup-ollama-vps.sh` içinde eksik `fi` (bash syntax hatası) giderildi; Windows CRLF satır sonları LF'ye çevrildi (`bash -n` uyumluluğu).

---

## A. Ön koşullar (siz)

- [ ] VPS (Ubuntu 22.04+, öneri 8 GB+ RAM)
- [ ] DNS `A` kaydı: `ollama.<domain>` → VPS IPv4
- [ ] `dig +short ollama.<domain>` doğru IP döndürüyor
- [ ] Render: `LLM_PROVIDER=ollama`, `LLM_MODEL=llama3.2` (zaten ayarlı)
- [ ] Lokal `backend/.env` **commit edilmeyecek** (`.gitignore` altında)

## B. VPS kurulumu

- [ ] `setup-ollama-vps.sh` VPS’e kopyalandı (repo URL’si tahmin edilmedi)
- [ ] Ortam değişkenleri export edildi (token **terminal geçmişinde kalabilir** — dikkat):
  ```bash
  export OLLAMA_DOMAIN="ollama.example.com"
  export OLLAMA_BEARER_TOKEN="$(openssl rand -hex 32)"
  export OLLAMA_MODEL="llama3.2"
  sudo -E bash setup-ollama-vps.sh
  ```
- [ ] Script hatasız bitti
- [ ] Token güvenli yerde saklandı (password manager; repoya değil)

## C. VPS güvenlik doğrulama (SSH ile)

- [ ] Ollama yalnızca localhost:
  ```bash
  ss -lntp | grep 11434
  # Beklenen: 127.0.0.1:11434
  ```
- [ ] Caddyfile izinleri:
  ```bash
  stat -c '%a %n' /etc/caddy/Caddyfile
  # Beklenen: 600
  ```
- [ ] Firewall (ufw aktifse):
  ```bash
  sudo ufw status
  # 22, 80, 443 ALLOW; 11434 YOK
  ```
- [ ] Lokal API (VPS üzerinde):
  ```bash
  curl -sf http://127.0.0.1:11434/v1/models | head -c 200
  ```
- [ ] Yetkisiz HTTPS reddi (laptop/VPS dışından):
  ```bash
  curl -s -o /dev/null -w "%{http_code}" "https://${OLLAMA_DOMAIN}/v1/models"
  # Beklenen: 401
  ```
- [ ] Yetkili HTTPS (token **loglara yazmadan**):
  ```bash
  curl -sf -H "Authorization: Bearer $OLLAMA_BEARER_TOKEN" \
    "https://${OLLAMA_DOMAIN}/v1/models"
  ```

## D. Laptop doğrulama (`backend/.env`)

`backend/.env` (commit yok):

```env
OLLAMA_BASE_URL=https://ollama.example.com/v1
OLLAMA_BEARER_TOKEN=<Caddy secret>
OLLAMA_MODEL=llama3.2
```

- [ ] Syntax:
  ```bash
  bash -n backend/deployments/ollama-vps/setup-ollama-vps.sh
  node --check backend/scripts/verify_ollama_endpoint.mjs
  node --check backend/scripts/sync_render_llm_ollama.mjs
  ```
- [ ] Endpoint doğrulama:
  ```bash
  cd backend && node ./scripts/verify_ollama_endpoint.mjs
  ```
  Beklenen çıktı: `GET /v1/models` PASS, model listede, `POST /v1/chat/completions` PASS, `auth: Bearer [set]`

## E. Render sync (doğrulama PASS sonrası)

`backend/.env` ek alanlar (commit yok):

```env
RENDER_API_KEY=rnd_...
LLM_BASE_URL=https://ollama.example.com/v1
LLM_API_KEY=<aynı OLLAMA_BEARER_TOKEN>
```

- [ ] Sync (HF host/token reddi dahili):
  ```bash
  cd backend && node ./scripts/sync_render_llm_ollama.mjs
  ```
- [ ] Render redeploy tamamlandı
- [ ] Smoke:
  ```bash
  node ./scripts/diagnose_production_generate.mjs
  ```

## F. Commit güvenliği (geliştirici)

- [ ] `git status` — `.env` tracked değil
- [ ] `git grep` ile gerçek token/domain yok:
  ```bash
  git grep -nE "hf_[A-Za-z0-9]{10,}|rnd_[A-Za-z0-9]{10,}" -- backend/deployments/ollama-vps backend/scripts/verify_ollama_endpoint.mjs backend/scripts/sync_render_llm_ollama.mjs
  ```
  (Eşleşme olmamalı; `router.huggingface.co` yalnızca reddetme/durum metinlerinde olabilir)

## G. Başarısızlık — yapmayın

- Production URL’yi repoya commit etmeyin
- Hugging Face `LLM_BASE_URL` ile generate beklemeyin
- `11434` portunu doğrudan internete açmayın
- Bearer token’ı issue/PR/chat’e yapıştırmayın

---

İlgili dosyalar: [`README.md`](README.md), [`setup-ollama-vps.sh`](setup-ollama-vps.sh), [`../render-ollama-production.md`](../render-ollama-production.md)
