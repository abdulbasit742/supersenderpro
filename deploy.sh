#!/bin/bash
set -euo pipefail

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example. Fill production values, then run deploy again."
  exit 1
fi

mkdir -p ssl backend/auth backend/uploads backend/.baileys-auth
if [ ! -f ssl/fullchain.pem ] || [ ! -f ssl/privkey.pem ]; then
  if command -v openssl >/dev/null 2>&1; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout ssl/privkey.pem \
      -out ssl/fullchain.pem \
      -subj "/CN=localhost"
  else
    echo "openssl is required to generate local SSL certificates."
    exit 1
  fi
fi

if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  COMPOSE="docker compose"
fi

git pull || true

$COMPOSE down
$COMPOSE build
$COMPOSE up -d

docker exec backend npx prisma migrate deploy --schema src/prisma/schema.docker.prisma \
  || docker exec backend npx prisma db push --schema src/prisma/schema.docker.prisma
docker exec backend node src/db/seed.js

echo "Deployed!"
echo "Dashboard: http://localhost:3000"
echo "Backend:   http://localhost:3001/api/health"
echo "n8n:       http://localhost:5678"
