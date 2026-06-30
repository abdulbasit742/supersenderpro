# #77 Reviews & Ratings

Post-purchase reviews with moderation and aggregate scores. Collect ratings + text from customers, moderate (manual or auto-approve), auto-flag spam/profanity, surface star averages + distributions per product, and rank top-rated products.

## Design
- **JSON-backed**: `data/reviews.json` (`{ reviews }`). No DB, no new deps.
- **Tenant-scoped** + **PII-masked** in all responses.
- **Advisory-safe**: never sends a review request; `onOrderDelivered` only returns an advisory prompt.
- **Moderation-first**: reviews start `pending` (or `flagged`) and only count in aggregates once `approved`.

## Modules (`lib/reviews/`)
| File | Role |
|---|---|
| `config.js` | Rating scale, auto-approve, flag words, alert threshold |
| `store.js` | JSON load/save + filtered list |
| `privacy.js` | Contact-ID masking |
| `moderation.js` | submit, auto-flag, approve/reject, low-rating alert (#28) |
| `aggregate.js` | per-product average + distribution, top products |
| `doctor.js` | Self-diagnostic |
| `index.js` | Barrel + `onOrderDelivered` hook |

## Config (env)
| Var | Default | Meaning |
|---|---|---|
| `REVIEWS_ENABLED` | `true` | Master switch |
| `REVIEWS_MIN_RATING` / `REVIEWS_MAX_RATING` | `1` / `5` | Rating scale |
| `REVIEWS_AUTO_APPROVE` | `false` | Skip moderation |
| `REVIEWS_FLAG_WORDS` | `scam,spam,fake,fraud` | Auto-flag triggers |
| `REVIEWS_ONE_PER_PRODUCT` | `true` | One review per contact/product |
| `REVIEWS_ALERT_AT_OR_BELOW` | `2` | Raise alert for low ratings |

## API (`/api/reviews`)
- `GET /health`
- `POST /` — `{ productId, contactId, rating, title?, body?, orderId? }`
- `GET /queue` — pending + flagged (moderation)
- `POST /:reviewId/moderate` — `{ status, by }`
- `GET /product/:productId` — aggregate (avg + distribution)
- `GET /product/:productId/list` — approved reviews (masked)
- `GET /top?limit=` — top-rated products

## Wiring (server.js, 2-3 lines — not auto-applied)
```js
app.use('/api/reviews', require('./routes/reviewsRoutes'));
// On delivery: require('./lib/reviews').onOrderDelivered({ tenantId, contactId, productId, orderId });
```

## Cross-dept (optional)
- **Admin Alerts #28**: low ratings raise a warning.
- **Order Management #63**: fire `onOrderDelivered` to prompt for a review.

## Verify
```
npm run reviews:check
npm run reviews:smoke
```
