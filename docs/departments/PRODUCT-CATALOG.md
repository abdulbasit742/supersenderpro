# #83 Product Catalog & Variants

Central product store: products, variants, pricing, categories, tags, and search. The single source of truth that Orders (#63), Inventory (#66), Reviews (#77), and Cart Recovery (#80) read from.

## Design
- **JSON-backed**: `data/catalog.json` (`{ products }`). No DB, no new deps.
- **Tenant-scoped**: every product carries `tenantId`.
- **Variants**: each product can have variants with their own SKU + price + attributes.
- **SKU integrity**: optional uniqueness enforced across products + variants per tenant; doctor flags dupes.

## Modules (`lib/catalog/`)
| File | Role |
|---|---|
| `config.js` | Currency, SKU uniqueness, page size |
| `store.js` | JSON load/save + accessors |
| `productEngine.js` | create/update/remove, variants, price resolution |
| `search.js` | query by text/category/tag + pagination |
| `doctor.js` | Self-diagnostic + duplicate-SKU detection |
| `index.js` | Barrel + high-level helpers |

## Config (env)
| Var | Default | Meaning |
|---|---|---|
| `CATALOG_ENABLED` | `true` | Master switch |
| `CATALOG_CURRENCY` | `PKR` | Default currency |
| `CATALOG_UNIQUE_SKU` | `true` | Enforce unique SKUs |
| `CATALOG_PAGE_SIZE` | `50` | Default list page size |

## API (`/api/catalog`)
- `GET /health`
- `GET /?q=&category=&tag=&activeOnly=&page=&pageSize=` — search/list
- `GET /:productId` — one product
- `POST /` — create `{ name, sku?, price?, variants?, ... }`
- `PATCH /:productId` — update allowed fields
- `POST /:productId/variants` — add a variant
- `GET /:productId/price?variantId=` — resolve price
- `DELETE /:productId` — remove

## Wiring (server.js, 1 line — not auto-applied)
```js
app.use('/api/catalog', require('./routes/catalogRoutes'));
```

## Cross-dept
- **Orders #63 / Cart Recovery #80**: resolve product + variant prices via `priceOf`.
- **Inventory #66**: keys stock by product/variant SKU.
- **Reviews #77**: reviews reference `productId` from here.

## Verify
```
npm run catalog:check
npm run catalog:smoke
```
