# Self-hosted n8n for SuperSender Pro

This stack keeps n8n separate from the main SuperSender app and uses PostgreSQL for n8n state.

## Files

- `docker-compose.yml` - n8n + PostgreSQL
- `.env.example` - deployment variables
- `nginx/n8n.conf` - reverse proxy sample

## Start

```powershell
cd "C:\Users\bsphy2304\Documents\New project\supersender-pro-final\deploy\n8n"
copy .env.example .env
docker compose up -d
```

## Reverse proxy

1. Copy `nginx/n8n.conf` to your Nginx sites config.
2. Replace `n8n.example.com` with your real domain.
3. Reload Nginx.

## SuperSender settings

Set these values in SuperSender `data/settings.json` or through `/api/settings`:

- `n8n_enabled`
- `n8n_base_url`
- `n8n_webhook_secret`
- `n8n_order_webhook_url`
- `n8n_dealer_rate_webhook_url`
- `n8n_broadcast_webhook_url`
- `n8n_payment_webhook_url`
- `n8n_followup_webhook_url`

## Workflow import

Import the workflow files from:

`integrations/n8n/workflows/`

Recommended import order:

1. `new-order-orchestration.json`
2. `dealer-rate-auto-collection.json`
3. `daily-broadcast-scheduling.json`
4. `payment-verification-flow.json`
5. `customer-followup-sequences.json`
