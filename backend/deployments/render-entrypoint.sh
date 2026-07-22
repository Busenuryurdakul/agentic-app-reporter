#!/bin/sh
set -e

if [ -n "${DATABASE_URL}" ]; then
  echo "Running database migrations..."
  /app/goose -dir /app/migrations postgres "${DATABASE_URL}" up
fi

exec /app/masterfabric
