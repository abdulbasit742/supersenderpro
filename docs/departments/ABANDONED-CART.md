# #80 Abandoned Cart Recovery

Detects carts that were started but never paid, then drafts a timed recovery sequence (with an optional win-back coupon on the final nudge). Recovers lost revenue without spamming.

## Design
- **JSON-backed**: `data/cart-recovery.json` (`{ carts }`). No DB, no new deps.
- **Tenant-scoped** + **PII-masked**.
- **Draft-only / advisory-safe**: nudges are *drafted and recorded*, never sent. Wire a notifier + flip a flag to actually send.
- **Lifecycle**: `open` → `abandoned` (after inactivity) → nudges drafted → `recovered` (paid after nudges) or `paid`.

## Modules (`lib/cartRecovery/`)
| File | Role |
|---|---|
| `config.js` | Abandon window, nudge schedule, coupon, caps |
| `store.js` | JSON load/save + cart accessors |
| `privacy.js` | Contact-ID masking |
| `detector.js` | track activity, mark paid, detect abandoned |
| `recoverySequence.js` | due-nudge calc, draft builder, win-back coupon (#59) |
| `doctor.js` | Self-diagnostic |
| `index.js` | Barrel + `runCycle` + order/cart hooks |

## Config (env)
| Var | Default | Meaning |
|---|---|---|
| `CART_RECOVERY_ENABLED` | `true` | Master switch |
| `CART_ABANDON_AFTER_MIN` | `60` | Inactivity before abandoned |
| `CART_NUDGE_OFFSETS_HOURS` | `1,24,72` | Nudge schedule (hours after abandon) |
| `CART_MIN_VALUE` | `0` | Min cart value to recover |
| `CART_FINAL_COUPON` | `true` | Offer coupon on final nudge |
| `CART_COUPON_PERCENT` | `10` | Win-back coupon percent |
| `CART_MAX_NUDGES` | `3` | Max nudges per cart |

## API (`/api/cart-recovery`)
- `GET /health`
- `POST /track` — `{ cartId, contactId, value, items? }`
- `POST /paid` — `{ cartId }`
- `POST /run` — detect abandoned + draft due nudges (returns drafts)
- `GET /list?status=` — carts by status (masked)

## Wiring (server.js, 2-3 lines — not auto-applied)
```js
app.use('/api/cart-recovery', require('./routes/cartRecoveryRoutes'));
// Cron (node-cron) every 15m: require('./lib/cartRecovery').runCycle();
// On payment: require('./lib/cartRecovery').onOrderPaid({ tenantId, cartId });
```

## Cross-dept (optional)
- **Coupons #59**: final nudge mints a single-use win-back coupon.
- **Scheduler #17 / Orders #63 / Webhook #51**: drive `runCycle` + `onOrderPaid`.

## Verify
```
npm run cart-recovery:check
npm run cart-recovery:smoke
```
