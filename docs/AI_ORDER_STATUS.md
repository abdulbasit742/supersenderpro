# Order Status Lookup (#114)

24/7 self-serve answer to "where is my order?" on WhatsApp. Deterministic core, optional local-Ollama phrasing, offline-safe.

## What it does
- Customer sends a message (order id, phone, or just "kahan hai mera order").
- Engine resolves the order by **order id**, then by **phone** (last 10 digits), pulling live state from:
  - **#25 Order Extraction** store (placed orders / items / total), and
  - **#70 Delivery Tracking** store (shipment status, courier, tracking no, ETA).
- Returns a customer-ready reply. Ollama phrases it nicely; if the model is down, a clean deterministic template is sent instead.

## Design rules (house conventions)
- **Zero new npm deps** (node core only).
- **Deterministic first**: works with NO model. AI only rephrases, never invents tracking numbers/dates.
- **server.js untouched**: mounted via `require('./routes/orderStatusRoutes')(app)` or aiSuite `mountAll` (#52).
- **Tenant-scoped**: every call needs a tenant (`x-tenant-id` header or `tenantId` in body/query). Missing tenant throws.
- **File-backed fallback** under `data/orderStatus/<tenantId>.json` (only used when #25/#70 stores aren\'t present, e.g. tests).

## Pairs with
- **#25 Order Extraction** - source of placed orders.
- **#70 Delivery Tracking** - source of shipment/courier/ETA.
- **#1 Conversational Support / #17 Intent Router** - route "order status" intent here.

## API
```
POST /api/order-status/ask
  headers: x-tenant-id: store_demo
  body: { "text": "kahan hai mera order #A1024" }   // or { orderId } / { phone }
  -> { ok, found, order, reply }

GET  /api/order-status/resolve?orderId=A1024
  headers: x-tenant-id: store_demo
  -> { ok, found, order }

POST /api/order-status/seed     // local fallback order (testing)
  body: { "order": { "id": "A1024", "phone": "+92300...", "status": "packed" } }
```

## Smoke test
```
node tests/smoke/orderStatusSmoke.js
```
Forces `OLLAMA_HOST=http://127.0.0.1:0` so the deterministic path is verified with no model running.
