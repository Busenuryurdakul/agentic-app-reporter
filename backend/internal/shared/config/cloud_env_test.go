package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoad_PORTFallback(t *testing.T) {
	t.Setenv("SERVER_PORT", "")
	t.Setenv("PORT", "10000")

	cfg := Load()
	assert.Equal(t, 10000, cfg.Server.Port)
}

func TestLoad_SERVER_PORTOverridesPORT(t *testing.T) {
	t.Setenv("SERVER_PORT", "9090")
	t.Setenv("PORT", "10000")

	cfg := Load()
	assert.Equal(t, 9090, cfg.Server.Port)
}

func TestLoad_DATABASE_URL(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgresql://renderuser:secret@dpg-abc.render.com:5432/masterfabric?sslmode=require")

	cfg := Load()

	assert.Equal(t, "renderuser", cfg.Database.User)
	assert.Equal(t, "secret", cfg.Database.Password)
	assert.Equal(t, "dpg-abc.render.com", cfg.Database.Host)
	assert.Equal(t, 5432, cfg.Database.Port)
	assert.Equal(t, "masterfabric", cfg.Database.DBName)
	assert.Equal(t, "require", cfg.Database.SSLMode)
}

func TestLoad_REDIS_URL(t *testing.T) {
	t.Setenv("REDIS_URL", "redis://:redispass@red-abc:6379/2")

	cfg := Load()

	assert.Equal(t, "red-abc", cfg.Redis.Host)
	assert.Equal(t, 6379, cfg.Redis.Port)
	assert.Equal(t, "redispass", cfg.Redis.Password)
	assert.Equal(t, 2, cfg.Redis.DB)
}

func TestApplyDatabaseURL_InvalidScheme(t *testing.T) {
	t.Setenv("DATABASE_URL", "mysql://user:pass@localhost/db")

	require.Panics(t, func() {
		Load()
	})
}

func TestApplyRedisURL_InvalidScheme(t *testing.T) {
	t.Setenv("REDIS_URL", "http://localhost:6379")

	require.Panics(t, func() {
		Load()
	})
}

func TestLoad_DBHostOverridePreservedWithoutDATABASE_URL(t *testing.T) {
	os.Setenv("DB_HOST", "db.example.com")
	defer os.Unsetenv("DB_HOST")

	cfg := Load()
	assert.Equal(t, "db.example.com", cfg.Database.Host)
}
