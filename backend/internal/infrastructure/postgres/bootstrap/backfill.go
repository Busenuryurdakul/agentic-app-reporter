package bootstrap

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// BackfillOrgAdminRoles assigns org_admin to active organization members who have no roles.
// Repairs orgs created while RBAC templates were missing (Render deploy without seed).
func BackfillOrgAdminRoles(ctx context.Context, db *pgxpool.Pool) (int64, error) {
	tag, err := db.Exec(ctx, `
		INSERT INTO user_roles (id, user_id, role_id, organization_id, app_id, created_at)
		SELECT gen_random_uuid(), ou.user_id, r.id, ou.organization_id, NULL, NOW()
		FROM organization_users ou
		INNER JOIN roles r
			ON r.scope_type = 'organization'
			AND r.scope_id = $1
			AND r.name = 'org_admin'
		WHERE ou.status = 'active'
		AND NOT EXISTS (
			SELECT 1 FROM user_roles ur
			WHERE ur.user_id = ou.user_id
			  AND ur.organization_id = ou.organization_id
		)
		ON CONFLICT (user_id, role_id, organization_id, app_id) DO NOTHING
	`, systemScopeID)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}
