# Build stage
FROM golang:1.26.4-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/masterfabric ./cmd/server
RUN go install github.com/pressly/goose/v3/cmd/goose@v3.26.0

# Runtime stage
FROM alpine:3.24

RUN apk add --no-cache ca-certificates tzdata wget \
    && addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=builder /bin/masterfabric /app/masterfabric
COPY --from=builder /go/bin/goose /app/goose
COPY --from=builder /app/internal/infrastructure/postgres/migrations /app/migrations
COPY deployments/render-entrypoint.sh /app/render-entrypoint.sh

RUN chmod +x /app/render-entrypoint.sh /app/goose \
    && chown -R appuser:appgroup /app

USER appuser

# Render sets PORT (default 10000); the app reads PORT via config.
EXPOSE 10000

ENTRYPOINT ["/app/render-entrypoint.sh"]
