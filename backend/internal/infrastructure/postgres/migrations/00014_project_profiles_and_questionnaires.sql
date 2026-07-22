-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS project_profiles (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id                UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
    project_name                VARCHAR(255) NOT NULL DEFAULT '',
    project_description         TEXT NOT NULL DEFAULT '',
    product_type                VARCHAR(100) NOT NULL DEFAULT '',
    target_users                TEXT NOT NULL DEFAULT '',
    main_problem                TEXT NOT NULL DEFAULT '',
    main_use_cases              TEXT NOT NULL DEFAULT '',
    project_status              VARCHAR(50) NOT NULL DEFAULT 'planned',
    preferred_document_language VARCHAR(8) NOT NULL DEFAULT 'tr'
        CHECK (preferred_document_language IN ('tr', 'en')),
    frontend                    JSONB NOT NULL DEFAULT '{}'::jsonb,
    backend                     JSONB NOT NULL DEFAULT '{}'::jsonb,
    data                        JSONB NOT NULL DEFAULT '{}'::jsonb,
    infrastructure              JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai                          JSONB NOT NULL DEFAULT '{}'::jsonb,
    development_standards       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_profiles_organization_id ON project_profiles(organization_id);
CREATE INDEX idx_project_profiles_workspace_id ON project_profiles(workspace_id);

CREATE TABLE IF NOT EXISTS questionnaire_sets (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
    key              VARCHAR(100) NOT NULL,
    title            VARCHAR(255) NOT NULL,
    description      TEXT NOT NULL DEFAULT '',
    is_default       BOOLEAN NOT NULL DEFAULT FALSE,
    active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (key)
);

CREATE INDEX idx_questionnaire_sets_active ON questionnaire_sets(active);

CREATE TABLE IF NOT EXISTS questions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id           UUID NOT NULL REFERENCES questionnaire_sets(id) ON DELETE CASCADE,
    category         VARCHAR(100) NOT NULL,
    title            VARCHAR(500) NOT NULL,
    description      TEXT NOT NULL DEFAULT '',
    input_type       VARCHAR(50) NOT NULL,
    required         BOOLEAN NOT NULL DEFAULT FALSE,
    display_order    INT NOT NULL DEFAULT 0,
    validation_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    visibility_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    help_text        TEXT NOT NULL DEFAULT '',
    example_answer   TEXT NOT NULL DEFAULT '',
    active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (input_type IN (
        'short_text', 'long_text', 'single_select', 'multi_select',
        'boolean', 'number', 'url', 'code', 'json', 'key_value'
    ))
);

CREATE INDEX idx_questions_set_id ON questions(set_id);
CREATE INDEX idx_questions_category ON questions(category);
CREATE INDEX idx_questions_display_order ON questions(set_id, display_order);

CREATE TABLE IF NOT EXISTS question_options (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id    UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    value          VARCHAR(255) NOT NULL,
    label          VARCHAR(255) NOT NULL,
    display_order  INT NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_question_options_question_id ON question_options(question_id);

CREATE TABLE IF NOT EXISTS answers (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    question_id    UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    value          JSONB NOT NULL DEFAULT 'null'::jsonb,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, question_id)
);

CREATE INDEX idx_answers_organization_id ON answers(organization_id);
CREATE INDEX idx_answers_workspace_id ON answers(workspace_id);
CREATE INDEX idx_answers_question_id ON answers(question_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS question_options;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS questionnaire_sets;
DROP TABLE IF EXISTS project_profiles;
-- +goose StatementEnd
