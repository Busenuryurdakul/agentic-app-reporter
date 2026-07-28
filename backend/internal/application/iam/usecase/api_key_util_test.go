package usecase_test

import (
	"testing"

	"github.com/masterfabric-go/masterfabric/internal/application/iam/usecase"
)

func TestIsUserAPIKey(t *testing.T) {
	t.Parallel()

	tests := []struct {
		token string
		want  bool
	}{
		{"adcs_abc123", true},
		{"mf_abc123", false},
		{"eyJhbGciOiJIUzI1NiJ9.payload.sig", false},
		{"adcs_", false},
		{"", false},
	}

	for _, tt := range tests {
		if got := usecase.IsUserAPIKey(tt.token); got != tt.want {
			t.Errorf("IsUserAPIKey(%q) = %v, want %v", tt.token, got, tt.want)
		}
	}
}
