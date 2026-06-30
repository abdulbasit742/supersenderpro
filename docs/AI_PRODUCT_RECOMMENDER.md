# AI Product Recommender (Feature #128)

Personalized product recommendations for a single contact. Matches a contact's
**interest/intent tags** (from Smart Contact Tagging #105) against the **catalog**
(#76) using deterministic affinity scoring, then optionally asks the AI Brain to
phrase a short WhatsApp pitch.

> Distinct from **Upsell #40** (co-occurrence "frequently bought together").
> #128 is about *who this customer is*, #40 is about *what pairs with the cart*.

## Design rules
- Zero new npm dependencies (Node built-ins + global `fetch`).
- Deterministic core works with **no model**. Ollama only warms up the phrasing.
- Tenant-scoped: missing `tenantId` throws.
- File-backed under `data/productRecommender/<tenant>/`.
- Never touches `server.js`; self-mountable router.

## Mount
```js
app.use('/api/recommender', require('./routes/productRecommenderRoutes'));
```
Or let the AI Suite mounter (#52) pick it up.

## Data sources (auto-detected)
- Catalog: `data/catalog/<tenant>/products.json` (#76) -> fallback `data/productRecommender/<tenant>/catalog.json`.
- Contact tags: `data/contactTags/<tenant>/contacts.json` (#105) -> fallback local `contacts.json`.

## Scoring
| signal | weight |
| --- | --- |
| interest token matches product keyword | +3 each |
| in-stock | +1 |
| popularity | up to +2 (popularity/100) |
| already purchased (`exclude`) | dropped |

No interest signal -> deterministic **popularity fallback** ranking.

## API
| method | path | purpose |
| --- | --- | --- |
| GET | `/api/recommender/health` | liveness |
| GET | `/api/recommender/recommend/:contactId?limit=3&interests=a,b` | ranked recs |
| POST | `/api/recommender/pitch/:contactId` | AI-phrased pitch (falls back) |
| POST | `/api/recommender/contact/:contactId/interests` | set interest tags |
| POST | `/api/recommender/catalog` | upload local catalog fallback |

Tenant via `x-tenant-id` header, body `tenantId`, or `?tenantId=`.

## Offline smoke
```bash
node tests/smoke/productRecommenderSmoke.js
```
Forces the model host unreachable and asserts interest ranking, popularity
fallback, and deterministic pitch all work.
