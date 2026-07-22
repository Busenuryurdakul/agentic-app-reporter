package redis

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	goredis "github.com/redis/go-redis/v9"
)

const generationLockKeyPrefix = "generation:lock:"

var releaseLockScript = goredis.NewScript(`
if redis.call("GET", KEYS[1]) == ARGV[1] then
	return redis.call("DEL", KEYS[1])
end
return 0
`)

// GenerationLock is a Redis-backed distributed generation lock per workspace.
type GenerationLock struct {
	client *goredis.Client
	ttl    time.Duration

	mu        sync.Mutex
	held      map[uuid.UUID]string
	localCount int
}

// NewGenerationLock creates a Redis generation lock. ttl should exceed max LLM call duration.
func NewGenerationLock(client *goredis.Client, ttl time.Duration) *GenerationLock {
	if ttl <= 0 {
		ttl = 90 * time.Second
	}
	return &GenerationLock{
		client: client,
		ttl:    ttl,
		held:   make(map[uuid.UUID]string),
	}
}

// TryBegin acquires a distributed lock for the workspace.
func (l *GenerationLock) TryBegin(ctx context.Context, workspaceID uuid.UUID) (bool, error) {
	if l == nil || l.client == nil {
		return true, nil
	}
	token := uuid.New().String()
	key := generationLockKeyPrefix + workspaceID.String()

	ok, err := l.client.SetNX(ctx, key, token, l.ttl).Result()
	if err != nil {
		return false, fmt.Errorf("redis generation lock: %w", err)
	}
	if !ok {
		return false, nil
	}

	l.mu.Lock()
	l.held[workspaceID] = token
	l.localCount++
	l.mu.Unlock()
	return true, nil
}

// End releases the distributed lock held by this instance.
func (l *GenerationLock) End(ctx context.Context, workspaceID uuid.UUID) {
	if l == nil || l.client == nil {
		return
	}

	l.mu.Lock()
	token, ok := l.held[workspaceID]
	if ok {
		delete(l.held, workspaceID)
		if l.localCount > 0 {
			l.localCount--
		}
	}
	l.mu.Unlock()

	if !ok {
		return
	}

	key := generationLockKeyPrefix + workspaceID.String()
	_ = releaseLockScript.Run(ctx, l.client, []string{key}, token).Err()
}

// HasInflight reports whether this instance is running any generation.
func (l *GenerationLock) HasInflight() bool {
	if l == nil {
		return false
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.localCount > 0
}

// InflightCount returns in-flight generations on this instance.
func (l *GenerationLock) InflightCount() int {
	if l == nil {
		return 0
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.localCount
}
