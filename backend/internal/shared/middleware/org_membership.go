package middleware

import (
	"net/http"

	iamModel "github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	iamRepo "github.com/masterfabric-go/masterfabric/internal/domain/iam/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/response"
)

// RequireOrgMembership rejects requests when X-Organization-ID is set but the
// authenticated user is not an active member of that organization.
func RequireOrgMembership(orgUserRepo iamRepo.OrgUserRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			orgID, ok := ResolveOrganizationID(r.Context())
			if !ok {
				next.ServeHTTP(w, r)
				return
			}

			userID, ok := UserIDFromContext(r.Context())
			if !ok {
				response.JSON(w, http.StatusUnauthorized, map[string]string{"error": "not authenticated"})
				return
			}

			member, err := orgUserRepo.GetByOrgAndUser(r.Context(), orgID, userID)
			if err != nil || member == nil || member.Status != iamModel.OrgUserStatusActive {
				response.Error(w, domainErr.New(domainErr.ErrForbidden, "organization access denied", nil))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
