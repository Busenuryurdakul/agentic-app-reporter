-- +goose Up
-- Org LLM settings RBAC: org_admin read/write, developer read-only (viewer covered by *:read).
INSERT INTO role_permissions (role_id, permission, created_at)
SELECT r.id, p.permission, NOW()
FROM roles r
CROSS JOIN (VALUES ('llm:read'), ('llm:write')) AS p(permission)
WHERE r.scope_type = 'organization'
  AND r.scope_id = '00000000-0000-0000-0000-000000000000'
  AND r.name = 'org_admin'
ON CONFLICT (role_id, permission) DO NOTHING;

INSERT INTO role_permissions (role_id, permission, created_at)
SELECT r.id, 'llm:read', NOW()
FROM roles r
WHERE r.scope_type = 'organization'
  AND r.scope_id = '00000000-0000-0000-0000-000000000000'
  AND r.name = 'developer'
ON CONFLICT (role_id, permission) DO NOTHING;

-- +goose Down
DELETE FROM role_permissions
WHERE permission IN ('llm:read', 'llm:write')
  AND role_id IN (
    SELECT id FROM roles
    WHERE scope_type = 'organization'
      AND scope_id = '00000000-0000-0000-0000-000000000000'
      AND name IN ('org_admin', 'developer')
  );
