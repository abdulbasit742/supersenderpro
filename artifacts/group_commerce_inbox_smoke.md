Validation (run locally, do not fake)
  node --check routes/groupCommerceInboxRoutes.js
  node --check lib/groupCommerce/inbox/store.js
  node --check lib/groupCommerce/inbox/aggregator.js
  node --check lib/groupCommerce/inbox/filters.js
  node --check lib/groupCommerce/inbox/marketSummary.js
  node --check lib/groupCommerce/inbox/actionSuggestions.js
  node --check tests/smoke/groupCommerceInboxSmoke.js
  npm run group-commerce:inbox:smoke



Note: inbox modules depend only on express (already in your stack) + Node built-ins ( fs , path , crypto ). No
new dependencies. The aggregator lazily reuses the existing lib/groupCommerce/messageAnalyzer if present, and
degrades gracefully if it isn't.
