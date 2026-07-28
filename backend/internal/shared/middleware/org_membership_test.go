package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	iamModel "github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
)

type stubOrgUserRepo struct {
	member *iamModel.OrganizationUser
	err    error
}

func (s stubOrgUserRepo) Add(context.Context, *iamModel.OrganizationUser) error { return nil }
func (s stubOrgUserRepo) Remove(context.Context, uuid.UUID, uuid.UUID) error  { return nil }
func (s stubOrgUserRepo) GetByOrgAndUser(context.Context, uuid.UUID, uuid.UUID) (*iamModel.OrganizationUser, error) {
	return s.member, s.err
}
func (s stubOrgUserRepo) ListByOrg(context.Context, uuid.UUID, int, int) ([]*iamModel.OrganizationUser, int, error) {
	return nil, 0, nil
}
func (s stubOrgUserRepo) ListByUser(context.Context, uuid.UUID) ([]*iamModel.OrganizationUser, error) {
	return nil, nil
}

func TestRequireOrgMembership_SkipsWhenNoOrgHeader(t *testing.T) {
	t.Parallel()

	called := false
	handler := middleware.RequireOrgMembership(stubOrgUserRepo{})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/mcp/tools", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if !called || rec.Code != http.StatusOK {
		t.Fatalf("expected pass-through, called=%v status=%d", called, rec.Code)
	}
}

func TestRequireOrgMembership_RejectsNonMember(t *testing.T) {
	t.Parallel()

	orgID := uuid.New()
	userID := uuid.New()
	repo := stubOrgUserRepo{member: &iamModel.OrganizationUser{Status: iamModel.OrgUserStatusRemoved}}

	handler := middleware.RequireOrgMembership(repo)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("next should not run")
	}))

	req := httptest.NewRequest(http.MethodGet, "/mcp/tools", nil)
	ctx := req.Context()
	ctx = context.WithValue(ctx, middleware.ContextKeyUserID, userID)
	ctx = context.WithValue(ctx, middleware.ContextKeyTenantID, orgID)
	req = req.WithContext(ctx)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rec.Code)
	}
}
