#!/usr/bin/env bash
# Install Ollama + Caddy reverse proxy on Ubuntu 22.04+ for production Render access.
#
# Required env (set before running):
#   OLLAMA_DOMAIN       — public hostname (DNS A record → this VPS)
#   OLLAMA_BEARER_TOKEN — shared secret for Authorization: Bearer (use in Render LLM_API_KEY)
#
# Optional:
#   OLLAMA_MODEL        — default llama3.2
#
# Example:
#   export OLLAMA_DOMAIN="ollama.example.com"
#   export OLLAMA_BEARER_TOKEN="$(openssl rand -hex 32)"
#   sudo -E bash setup-ollama-vps.sh
set -euo pipefail

OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.2}"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Run as root: sudo -E bash $0" >&2
  exit 1
fi

if [[ -z "${OLLAMA_DOMAIN:-}" ]]; then
  echo "OLLAMA_DOMAIN is required (e.g. ollama.example.com)" >&2
  exit 1
fi

if [[ -z "${OLLAMA_BEARER_TOKEN:-}" ]]; then
  echo "OLLAMA_BEARER_TOKEN is required (shared secret for Caddy + Render LLM_API_KEY)" >&2
  exit 1
fi

configure_ollama_localhost() {
  local dropin="/etc/systemd/system/ollama.service.d/override.conf"
  mkdir -p /etc/systemd/system/ollama.service.d
  cat > "${dropin}" <<EOF
[Service]
Environment="OLLAMA_HOST=127.0.0.1:11434"
EOF
  systemctl daemon-reload
}

configure_firewall() {
  if ! command -v ufw >/dev/null 2>&1; then
    echo "==> ufw not installed — manually allow 22/80/443 and do NOT expose 11434"
    return
  fi

  ufw allow 22/tcp comment 'SSH' >/dev/null 2>&1 || true
  ufw allow 80/tcp comment 'HTTP ACME' >/dev/null 2>&1 || true
  ufw allow 443/tcp comment 'HTTPS Caddy' >/dev/null 2>&1 || true

  if ufw status 2>/dev/null | grep -q "Status: active"; then
    echo "==> ufw active (22/80/443 allowed; 11434 not opened)"
  else
    echo "==> ufw rules added; enable manually when ready: sudo ufw enable"
  fi
}

verify_model_listed() {
  local models_json
  models_json="$(curl -sf "http://127.0.0.1:11434/v1/models")"
  if ! echo "${models_json}" | grep -q "\"${OLLAMA_MODEL}\""; then
    echo "ERROR: model ${OLLAMA_MODEL} not listed after pull" >&2
    exit 1
  fi
  echo "==> Model ${OLLAMA_MODEL} listed in /v1/models"
}

echo "==> Installing Ollama..."
if ! command -v ollama >/dev/null 2>&1; then
  curl -fsSL https://ollama.com/install.sh | sh
fi
configure_ollama_localhost
systemctl enable ollama
systemctl restart ollama

echo "==> Pulling model ${OLLAMA_MODEL} (may take several minutes)..."
ollama pull "${OLLAMA_MODEL}"

echo "==> Verifying local OpenAI-compatible API..."
curl -sf "http://127.0.0.1:11434/v1/models" >/dev/null
verify_model_listed

echo "==> Installing Caddy..."
if ! command -v caddy >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y caddy
fi

CADDYFILE="/etc/caddy/Caddyfile"
cat > "${CADDYFILE}" <<EOF
${OLLAMA_DOMAIN} {
    @authorized {
        header Authorization "Bearer ${OLLAMA_BEARER_TOKEN}"
    }
    handle @authorized {
        reverse_proxy 127.0.0.1:11434
    }
    respond "Unauthorized" 401
}
EOF
chmod 600 "${CADDYFILE}"

echo "==> Reloading Caddy (automatic HTTPS via Let's Encrypt)..."
systemctl enable caddy
systemctl reload caddy || systemctl restart caddy

configure_firewall

echo ""
echo "Setup complete."
echo "  Domain:  https://${OLLAMA_DOMAIN}"
echo "  Render:  LLM_BASE_URL=https://${OLLAMA_DOMAIN}/v1"
echo "  Render:  LLM_API_KEY=<same OLLAMA_BEARER_TOKEN you exported>"
echo ""
echo "Security notes:"
echo "  - Ollama binds 127.0.0.1:11434 only"
echo "  - Bearer token is in ${CADDYFILE} (mode 600) — not printed here"
echo "  - From your laptop (after DNS): node backend/scripts/verify_ollama_endpoint.mjs"
