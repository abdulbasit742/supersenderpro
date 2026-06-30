# Pagination + Sorting Helper

Uniform, bounded list responses so a busy tenant's `/deals` or `/audit` doesn't return a multi-MB array. Opt-in per endpoint.

## Use
```js
const { parseListQuery, paginate } = require('../lib/http/pagination');
router.get('/deals', (req, res) => {
  const all = SP.pipeline.listDeals(req.tenantId, {});
  res.json({ success: true, ...paginate(all, parseListQuery(req)) });
});
```

## Query params
| Param | Default | Notes |
|---|---|---|
| `page` | 1 | 1-based |
| `limit` | 50 (`LIST_DEFAULT_LIMIT`) | clamped to 200 (`LIST_MAX_LIMIT`) |
| `sortBy` / `sort` | none | any field; ISO date strings sort correctly |
| `order` | desc | `asc` or `desc` |

## Response shape
```json
{ "data": [...], "page": 1, "limit": 50, "total": 125, "totalPages": 3, "hasMore": true }
```

## Note
This paginates in-memory (fine for the json driver and current scale). When a list moves to postgres, push `limit`/`offset`/`orderBy` down into the Prisma query for the same response shape - the contract stays identical for the frontend.

## Verify
```bash
node tests/smoke/paginationSmoke.js
```
