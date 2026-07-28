package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
)

type stubAuth struct {
	claims *service.TokenClaims
	err    error
}

func (s stubAuth) HashPassword(string) (string, error) { return "", nil }
func (s stubAuth) VerifyPassword(string, string) error  { return nil }
func (s stubAuth) GenerateToken(context.Context, service.TokenClaims) (string, error) {
	return "", nil
}
func (s stubAuth) ValidateToken(context.Context, string) (*service.TokenClaims, error) {
	return s.claims, s.err
}

type stubAPIKeyValidator struct {
	claims *service.TokenClaims
	err    error
}

func (s stubAPIKeyValidator) ValidateUserAPIKey(context.Context, string) (*service.TokenClaims, error) {
	return s.claims, s.err
}

func TestJWTOrAPIKeyAuth_JWT(t *testing.T) {
	t.Parallel()

	userID := uuid.New()
	auth := stubAuth{claims: &service.TokenClaims{UserID: userID, Email: "a@b.com"}}
	handler := middleware.JWTOrAPIKeyAuth(auth, nil)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id, ok := middleware.UserIDFromContext(r.Context())
		if !ok || id != userID {
			t.Fatalf("expected user id in context")
		}
		method, ok := middleware.AuthMethodFromContext(r.Context())
		if !ok || method != middleware.AuthMethodJWT {
			t.Fatalf("expected jwt auth method, got %q", method)
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp/health", nil)
	req.Header.Set("Authorization", "Bearer jwt-token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
}

func TestJWTOrAPIKeyAuth_APIKey(t *testing.T) {
	t.Parallel()

	userID := uuid.New()
	validator := stubAPIKeyValidator{claims: &service.TokenClaims{UserID: userID, Email: "a@b.com"}}
	handler := middleware.JWTOrAPIKeyAuth(nil, validator)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		method, ok := middleware.AuthMethodFromContext(r.Context())
		if !ok || method != middleware.AuthMethodAPIKey {
			t.Fatalf("expected api_key auth method, got %q", method)
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp/health", nil)
	req.Header.Set("Authorization", "Bearer adcs_deadbeef")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
}
