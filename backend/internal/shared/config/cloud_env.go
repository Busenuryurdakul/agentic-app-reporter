package config

import (
	"fmt"
	"net"
	"net/url"
	"os"
	"strconv"
	"strings"
)

// applyCloudEnvOverrides maps platform-provided env vars (Render, etc.) onto Config.
func applyCloudEnvOverrides(cfg *Config) error {
	if cfg == nil {
		return nil
	}

	cfg.Server.Port = serverPortFromEnv()

	if err := applyDatabaseURL(&cfg.Database); err != nil {
		return err
	}
	if err := applyRedisURL(&cfg.Redis); err != nil {
		return err
	}
	return nil
}

func serverPortFromEnv() int {
	if v := os.Getenv("SERVER_PORT"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	if v := os.Getenv("PORT"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return 8080
}

func applyDatabaseURL(db *DatabaseConfig) error {
	raw := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if raw == "" {
		return nil
	}

	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("parse DATABASE_URL: %w", err)
	}

	scheme := strings.ToLower(u.Scheme)
	if scheme != "postgres" && scheme != "postgresql" {
		return fmt.Errorf("unsupported DATABASE_URL scheme %q", u.Scheme)
	}

	if u.User != nil {
		db.User = u.User.Username()
		if password, ok := u.User.Password(); ok {
			db.Password = password
		}
	}

	host := u.Hostname()
	portStr := u.Port()
	if portStr == "" {
		portStr = "5432"
	}
	port, err := strconv.Atoi(portStr)
	if err != nil {
		return fmt.Errorf("parse DATABASE_URL port: %w", err)
	}

	db.Host = host
	db.Port = port
	db.DBName = strings.TrimPrefix(u.Path, "/")

	if sslmode := u.Query().Get("sslmode"); sslmode != "" {
		db.SSLMode = sslmode
	} else if db.SSLMode == "" || db.SSLMode == "disable" {
		// Render Postgres requires TLS on external URLs; internal URLs still work with require.
		db.SSLMode = "require"
	}

	return nil
}

func applyRedisURL(redisCfg *RedisConfig) error {
	raw := strings.TrimSpace(os.Getenv("REDIS_URL"))
	if raw == "" {
		return nil
	}

	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("parse REDIS_URL: %w", err)
	}

	scheme := strings.ToLower(u.Scheme)
	if scheme != "redis" && scheme != "rediss" {
		return fmt.Errorf("unsupported REDIS_URL scheme %q", u.Scheme)
	}

	host := u.Hostname()
	portStr := u.Port()
	if portStr == "" {
		if scheme == "rediss" {
			portStr = "6380"
		} else {
			portStr = "6379"
		}
	}
	port, err := strconv.Atoi(portStr)
	if err != nil {
		return fmt.Errorf("parse REDIS_URL port: %w", err)
	}

	redisCfg.Host = host
	redisCfg.Port = port

	if u.User != nil {
		if password, ok := u.User.Password(); ok {
			redisCfg.Password = password
		}
	}

	if path := strings.TrimPrefix(u.Path, "/"); path != "" {
		if dbNum, err := strconv.Atoi(path); err == nil {
			redisCfg.DB = dbNum
		}
	}

	// Some providers pass host:port without url.Parse splitting as expected.
	if redisCfg.Host == "" && u.Host != "" {
		host, portStr, splitErr := net.SplitHostPort(u.Host)
		if splitErr == nil {
			redisCfg.Host = host
			if port, parseErr := strconv.Atoi(portStr); parseErr == nil {
				redisCfg.Port = port
			}
		}
	}

	return nil
}
