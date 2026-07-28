# Backend MCP + User API Keys

**Product:** AI Development Configuration Studio  
**Scope:** HTTP MCP tools + user-scoped API keys (`adcs_` prefix)  
**Out of scope:** WebMCP (browser agent runtime) — future phase

---

## Architecture

```
Cursor / automation
  → adcs_mcp_bridge.mjs (stdio MCP)
    → ADCS HTTP API (/api/v1/mcp/*)
      → JWT or User API Key (Bearer adcs_…)
```

| Layer | Role |
|-------|------|
| **User API keys** | Long-lived M2M credentials per user |
| **Backend MCP** | HTTP tool list + invoke (not full JSON-RPC MCP server) |
| **WebMCP** | Not implemented — Product Spec §6 describes integrations in generated docs only |

---

## User API key lifecycle

1. User opens **Hesap → API Anahtarları** (`/account/api-keys`) or `POST /api/v1/auth/api-keys` (JWT).
2. Server generates `adcs_<64 hex chars>`, stores **SHA-256 hash** only.
3. Raw key returned **once** in create response.
4. List/revoke via JWT; list never returns raw key.
5. Revoke sets `is_active = false`.

**Distinct from:**

- `app_api_keys` — tenant app gateway auth
- Org LLM `provider_api_key_enc` — LLM provider secret

---

## HTTP endpoints

### API keys (JWT only)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/auth/api-keys` | Create key (201) |
| `GET` | `/api/v1/auth/api-keys` | List keys |
| `DELETE` | `/api/v1/auth/api-keys/{keyId}` | Revoke (204) |

### MCP (JWT or API key)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/mcp/health` | Status + `auth_method` |
| `GET` | `/api/v1/mcp/tools` | Tool catalog |
| `POST` | `/api/v1/mcp/tools/call` | Invoke tool |

**Tools:** `get_me`, `llm_health`, `list_documents`, `get_document`, `workspace_readiness`

Workspace tools require:

- `X-Organization-ID` (user must be active org member)
- `workspace_id` in JSON arguments or `X-Workspace-ID`

---

## Cursor MCP setup

1. Create API key in the UI.
2. Set environment variables:

```bash
export ADCS_API_KEY="adcs_…"
export ADCS_ORG_ID="<org-uuid>"
export ADCS_WORKSPACE_ID="<workspace-uuid>"
```

3. Copy `backend/deployments/cursor-mcp.example.json` to `.cursor/mcp.json` locally (not committed).

4. Bridge: `node backend/scripts/adcs_mcp_bridge.mjs`

---

## Product Spec §6 relationship

- **Generated doc (§6):** Questionnaire-driven MCP/automation narrative in `product_spec` Markdown.
- **Runtime MCP (this doc):** Live HTTP tools for agents to read workspace state and documents.
- **WebMCP:** Planned separately; not part of this integration.

---

## Migration

- `00022_user_api_keys.sql` — `user_api_keys` table

---

## Smoke test

```bash
cd backend
node ./scripts/smoke_api_keys_mcp.mjs
```

---

## Security notes

- Plaintext keys never persisted; only SHA-256 hash.
- Org membership enforced when `X-Organization-ID` is present on MCP routes.
- Do not commit real keys to `.cursor/mcp.json` or logs.
