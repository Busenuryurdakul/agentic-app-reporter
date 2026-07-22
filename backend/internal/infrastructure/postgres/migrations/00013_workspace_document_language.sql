-- +goose Up
-- +goose StatementBegin
ALTER TABLE workspaces
    ADD COLUMN IF NOT EXISTS preferred_document_language VARCHAR(8) NOT NULL DEFAULT 'tr'
        CHECK (preferred_document_language IN ('tr', 'en'));

CREATE INDEX IF NOT EXISTS idx_workspaces_preferred_document_language
    ON workspaces (preferred_document_language);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_workspaces_preferred_document_language;
ALTER TABLE workspaces DROP COLUMN IF EXISTS preferred_document_language;
-- +goose StatementEnd
