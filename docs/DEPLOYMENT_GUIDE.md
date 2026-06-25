# SuperSender Pro Deployment Guide

## 1. Local Development
git clone https://github.com/abdulbasit742/supersenderpro.git
cd supersenderpro && npm install
node scripts/setup-production.js
Fill .env with real values, then:
docker-compose up -d
cd backend && npx prisma migrate deploy && cd ..
node server.js

## 2. Critical .env Variables
DATABASE_URL - PostgreSQL connection string
REDIS_URL - Redis URL
JWT_SECRET - 32+ random chars
ENCRYPTION_KEY - exactly 32 chars
ADMIN_NUMBER - WhatsApp admin (923xxxxxxxxx)
SELLING_GROUPS - comma separated group IDs
EMAIL_USER - Gmail for payment parsing
EMAIL_PASSWORD - Gmail App Password

## 3. WhatsApp QR Scanning
http://localhost:3001/api/whatsapp/qr/customer-bot
http://localhost:3001/api/whatsapp/qr/dealer-monitor
http://localhost:3001/api/whatsapp/qr/admin-alerts

## 4. Docker Production
docker-compose -f docker-compose.prod.yml up -d --build

## 5. Cloud Deploys
Railway: push to main (railway.json)
Render: connect repo (render.yaml)
Fly.io: fly deploy (fly.toml)

## 6. SSL Setup
bash scripts/ssl-setup.sh yourdomain.com you@email.com

## 7. n8n Workflows
1. Open http://localhost:5678
2. Import files from n8n-workflows/

## 8. Backup and Monitoring
npm run backup - backup data folder
npm run monitor - continuous health monitoring
npm run load-test - basic load test

## 9. Health Endpoints
http://localhost:3001/api/health
http://localhost:3001/api/monitoring/health
