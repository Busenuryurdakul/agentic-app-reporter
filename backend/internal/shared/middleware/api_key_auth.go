package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	"github.com/masterfabric-go/masterfabric/internal/shared/logger"
	"github.com/masterfabric-go/masterfabric/internal/shared/response"
)

const userAPIKeyPrefix = "adcs_"

type authMethodKey struct{}

const (
	AuthMethodJWT    = "jwt"
	AuthMethodAPIKey = "api_key"
)

// AuthMethodFromContext returns how the request was authenticated.
func AuthMethodFromContext(ctx context.Context) (string, bool) {
	method, ok := ctx.Value(authMethodKey{}).(string)
	return method, ok
}

func isUserAPIKey(token string) bool {
	return strings.HasPrefix(token, userAPIKeyPrefix)
}

func injectAuthContext(ctx context.Context, method string, claims *service.TokenClaims) context.Context {
	ctx = context.WithValue(ctx, authMethodKey{}, method)
	ctx = context.WithValue(ctx, ContextKeyClaims, claims)
	ctx = context.WithValue(ctx, ContextKeyUserID, claims.UserID)
	ctx = context.WithValue(ctx, ContextKeyEmail, claims.Email)
	if claims.OrganizationID != uuid.Nil {
		ctx = context.WithValue(ctx, ContextKeyOrganizationID, claims.OrganizationID)
	}
	if len(claims.Permissions) > 0 {
		ctx = context.WithValue(ctx, ContextKeyPermissions, claims.Permissions)
	}
	ctx = logger.ContextWithUserID(ctx, claims.UserID.String())
	if claims.OrganizationID != uuid.Nil {
		ctx = logger.ContextWithOrganizationID(ctx, claims.OrganizationID.String())
	}
	return ctx
}

// JWTOrAPIKeyAuth accepts either a JWT bearer token or a user API key (adcs_ prefix).
func JWTOrAPIKeyAuth(authService service.AuthService, apiKeyValidator service.UserAPIKeyValidator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				response.JSON(w, http.StatusUnauthorized, map[string]string{"error": "missing authorization header"})
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
				response.JSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid authorization format"})
				return
			}

			token := parts[1]
			var (
				claims *service.TokenClaims
				method string
				err    error
			)

			if isUserAPIKey(token) {
				if apiKeyValidator == nil {
					response.JSON(w, http.StatusUnauthorized, map[string]string{"error": "api key auth unavailable"})
					return
				}
				claims, err = apiKeyValidator.ValidateUserAPIKey(r.Context(), token)
				method = AuthMethodAPIKey
			} else {
				if authService == nil {
					response.JSON(w, http.StatusUnauthorized, map[string]string{"error": "authentication unavailable"})
					return
				}
				claims, err = authService.ValidateToken(r.Context(), token)
				method = AuthMethodJWT
			}

			if err != nil {
				response.Error(w, err)
				return
			}

			next.ServeHTTP(w, r.WithContext(injectAuthContext(r.Context(), method, claims)))
		})
	}
}
