package health

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReadiness_DrainingReturns503(t *testing.T) {
	h := NewHandler(nil, nil)
	draining := true
	h.SetDrainingChecker(func() bool { return draining })

	req := httptest.NewRequest(http.MethodGet, "/health/ready", nil)
	rec := httptest.NewRecorder()
	h.Readiness(rec, req)

	assert.Equal(t, http.StatusServiceUnavailable, rec.Code)

	var body HealthResponse
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	assert.Equal(t, "draining", body.Status)
	assert.Equal(t, "draining", body.Services["server"])
}
