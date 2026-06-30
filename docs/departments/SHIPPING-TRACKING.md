# #58 Shipping & Delivery Tracking

Shipment records with carrier + tracking number, a guarded status lifecycle, and draft customer notifications on each status change. Advisory/draft-safe: nothing is auto-sent, no live carrier APIs are called, no new dependencies.

## Status lifecycle

```
label_created → in_transit → out_for_delivery → delivered
         �‾ exception / returned can branch from live states
```

Transitions are guarded (`lib/shipping/shipmentStore.js`). Invalid jumps (e.g. `label_created → delivered`) are rejected with `invalid_transition`.

## Files

- `lib/shipping/config.js` — statuses, transitions, carriers, notify rules
- `lib/shipping/store.js` — atomic JSON store (tmp+rename), tenant-scoped
- `lib/shipping/privacy.js` — phone/address masking for views
- `lib/shipping/shipmentStore.js` — CRUD + guarded transitions
- `lib/shipping/notify.js` — draft-only, consent-gated (#38) notifications
- `lib/shipping/shippingEngine.js` — orchestration + optional orders(#63)/customer360(#46) hooks
- `lib/shipping/doctor.js` — self-check
- `lib/shipping/index.js` — barrel
- `routes/shippingRoutes.js` — REST under `/api/shipping`
- `scripts/shipping-check.js`, `tests/smoke/shippingSmoke.js`

## Wiring (2 lines in server.js)

```js
const shippingRoutes = require('./routes/shippingRoutes');
app.use('/api/shipping', shippingRoutes);
```

## REST

- `POST /api/shipping` — create shipment `{ orderId, contactId, carrier, trackingNumber, toName, toPhone, toAddress }`
- `GET /api/shipping?status=&orderId=&contactId=` — list (masked)
- `GET /api/shipping/:id/track` — status + history + next states
- `POST /api/shipping/:id/status` — `{ status, note }`, returns guarded result + draft notification

All requests need a tenant via `x-tenant-id` header (or `tenantId` in body/query).

## Cross-dept (optional, degrade to no-op)

- On `delivered`, advises Orders (#63) `markFulfilled` if present.
- Emits Customer 360 (#46) events (`shipment_created`, `shipment_in_transit`, …) if present.
- Notifications check messaging consent (#38) if present; otherwise still draft-only.

## Verify

```bash
npm run shipping:check
npm run shipping:smoke
```
