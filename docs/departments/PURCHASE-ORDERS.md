# Purchase Orders & Suppliers (Department #67)

Manage suppliers and purchase orders end-to-end: draft a PO, mark it ordered, receive stock (which restocks Inventory), and get reorder suggestions driven by low-stock items.

## Why
SuperSender's commerce side (Orders #63, Inventory #66) can sell stock but had no way to **replenish** it. This department closes that loop: suppliers + purchase orders + receiving that feeds Inventory back up.

## What it does
- **Suppliers**: CRUD-lite records (name, email, phone, lead time, notes). Contact info is PII-masked in list/API views.
- **Purchase Orders**: line items with qty + unit cost, auto-computed total, lifecycle `draft -> ordered -> partial -> received` (or `cancelled`).
- **Receiving**: receive partial or full quantities; over-receiving is capped at the ordered qty. On receive, stock is pushed back into **Inventory (#66)** via `inventory.restock()` / `adjustStock()` when that department is present.
- **Reorder suggestions**: reads low-stock items from Inventory and proposes order quantities (`reorderPoint * PO_REORDER_MULT - onHand`). Advisory only: it never auto-creates or auto-sends POs.

## Design rules (house style)
- JSON-backed under `data/purchase-orders/` (override with `PO_DATA_DIR`).
- **Tenant-scoped**: every call requires `tenantId` or throws.
- **Advisory / draft-safe**: no real orders placed, no emails sent, no charges. `PO_DRY_RUN` defaults true.
- **No new dependencies**: node stdlib + express only.
- **Optional integration**: Inventory (#66) is best-effort `require` in try/catch; everything degrades to advisory if it's absent.

## REST API
Mount: `app.use('/api/purchase-orders', require('./routes/purchaseOrdersRoutes'))`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/suppliers` | list suppliers (masked) |
| POST | `/suppliers` | create supplier |
| PATCH | `/suppliers/:id` | update supplier |
| GET | `/` | list POs (`?state=`, `?supplierId=`) |
| POST | `/` | create PO (`{supplierId, lines:[{sku,qty,unitCost}]}`) |
| POST | `/:id/order` | mark ordered |
| POST | `/:id/receive` | receive (`{receipts:[{sku,qty}]}`) -> restocks Inventory |
| POST | `/:id/cancel` | cancel PO |
| GET | `/reorder-suggestions` | low-stock-driven reorder advice |
| GET | `/:id` | get one PO |

Tenant resolved from `req.tenantId`, `x-tenant-id` header, or body `tenantId`.

## Wiring (server.js, 2 lines)
```js
const purchaseOrdersRoutes = require('./routes/purchaseOrdersRoutes');
app.use('/api/purchase-orders', purchaseOrdersRoutes);
```

## Checks
- `npm run purchase-orders:check` - dependency + integration self-check.
- `npm run purchase-orders:smoke` - full supplier + PO lifecycle + receiving in a temp dir.
