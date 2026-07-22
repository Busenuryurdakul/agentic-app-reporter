FROM golang:1.26.4-alpine AS builder
WORKDIR /src
COPY main.go .
RUN CGO_ENABLED=0 GOOS=linux go build -o /mock-llm main.go

FROM alpine:3.24
RUN apk add --no-cache ca-certificates wget
COPY --from=builder /mock-llm /mock-llm
EXPOSE 8080
ENTRYPOINT ["/mock-llm"]
