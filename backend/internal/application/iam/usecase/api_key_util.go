package usecase

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
)

const userAPIKeyPrefix = "adcs_"

func generateUserAPIKey() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return userAPIKeyPrefix + hex.EncodeToString(bytes), nil
}

func hashUserAPIKey(key string) string {
	h := sha256.Sum256([]byte(key))
	return hex.EncodeToString(h[:])
}

// IsUserAPIKey reports whether a bearer token looks like a user API key.
func IsUserAPIKey(token string) bool {
	return len(token) > len(userAPIKeyPrefix) && token[:len(userAPIKeyPrefix)] == userAPIKeyPrefix
}
