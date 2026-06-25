# SuperSender Pro API Documentation

## Quick Start
1. Start server: cd backend && npm run dev
2. Interactive docs: http://localhost:3001/api-docs
3. Download spec: http://localhost:3001/api-docs.json

## Authentication
POST /api/auth/login returns JWT. Use: Authorization: Bearer TOKEN

## Rate Limits
| Endpoint Group | Limit |
|---|---|
| /api/auth | 20 req / 15 min |
| /api/payments | 10 req / min |
| /api/broadcast | 5 req / hour |
| All others | 200 req / 15 min |

## Endpoint Groups

### Auth
POST /api/auth/login, GET /api/auth/me, POST /api/auth/users

### Customers
GET /api/customers, POST /api/customers, GET /api/customers/:phone, PATCH /api/customers/:phone

### Dealers
GET /api/dealers, POST /api/dealers, PUT /api/dealers/:id, DELETE /api/dealers/:id

### Rates
GET /api/rates, POST /api/rates, GET /api/rates/latest

### Stock
GET /api/stock, PUT /api/stock/:id, GET /api/stock/reorder-suggestions

### Payments
GET /api/payments/notifications, POST /api/payments/parse-test, POST /api/payments/verify, POST /api/payments/manual-verify

### Analytics
GET /api/analytics/summary, GET /api/analytics/sales

### WhatsApp
GET /api/whatsapp/status, GET /api/whatsapp/qr/:session, POST /api/whatsapp/send

### Monitoring
GET /api/monitoring/health, GET /api/monitoring/metrics, GET /api/monitoring/info, GET /api/monitoring/performance

### Zero Touch Order Engine
GET /api/zero-touch/summary, GET /api/zero-touch/dynamic-availability, POST /api/zero-touch/run/:job
