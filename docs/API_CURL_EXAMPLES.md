# API curl Examples (demo)

```bash
# Status
curl http://localhost:3001/api/developer-portal/status

# API catalog + OpenAPI
curl http://localhost:3001/api/developer-portal/api-catalog
curl http://localhost:3001/api/developer-portal/openapi.json

# Create app (preview)
curl -X POST http://localhost:3001/api/developer-portal/apps -H 'Content-Type: application/json' -d '{"name":"My n8n","appType":"n8n"}'

# Subscribe to an event (dry-run)
curl -X POST http://localhost:3001/api/developer-portal/webhooks -H 'Content-Type: application/json' -d '{"url":"https://example.com/hook","eventTypes":["public_funnel.lead_created"]}'

# Dry-run test delivery
curl -X POST http://localhost:3001/api/developer-portal/webhooks/SUB_ID/test-preview -H 'Content-Type: application/json' -d '{"eventType":"public_funnel.lead_created"}'
```
Use demo tokens only. No secrets in requests.
