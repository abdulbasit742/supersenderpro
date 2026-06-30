# #74 Referral Program

Two-sided refer-a-friend. Each customer gets a unique referral code; when a new referee qualifies (signup or first order), both the referrer and referee get rewarded — in loyalty points (#71), coupons (#59), or advisory-only if neither dept is wired.

## Design
- **JSON-backed**: `data/referrals.json` (`{ codes, referrals }`). No DB, no new deps.
- **Tenant-scoped** + **PII-masked** in all responses.
- **Advisory-safe**: issues rewards only through existing depts; never sends a message or charges.
- **Anti-abuse**: self-referral blocked, one attribution per referee, optional per-referrer cap.

## Modules (`lib/referral/`)
| File | Role |
|---|---|
| `config.js` | Reward type/amounts, qualify rule, caps |
| `store.js` | JSON load/save, code + referral accessors |
| `privacy.js` | ID masking |
| `codeEngine.js` | Unambiguous code gen, one stable code per owner |
| `attribution.js` | attribute → pending, qualify → rewards |
| `doctor.js` | Self-diagnostic + bridge availability |
| `index.js` | Barrel + `onSignup` / `onFirstOrder` hooks |

## Config (env)
| Var | Default | Meaning |
|---|---|---|
| `REFERRAL_ENABLED` | `true` | Master switch |
| `REFERRAL_REWARD_TYPE` | `points` | `points` \| `coupon` \| `advisory` |
| `REFERRAL_REFERRER_REWARD` | `500` | Reward to the referrer |
| `REFERRAL_REFEREE_REWARD` | `250` | Reward to the new referee |
| `REFERRAL_QUALIFY_ON` | `first_order` | `signup` \| `first_order` |
| `REFERRAL_MIN_ORDER` | `0` | Min order to qualify |
| `REFERRAL_MAX_PER_REFERRER` | `0` | Cap (0 = unlimited) |

## API (`/api/referral`)
- `GET /health`
- `POST /code` — `{ ownerId }` → stable code
- `POST /attribute` — `{ code, refereeId }` → pending referral
- `POST /qualify` — `{ refereeId, orderTotal? }` → reward both sides
- `GET /stats/:referrerId` — totals by status
- `GET /list?referrerId=` — masked referral list

## Wiring (server.js, 2-3 lines — not auto-applied)
```js
app.use('/api/referral', require('./routes/referralRoutes'));
// On signup/first order:
// require('./lib/referral').onFirstOrder({ tenantId, refereeId: contactId, amount });
```

## Cross-dept (optional, degrade gracefully)
- **Loyalty #71**: rewards paid as points via `loyalty.adjust`.
- **Coupons #59**: rewards paid as single-use coupons.
- **Webhook #51 / Orders #63**: fire `onFirstOrder` / `onSignup` to auto-qualify.

## Verify
```
npm run referral:check
npm run referral:smoke
```
