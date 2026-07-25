#!/bin/sh
set -e

if [ -n "${DATABASE_URL}" ]; then
  echo "Running database migrations..."
  # goose accepts postgres://; Render often provides postgresql://
  case "${DATABASE_URL}" in
    postgresql://*) GOOSE_DB_URL="postgres://${DATABASE_URL#postgresql://}" ;;
    *) GOOSE_DB_URL="${DATABASE_URL}" ;;
  esac
  /app/goose -dir /app/migrations postgres "${GOOSE_DB_URL}" up
fi

exec /app/masterfabric
