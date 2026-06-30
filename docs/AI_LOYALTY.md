# AI Loyalty & Rewards Engine

Repeat buyers are your cheapest revenue. A simple **points + tiers** program keeps them coming back — and on WhatsApp you can deliver it conversationally: every order earns points, tiers unlock multipliers, and the bot nudges customers toward their next reward. The AI phrases the nudge; all the points math is deterministic and safe. Self-hosted Ollama; zero cloud cost.

## Why

Acquiring a new customer costs far more than keeping one. Points + tiers create a reason to come back to YOU instead of a competitor, and a well-timed "just 200 points to free delivery!" nudge drives the next order with near-zero cost.

## Safety

Points, tier thresholds, and redemption are **pure deterministic math**. A balance can **never go negative** (redemption is hard-guarded against the balance), and tiers are simple thresholds. The model is used **only** to phrase friendly messages, never to change a balance. The smoke test fuzzes 3,000 random earn/redeem operations to prove the no-negative invariant.

## How it works

```
earn(spend) -> points = round(spend * pointsPerCurrency * tierMultiplier)  (tier from current balance)
tier         -> bronze/silver/gold/platinum by point thresholds (configurable)
redeem(reward|points) -> hard-guarded against balance; converts points to a discount value
nudge(phone) -> balance + tier + next reachable reward, phrased by the AI [template fallback]
```

- **Configurable:** earn rate, redeem value per point, tier thresholds + multipliers, and the reward catalog — all via `PUT /config`.
- **Zero new npm dependencies.**

## Files

- `lib/loyalty/loyaltyEngine.js` — earn / redeem / balance / tier / nudge / leaderboard.
- `routes/loyaltyRoutes.js` — self-mountable router.
- `tests/smoke/loyaltySmoke.js` — offline smoke test + no-negative-balance fuzz.

## Wiring it up (one line in server.js)

```js
app.use('/api/loyalty', require('./routes/loyaltyRoutes'));
```

## Environment / config

```
LOYALTY_MODEL=qwen2.5:32b    # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
ORDER_CURRENCY=PKR
OLLAMA_HOST=http://127.0.0.1:11434
```

Tune the program via `PUT /api/loyalty/config` (`pointsPerCurrency`, `redeemValuePerPoint`, `tiers`, `rewards`).

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/loyalty/earn` | Award points. Body: `{ phone, spend? \| points?, reason? }` |
| POST | `/api/loyalty/redeem` | Redeem points/reward. Body: `{ phone, points? \| rewardId? }` |
| GET | `/api/loyalty/balance` | Points, tier, next reward |
| GET | `/api/loyalty/nudge` | AI-phrased nudge toward next reward |
| GET | `/api/loyalty/leaderboard` | Top customers by lifetime points |
| GET/PUT | `/api/loyalty/config` | Read / tune the program |
| GET | `/api/loyalty/health` | Brain status |

### Example

```bash
# on every confirmed order:
curl -X POST localhost:3000/api/loyalty/earn -H 'Content-Type: application/json' -d '{"phone":"+92300xxxxxxx","spend":2500}'
# nudge them later:
curl 'localhost:3000/api/loyalty/nudge?phone=+92300xxxxxxx'
# -> { points:3250, tier:"silver", nextReward:{label:"15% off any item"}, message:"You\'re at 3250 points..." }
```

## Wiring into the flow

1. On every confirmed order (order extraction #25 / checkout), call `earn({ phone, spend })`.
2. Surface `balance` in Customer 360 (#48) and let the support agent (#1) answer "how many points do I have?".
3. Use `nudge` in win-back (#36) and broadcasts (#13/#42) to drive the next purchase.
4. On redemption, pass the `valueOff` into negotiation (#56) / checkout as a discount.

## Tests

```bash
node tests/smoke/loyaltySmoke.js
```
