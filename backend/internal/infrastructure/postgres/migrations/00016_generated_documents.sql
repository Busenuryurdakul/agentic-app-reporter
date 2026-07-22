-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS generated_documents (
    id                 UUID PRIMARY KEY,
    organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id       UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title              TEXT NOT NULL,
    document_type      TEXT NOT NULL DEFAULT 'studio_markdown',
    language           TEXT NOT NULL CHECK (language IN ('tr', 'en')),
    status             TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed')),
    markdown_body      TEXT NOT NULL DEFAULT '',
    provider_name      TEXT NOT NULL DEFAULT '',
    model_name         TEXT NOT NULL DEFAULT '',
    error_message      TEXT NOT NULL DEFAULT '',
    source_fingerprint TEXT NOT NULL DEFAULT '',
    created_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_documents_workspace_created
    ON generated_documents (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generated_documents_org
    ON generated_documents (organization_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS generated_documents;
-- +goose StatementEnd
