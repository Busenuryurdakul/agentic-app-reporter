-- +goose Up
-- +goose StatementBegin
CREATE INDEX IF NOT EXISTS idx_generated_documents_peft_export
    ON generated_documents (organization_id, approved_at ASC, created_at ASC)
    WHERE document_type = 'product_spec'
      AND approval_status = 'approved'
      AND status = 'succeeded';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_generated_documents_peft_export;
-- +goose StatementEnd
