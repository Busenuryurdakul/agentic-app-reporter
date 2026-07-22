-- +goose Up
-- +goose StatementBegin
ALTER TABLE generated_documents
    ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE generated_documents
    DROP CONSTRAINT IF EXISTS generated_documents_approval_status_check;

ALTER TABLE generated_documents
    ADD CONSTRAINT generated_documents_approval_status_check
    CHECK (approval_status IN ('draft', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_generated_documents_workspace_approval
    ON generated_documents (workspace_id, approval_status);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_generated_documents_workspace_approval;

ALTER TABLE generated_documents
    DROP CONSTRAINT IF EXISTS generated_documents_approval_status_check;

ALTER TABLE generated_documents
    DROP COLUMN IF EXISTS approved_by,
    DROP COLUMN IF EXISTS approved_at,
    DROP COLUMN IF EXISTS approval_status;
-- +goose StatementEnd
