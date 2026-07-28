-- +goose Up
-- User-scoped API keys for MCP / headless (M2M) access.
CREATE TABLE IF NOT EXISTS user_api_keys (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash     VARCHAR(255) NOT NULL,
    name         VARCHAR(255) NOT NULL,
    scopes       JSONB,
    expires_at   TIMESTAMPTZ,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE UNIQUE INDEX idx_user_api_keys_hash ON user_api_keys(key_hash);

-- +goose Down
DROP TABLE IF EXISTS user_api_keys;
