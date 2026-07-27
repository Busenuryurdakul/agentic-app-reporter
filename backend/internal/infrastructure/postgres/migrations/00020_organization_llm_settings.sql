-- +goose Up
-- Organization-scoped LLM provider settings (separate from app_api_keys and user_api_keys).
CREATE TABLE IF NOT EXISTS organization_llm_settings (
    organization_id     UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    provider            TEXT NOT NULL,
    base_url            TEXT,
    model               TEXT,
    provider_api_key_enc TEXT,
    timeout_seconds     INT,
    max_retries         INT,
    enabled             BOOLEAN NOT NULL DEFAULT true,
    updated_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organization_llm_settings_updated_at ON organization_llm_settings(updated_at);

-- +goose Down
DROP TABLE IF EXISTS organization_llm_settings;
