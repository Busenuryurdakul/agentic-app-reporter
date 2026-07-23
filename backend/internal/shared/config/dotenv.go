package config

import (
	"bufio"
	"os"
	"strings"
)

// loadDotEnvFiles loads optional .env files when vars are not already set in the
// process environment (shell/export wins). Supports local dev on Windows/macOS/Linux
// where `backend/.env` is copied from .env.example.studio.
func loadDotEnvFiles() {
	for _, path := range []string{".env", ".env.local"} {
		loadDotEnvFile(path)
	}
}

func loadDotEnvFile(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		eq := strings.Index(line, "=")
		if eq <= 0 {
			continue
		}
		key := strings.TrimSpace(line[:eq])
		if key == "" || os.Getenv(key) != "" {
			continue
		}
		val := strings.TrimSpace(line[eq+1:])
		if len(val) >= 2 {
			if (val[0] == '"' && val[len(val)-1] == '"') || (val[0] == '\'' && val[len(val)-1] == '\'') {
				val = val[1 : len(val)-1]
			}
		}
		_ = os.Setenv(key, val)
	}
}
