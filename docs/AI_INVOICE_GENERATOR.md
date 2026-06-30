# AI Invoice / Receipt Generator

Turn a confirmed order into a clean invoice/receipt. Deterministic core does all
the money math and numbering with NO model; Ollama only phrases an optional
thank-you note and degrades gracefully when offline.

## House rules
- Deterministic core works with no model.
- Ollama (via ai/aiBrain) only enriches the thank-you line; template fallback when offline.
- Zero new npm dependencies (Node built-ins + existing express).
- server.js untouched; router is self-mountable.
- File-backed storage under data/invoiceGenerator/<tenantId>/.
- Tenant-scoped: missing tenantId throws.

## API
Mount: `app.use('/api/invoice', require('./routes/invoiceRoutes'));`

- `GET  /api/invoice/health`
- `POST /api/invoice/create` body: `{ tenantId, order: { items:[{name,qty,price}], taxRate, discount, currency, customer, notes }, thankYou:true|false }`
- `GET  /api/invoice/get/:invoiceNumber`
- `GET  /api/invoice/list`
- `GET  /api/invoice/render/:invoiceNumber` (plain-text receipt)

Tenant can be supplied via `x-tenant-id` header, body, or query.

## Invoice numbering
`INV-<YYYY>-<seq>` where seq is a per-tenant, per-year counter padded to 5 digits.

## Totals math
- subtotal = sum(qty * price)
- taxAmount = subtotal * taxRate%
- grandTotal = (subtotal - discount) + taxAmount
All rounded to 2 decimals.

## Pairs with
- #25 Order extraction (feed extracted order straight into /create)
- #86 Payment screenshot confirm (issue receipt after payment verified)
- #76 Catalog manager (pull item prices)

## Test
`node tests/smoke/invoiceGeneratorSmoke.js` (runs fully offline)
