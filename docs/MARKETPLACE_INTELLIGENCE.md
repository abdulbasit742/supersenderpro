# Marketplace Intelligence Graph + Seller/Buyer Command Center

A central intelligence layer that unifies seller offers, buyer demand, SKUs, prices,
stock and risk signals across WhatsApp groups/chats/channels, ecommerce, social posts
and dealer data — **without rebuilding any of those systems**.

- Engine: `lib/marketplaceIntelligence/` (facade in `index.js`)
- API: `routes/marketplaceIntelligenceRoutes.js` → mounted at `/api/marketplace-intelligence`
- Dashboard: `public/marketplace-intelligence.html` → open at `/marketplace-intelligence`
- Self-test: `npm run marketplace:intelligence:check`

> **Dry-run + masked by default.** It never sends messages, posts, writes ecommerce
> records, creates real orders, or calls paid AI unless explicitly enabled. All
> identities are masked (no full phone/email/token); raw messages are never stored.

## How it works
Existing modules feed already-fetched data to **adapters**, which produce normalized,
masked **signals**. The `relationshipBuilder` turns each signal into graph entities
(seller/buyer/product/sku/price/stock/offer/demand/source/alert…) and relationships.
Derived views (rankings, radars, opportunities, recommendations, digest, reports) read
the graph.

```
existing module → adapter → normalized signal → entity graph → insights/recommendations (dry-run)
```

## Modules
| File | Purpose |
|---|---|
| `store.js` | JSON persistence (`data/marketplace-intelligence.json`, history) |
| `entityGraph.js` | Entity + relationship CRUD |
| `normalizer.js` | PII masking, intent/price/stock/risk extraction |
| `skuResolver.js` | Product → SKU normalization + dedupe |
| `relationshipBuilder.js` | Signal → entities + edges |
| `searchIndex.js` | Cross-entity search + filters |
| `sellerProfiler.js`, `trustScoring.js`, `sellerRanking.js` | Seller intelligence |
| `buyerProfiler.js`, `demandScoring.js`, `buyerMatching.js` | Buyer intelligence |
| `priceRadar.js`, `stockRadar.js`, `opportunityDetector.js` | SKU/price/stock radar |
| `adapters/*` | group / channel / ecommerce / social / dealer / order ingestion |
| `recommendationEngine.js`, `aiAdvisor.js`, `digestBuilder.js` | Recommendations + digest |
| `reportBuilder.js` | JSON / Markdown / CSV reports |
| `adminCommands.js` | WhatsApp `!market*` commands |
| `flowNodes.js` | Flow Studio trigger/action registry entries |

## API (mounted at `/api/marketplace-intelligence`)
`GET status·graph·entities·entities/:id·sellers·buyers·skus·prices·stock·opportunities·matches·recommendations·digest·history·report` ,
`POST ingest·search·recommendations/generate·digest/generate`.
Write endpoints (`ingest`, `*/generate`) require `x-admin-secret` (see safety doc).

### Ingest example (dry-run)
```bash
curl -X POST /api/marketplace-intelligence/ingest \
  -H "x-admin-secret: $MARKETPLACE_ADMIN_SECRET" -H "Content-Type: application/json" \
  -d '{"sourceType":"group","payload":{"messages":[{"text":"iPhone 13 128GB price 165000 in stock","who":"+92...","name":"Ali"}],"sourceId":"grp1"}}'
```

## Running checks
```bash
npm run marketplace:intelligence:check
node --check server.js
```

See also: `MARKETPLACE_SELLER_BUYER_GRAPH.md`, `MARKETPLACE_INTELLIGENCE_COMMANDS.md`,
`MARKETPLACE_INTELLIGENCE_SAFETY.md`.
