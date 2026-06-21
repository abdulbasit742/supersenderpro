 # Group Commerce Inbox + Market Intelligence — Gap Report

 **Scan-first result.** This layer sits on top of the existing Group Commerce OS. Nothing is rebuilt.


 ## Legend
 exists | partially_exists | missing | duplicate_risk | safe_to_extend | needs_route | needs_ui | needs_test | needs_docs


 ## Existing systems detected (reuse, do not duplicate)
 | Area | Status | Note |
 |---|---|---|
 | Group Commerce OS core (`lib/groupCommerce/*`) | exists | reuse store + analyzer + catalog |
 | Adapter layer (`lib/groupCommerce/adapters/*`) | exists | reuse for later live wiring; inbox only drafts |
 | `routes/groupCommerceRoutes.js` | exists | inbox mounts on a separate path |
 | `public/group-commerce.html` | exists | inbox is a distinct operational view, not a duplicate |
 | Catalog price intelligence | partially_exists | has min/max/latest per SKU; inbox adds cross-group market summary |
 | QA pack / smoke tests | exists | inbox adds its own smoke test |


 ## Inbox layer (to build)
 | File | Status |
 |---|---|
 | `lib/groupCommerce/inbox/store.js` | missing -> create |
 | `lib/groupCommerce/inbox/aggregator.js` | missing -> create |
 | `lib/groupCommerce/inbox/filters.js` | missing -> create |
 | `lib/groupCommerce/inbox/marketSummary.js` | missing -> create |
 | `lib/groupCommerce/inbox/actionSuggestions.js` | missing -> create |
 | `routes/groupCommerceInboxRoutes.js` | missing -> needs_route |
 | `public/group-commerce-inbox.{html,js,css}` | missing -> needs_ui |
 | `docs/GROUP_COMMERCE_INBOX.md` | missing -> needs_docs |
 | `tests/smoke/groupCommerceInboxSmoke.js` | missing -> needs_test |

 ## Duplicate risk control
 - Inbox **reads** normalized records; it does not re-implement analysis. Callers pass already-analyzed output (e.g. from
 `messageAnalyzer`) into `/ingest`.
 - Inbox does not write to catalog, ecommerce, orders, or send anything.
 - Action suggestions are dry-run drafts only; live wiring (later) goes through the existing adapter layer, never from the
 inbox directly.

 ## Verdict
 **safe_to_extend.** Build inbox as new isolated files + tiny append-only hooks.
