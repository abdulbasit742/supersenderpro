# Durable Queue, n8n, and Google Sheets Bridge

SuperSender Pro now has a root-level bridge for reliable report/workflow automation.

## What It Does

- Exposes a durable queue API backed by `lib/queueManager.js`.
- Uses JSON file storage by default: `data/job_queue.json`.
- Auto-upgrades to BullMQ if `REDIS_URL` is set and the `bullmq` package is installed.
- Sends reports to Google Sheets through direct Google REST/JWT when service-account credentials are configured.
- Triggers n8n workflow webhooks for important business events.
- Falls back to durable queued jobs and local JSON exports when Google Sheets or n8n credentials are missing.

## Environment

```env
REDIS_URL=redis://redis:6379
QUEUE_MODE=auto
QUEUE_JSON_FALLBACK=true

GOOGLE_SHEETS_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SERVICE_ACCOUNT_JSON=

N8N_ENABLED=false
N8N_WEBHOOK_SECRET=
N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_URL=
N8N_ORDER_WEBHOOK_URL=
N8N_DEALER_RATE_WEBHOOK_URL=
N8N_BROADCAST_WEBHOOK_URL=
N8N_PAYMENT_WEBHOOK_URL=
N8N_FOLLOWUP_WEBHOOK_URL=
N8N_DASHBOARD_SYNC_WEBHOOK_URL=
```

## Queue Endpoints

```http
GET  /api/queue/status
GET  /api/queue/jobs?status=pending&type=report.sync.google_sheets&limit=100
GET  /api/queue/jobs/:id
POST /api/queue/enqueue
POST /api/queue/jobs/:id/retry
POST /api/queue/jobs/:id/complete
POST /api/queue/jobs/:id/fail
POST /api/queue/process-due
```

Example:

```json
POST /api/queue/enqueue
{
  "type": "report.sync.all",
  "payload": { "source": "manual" },
  "source": "dashboard"
}
```

## Reporting Endpoints

```http
GET  /api/reports/connectors/status
POST /api/reports/sync/google-sheets
POST /api/reports/trigger/n8n
POST /api/reports/sync/all
```

Dry-run Sheets sync:

```json
POST /api/reports/sync/google-sheets?dryRun=true
{
  "sheet": "all"
}
```

n8n trigger:

```json
POST /api/reports/trigger/n8n
{
  "event": "dashboard_sync",
  "payload": {
    "message": "Manual workflow test"
  }
}
```

## Google Sheets Workbook Tabs

The sync creates or updates these tab names if they already exist in the Sheet:

- `Daily Report`
- `Orders`
- `Payments`
- `Customers`
- `Seller Rates`
- `Stock`
- `Queue`
- `n8n Events`

If Google credentials are missing, the system writes a local fallback export:

```text
data/google_sheets_export.json
```

That file is runtime data and must not be committed.

## Scheduled Jobs

- Every 5 minutes: process pending report/n8n queue jobs.
- Daily 11:00 PM Asia/Karachi: run full report sync.

## Internal Event Bridge

These internal events are forwarded to n8n through the reporting bridge:

- `order_*`
- `payment_*`
- `dealer_rate*`
- `daily_broadcast`
- `followup_*`
- `product_updated`

The bridge intentionally does not forward every `message_sent` event, because that would flood n8n and the queue.

## Antigravity / Claude Next Steps

1. Add a dashboard card for `/api/reports/connectors/status`.
2. Add a queue table using `/api/queue/jobs`.
3. Add buttons for:
   - Sync Google Sheets dry-run
   - Sync all reports
   - Trigger n8n test workflow
   - Process queue now
4. If real Redis is available, install `bullmq` and keep `QUEUE_MODE=auto`.
5. If Google Sheets is used, create all workbook tabs once before first sync.
