# n8n Workflows

Import these JSON files into self-hosted n8n:

- `dealer-rate-collection.json`
- `daily-broadcast.json`
- `payment-verification.json`
- `customer-followup.json`

Set n8n environment variable:

```text
BACKEND_URL=http://ai-tools-backend:4100
```

Backend webhook endpoints:

```text
POST /api/n8n/webhook
POST /webhook/n8n
```

The backend also triggers n8n when orders, dealer rates, broadcasts, payment verification, and follow-up events happen.
