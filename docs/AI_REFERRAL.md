# AI Referral Program Engine

Word-of-mouth is the cheapest acquisition there is, and on WhatsApp it\'s native, people forward things. This issues a **unique referral code per advocate**, tracks who they refer, and rewards **both sides** when the referred person qualifies (e.g. first order) — with anti-abuse guards so it can\'t be gamed. The AI phrases the shareable invite; all attribution + reward math is deterministic. Self-hosted Ollama; zero cloud cost.

## Why

A happy customer with a code in hand is your best (and free) salesperson. Two-sided rewards (both referrer and friend get something) dramatically lift participation, and tying the reward to a *qualifying* event (first order, not just a click) means you only pay for real customers.

## Anti-abuse (deterministic guards)

- **One code per advocate** (idempotent issuance, collision-checked).
- **No self-referral** (advocate can\'t refer themselves).
- **One reward per referee** (a referee can only be attributed + rewarded once).
- **Advocate cap** (`maxRewardsPerAdvocate`) to stop farming.
- Reward only fires on the configured **qualify event** (default `first_order`), not on signup/click.

The model never touches attribution or rewards, it only phrases the share message.

## How it works

```
getOrCreateCode(advocate) -> unique code
shareMessage(advocate)    -> AI-phrased forwardable invite  [template fallback]
attribute(referee, code)  -> link new contact to advocate (guards applied), status=pending
qualify(referee, event)   -> on first_order: reward BOTH sides once (via loyalty #60), status=rewarded
```

Rewards are granted through the loyalty engine (#60) when present (points to both phones); otherwise recorded as pending grants. **Zero new npm dependencies.**

## Files

- `lib/referral/referralEngine.js` — code / share / attribute / qualify / stats.
- `routes/referralRoutes.js` — self-mountable router.
- `tests/smoke/referralSmoke.js` — offline smoke test + abuse-guard checks.

## Wiring it up (one line in server.js)

```js
app.use('/api/referral', require('./routes/referralRoutes'));
```

## Environment / config

```
REFERRAL_MODEL=qwen2.5:32b    # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
ORDER_CURRENCY=PKR
OLLAMA_HOST=http://127.0.0.1:11434
```

Tune via `PUT /api/referral/config` (`advocateRewardPoints`, `refereeRewardPoints`, `qualifyEvent`, `maxRewardsPerAdvocate`, `shareLinkBase`).

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/referral/code` | Get/create an advocate\'s code. Body: `{ advocate }` |
| GET | `/api/referral/share` | AI-phrased forwardable invite. Query: `advocate` |
| POST | `/api/referral/attribute` | Link a new contact to a code. Body: `{ referee, code }` |
| POST | `/api/referral/qualify` | Reward both sides on qualify. Body: `{ referee, event? }` |
| GET | `/api/referral/stats` | Program or per-advocate stats |
| GET | `/api/referral/leaderboard` | Top advocates |
| GET/PUT | `/api/referral/config` | Read / tune the program |
| GET | `/api/referral/health` | Brain + loyalty wiring |

### Example

```bash
# advocate gets a code + share message
curl -X POST localhost:3000/api/referral/code -d '{"advocate":"+92300AAA"}' -H 'Content-Type: application/json'
curl 'localhost:3000/api/referral/share?advocate=+92300AAA'
# a friend signs up with the code, then places first order
curl -X POST localhost:3000/api/referral/attribute -d '{"referee":"+92300BBB","code":"AAA12CD"}' -H 'Content-Type: application/json'
curl -X POST localhost:3000/api/referral/qualify -d '{"referee":"+92300BBB","event":"first_order"}' -H 'Content-Type: application/json'
# -> both +92300AAA and +92300BBB get loyalty points
```

## Wiring into the flow

1. When a customer asks to refer / you want to prompt them, call `share({ advocate })` and send the message (great inside loyalty #60 nudges or post-purchase).
2. On a new contact (support agent #1 first message), if their text contains a code, call `attribute({ referee, code })`.
3. On their first confirmed order (order extraction #25), call `qualify({ referee, event:'first_order' })` to reward both sides.

## Tests

```bash
node tests/smoke/referralSmoke.js
```
