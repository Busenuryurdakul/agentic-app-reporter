package router

import "fmt"

// ValidateSecureAuthWiring fails fast when production would boot without
// authentication or RBAC. Development/test environments may still run with
// nil Auth/RBAC (for example when the database is unavailable) so local
// workflows and unit tests are not broken.
//
// Production wiring in cmd/server always injects AuthService and RBACService
// when the database is available; this guard closes the gap where APP_ENV is
// production but DB/auth failed to initialize and maybeRequirePermission
// would otherwise become a no-op.
func ValidateSecureAuthWiring(deps Dependencies, production bool) error {
	if !production {
		return nil
	}
	if deps.AuthService == nil {
		return fmt.Errorf("production requires AuthService; refusing to start with authentication disabled")
	}
	if deps.RBACService == nil {
		return fmt.Errorf("production requires RBACService; refusing to start with permission checks disabled")
	}
	return nil
}
