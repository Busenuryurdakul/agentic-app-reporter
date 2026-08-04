package usecase

import (
	"time"

	redislock "github.com/masterfabric-go/masterfabric/internal/infrastructure/redis"
	goredis "github.com/redis/go-redis/v9"
)

// NewGenerationLocker returns a Redis-backed lock when client is non-nil, otherwise in-process.
func NewGenerationLocker(client *goredis.Client, lockTTL time.Duration) GenerationLocker {
	if client != nil {
		return redislock.NewGenerationLock(client, lockTTL)
	}
	return NewGenerationGate()
}
