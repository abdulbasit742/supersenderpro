# Feature #63 — Order Management

Turn a cart into a tracked order: line items + coupon-aware totals, a place/pay/fulfill/deliver
status flow with guarded transitions, a linked payment, and (draft-safe) status-update messages to
the customer. The revenue spine that ties payments (#1), coupons (#59), and customer 360 (#46)
together.

## Why
Payments (#1) handle money and coupons (#59) handle discounts, but nothing represented the *order*
itself: what was bought, for how much, and where it is in the pipeline. For any商品-selling
WhatsApp business that's the core record. This adds it: compute totals once, track status cleanly,
and keep the customer informed.

## What it does
- **Quote / totals:** `compute({ items, couponCode?, contact?, taxPercent?, shippingFlat? })` →
  line totals → subtotal → **coupon discount** (via #59, free-shipping aware) → tax on the
  discounted subtotal → shipping → grand total. Use it for live cart pricing before creating an order.
- **Create + place:** `create(...)` makes a `draft` order with computed totals; `place()` moves it
  to `pending` and messages the customer.
- **Guarded status flow:** `draft → pending → paid → fulfilled → delivered`, plus `cancelled` /
  `refunded`. Illegal jumps (e.g. pending → delivered) are **blocked**. Every change is recorded in
  the order's history.
- **markPaid:** links the payment ref, **redeems the coupon** (#59, idempotent per order), and
  records a `payment` event in customer 360 (#46).
- **Status messages:** each transition fires a draft-only, consent-gated (#38) customer message.
- **Overview:** counts per status + **recognized revenue** (paid/fulfilled/delivered).

## Files
- `lib/orders/config.js` — env posture (currency, tax, shipping, draft messages) + status flow
- `lib/orders/store.js` — atomic JSON store (`data/orders.json`) + order numbering
- `lib/orders/privacy.js` — contact masking
- `lib/orders/totals.js` — pure totals math (coupon-aware via #59)
- `lib/orders/notify.js` — single outbound hook (`setNotifier`), consent-gated
- `lib/orders/orderEngine.js` — create/place/markPaid/transition lifecycle
- `lib/orders/doctor.js` — offline self-check + posture
- `lib/orders/index.js` — barrel
- `routes/ordersRoutes.js` — REST surface (`/api/orders`)
- `scripts/orders-check.js`, `tests/smoke/ordersSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const ordersRoutes = require('./routes/ordersRoutes');
app.use('/api/orders', ordersRoutes);
// optional status messages: require('./lib/orders').setNotifier(async (to,msg)=>waClient.sendMessage(to,msg));
```
Typical flow (e.g. from the WhatsApp shop bot): quote → create → place → (payment #1 webhook) markPaid → fulfill → deliver.
```js
const od = require('./lib/orders');
const quote = od.totals.compute({ items, couponCode, contact });   // show price
const order = od.orderEngine.create({ contact, items, couponCode });
await od.orderEngine.place(order.id);
// when payments #1 confirms the webhook:
await od.orderEngine.markPaid(order.id, { paymentRef });
```
Great with the payment-fulfillment bridge (#1): on a verified payment, call markPaid().

## Endpoints (`/api/orders`)
- `GET /status`, `GET /doctor`, `GET /overview`
- `POST /quote` `{ items, couponCode?, contact? }` — totals preview (no order)
- `POST /orders` `{ contact, name?, items, couponCode?, notes? }`, `GET /orders` (`?status=&contact=`), `GET /orders/:id`
- `POST /orders/:id/place`, `POST /orders/:id/paid` `{ paymentRef }`, `POST /orders/:id/fulfill`, `POST /orders/:id/deliver`, `POST /orders/:id/cancel` `{ reason }`, `POST /orders/:id/refund` `{ reason }`

## Safety
JSON-backed; **computes + tracks orders, never charges** (payments #1 owns money movement) and
never sends directly until `ORDERS_LIVE_MESSAGES=true` + a notifier (consent-gated via #38).
Status transitions are guarded against illegal jumps. Coupon redemption is idempotent per order.
Contacts masked. Orders cancelled/refunded, never hard-deleted. 100% additive; no existing module/
route/data changed, no new dependency.

## Env
```
ORDERS_ENABLED=true
ORDERS_DEFAULT_CURRENCY=PKR
ORDERS_LIVE_MESSAGES=false                    # true + notifier => status messages actually send
ORDERS_RESPECT_CONSENT=true
ORDERS_TAX_PERCENT=0
ORDERS_SHIPPING_FLAT=0
```

## Verify
```bash
for f in lib/orders/*.js; do node --check "$f"; done
node --check routes/ordersRoutes.js
npm run orders:check
npm run orders:smoke
```

Feature #63 done. Agle number ka intezaar.
