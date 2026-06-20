# Marketplace Intelligence — Safety & Privacy

## Default posture
- `MARKETPLACE_INTELLIGENCE_DRY_RUN=true` — nothing acts on the world.
- `MARKETPLACE_INTELLIGENCE_AI_LIVE=false` — recommendations are rule-based.
- `MARKETPLACE_INTELLIGENCE_ECOMMERCE_WRITE=false`, `..._SOCIAL_POST=false`,
  `..._CHANNEL_POST=false` — no writes/posts.

## The engine NEVER
- sends WhatsApp messages, posts to channels/social, or writes ecommerce products/orders
- creates real orders, approves payments, removes users, or deletes group messages
- auto-bans sellers or modifies group membership
- stores full raw messages

## Data minimization (enforced in `normalizer.js`)
- Phone numbers, emails, tokens, URLs and long reference numbers are **masked** before
  storage (`maskId`, `maskName`, `safeText`).
- Stored snippets are clamped (≤160 chars) and stripped of PII/tokens.
- Identities are one-way hashed (`seller_…`, `buyer_…`, `src_…`); the original value is
  never persisted.
- `metadataSafe` holds only derived fields (sku, price value, stock signal, masked ids).

The self-test asserts no full phone number appears in any API output
(`npm run marketplace:intelligence:check`).

## Admin protection
Write endpoints (`POST /ingest`, `*/generate`) require header `x-admin-secret` matching
`MARKETPLACE_ADMIN_SECRET` (falls back to `CHANNEL_ADMIN_SECRET` / `ADMIN_TOKEN`). If
none is configured the server allows them in **dev mode** and logs a warning — set the
secret before exposing publicly.

## Never commit
`.env`, `.env.*`, `data/*.json`, `logs/`, `uploads/`, `sessions/`, `.wa-auth/`,
`.baileys-auth/`, `baileys_auth*/`, `node_modules/`, token/credential files, WhatsApp
session files, browser cache, private backups. (All covered by `.gitignore`; the runtime
store lives at `data/marketplace-intelligence.json` which is ignored.)

## Enabling deeper integrations later (carefully)
1. Set `MARKETPLACE_ADMIN_SECRET`.
2. Wire real adapters to feed already-fetched data (still masked).
3. To use live AI, set `MARKETPLACE_INTELLIGENCE_AI_LIVE=true` and pass the project's
   `callAIProvider` into `recommendations(aiCallFn)`.
4. Keep write flags off until each downstream action is reviewed; the Flow Studio
   actions in `flowNodes.js` are all `dryRun: true` and produce drafts only.
