# E-Commerce Connections (Shopify, WooCommerce, Daraz, Etsy, Amazon)

Makes the **Connections** part of SuperSender Pro **fully functional** on the
backend. The Lovable `connections` page previously only listed marketplaces;
this adds the real connector layer: validate + live-test credentials, sync
products, pull orders, and fire **WhatsApp order confirmations** through the
existing template + spintax engine.

## Files added

| File | Purpose |
|------|---------|
| `lib/ecommerce/http.js` | Injectable axios wrapper (offline-testable) |
| `lib/ecommerce/index.js` | Provider registry |
| `lib/ecommerce/providers/shopify.js` | Shopify Admin REST API |
| `lib/ecommerce/providers/woocommerce.js` | WooCommerce REST v3 |
| `lib/ecommerce/providers/daraz.js` | Daraz/Lazada Open API (HMAC-SHA256 signing) |
| `lib/ecommerce/providers/etsy.js` | Etsy Open API v3 |
| `lib/ecommerce/providers/amazon.js` | Amazon SP-API (LWA token) |
| `lib/ecommerceStore.js` | Persists connections + cached products/orders |
| `lib/ecommerceManager.js` | connect / test / sync / orders / order-confirmation |
| `routes/ecommerce.js` | REST API + `mountEcommerce(app, deps)` |
| `public/connections.html` | Backend-driven connect dashboard |
| `scripts/test-ecommerce.js` | Offline smoke test (26 assertions, mocked HTTP) |

## Unified connector interface

Every provider implements the same shape, so adding a marketplace is uniform:

```js
{ id, label, credentialFields,
  validate(creds) -> { ok, error },
  async testConnection(creds, http) -> { ok, info },
  async fetchProducts(creds, http, opts) -> [normalizedProduct],
  async fetchOrders(creds, http, opts) -> [normalizedOrder] }
```

Normalized shapes (consistent across all platforms):

```text
product: { externalId, title, sku, price, currency, stock, image, url }
order:   { externalId, number, customerName, customerPhone, total,
           currency, status, items:[{title,qty,price}], createdAt }
```

`http` is injected, so connectors are unit-tested against mocks with **no live
store and no network** (see `scripts/test-ecommerce.js`).

## Credentials per platform

| Platform | Required credentials |
|----------|----------------------|
| Shopify | `shopUrl`, `accessToken` (Admin API token) |
| WooCommerce | `storeUrl`, `consumerKey`, `consumerSecret` |
| Daraz | `appKey`, `appSecret`, `accessToken`, `region` (pk/bd/lk/np) |
| Etsy | `apiKey`, `accessToken` (OAuth2), `shopId` |
| Amazon | `refreshToken`, `clientId`, `clientSecret`, `marketplaceId`, `region` |

> Amazon: SP-API product listings require additional role approval, so
> `fetchProducts` returns `[]` until that scope is granted; orders work via the
> Orders API. AWS SigV4 is **not** required (dropped by Amazon in 2023).

## REST API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ecommerce/platforms` | Platforms + their credential fields |
| GET | `/api/ecommerce/connections` | Saved connections (credentials redacted) |
| POST | `/api/ecommerce/connect` | `{ platform, credentials }` → validate+test+save |
| POST | `/api/ecommerce/connections/:id/test` | Re-test a connection |
| POST | `/api/ecommerce/connections/:id/sync-products` | Sync products into cache |
| GET | `/api/ecommerce/connections/:id/products` | Read cached products |
| POST | `/api/ecommerce/connections/:id/orders` | Pull latest orders |
| GET | `/api/ecommerce/connections/:id/orders` | Read cached orders |
| POST | `/api/ecommerce/connections/:id/orders/:orderId/confirm` | Send WhatsApp order confirmation |
| PUT | `/api/ecommerce/connections/:id` | Toggle active/paused |
| DELETE | `/api/ecommerce/connections/:id` | Disconnect |

## Order confirmation over WhatsApp

`POST /api/ecommerce/connections/:id/orders/:orderId/confirm` renders a message
(default or a saved `templateId`) with order variables
(`{{name}}`, `{{order_number}}`, `{{total}}`, `{{currency}}`, `{{items}}`) and
sends it via the wired WhatsApp sender.

## Wiring into `server.js`

```js
const { mountEcommerce } = require('./routes/ecommerce');
mountEcommerce(app, { sendMessage: async (to, msg) => { /* live WA send */ } });
```

Dashboard: `/connections.html`. Uses `axios` (already a project dependency).

> Security: credentials are stored in `data/ecommerce_connections.json` in the
> same shape used elsewhere; wrap them with the project's `ENCRYPTION_KEY` at
> rest before going to production. API responses already redact credentials.

## Testing

```bash
node scripts/test-ecommerce.js   # 26 assertions, fully offline (mocked HTTP)
```
