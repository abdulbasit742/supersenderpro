# A/B Testing / Message Experiments

Stop guessing which broadcast or win-back message works. Define variants, let
recipients get split deterministically, track who replies/orders, and let the
**math** declare a winner. This is the "A/B" slice of the PC #2 overnight batch.

## How it works

1. **Create** an experiment with 2+ message variants and a success metric (`replied`, `ordered`, or `delivered`).
2. **Assign** each recipient via `assign(storeId, expId, phone)` — returns the variant + its template to send. Assignment is **deterministic, sticky, and weighted**: the same phone always lands in the same variant (stable hash), so results aren't polluted by re-rolls.
3. **Track** outcomes (`track(... 'replied'|'ordered')`) — or let the overnight batch **derive** them from the CRM interaction log (an order/reply after the send counts), so natural conversions count with zero extra instrumentation.
4. **Results** computes per-variant conversion + a real **two-proportion z-test** vs the control, and only calls a winner when it's statistically significant.

It **rebuilds nothing** — it reads `storeCRM` interactions for derived conversions and is otherwise self-contained.

## The stats (no black box)

- **Two-proportion z-test** with pooled standard error, two-sided p-value via a normal-CDF approximation. Significant when `p < 1 - confidence` (default 95%).
- **Sample-size hint** (95% confidence, 80% power) so the dashboard can say "keep running" instead of declaring a winner on 5 sends.
- Conversions are de-duplicated per phone, so one customer replying twice still counts once.

## Wiring it into sends

Wherever you send a broadcast/win-back message, ask the experiment which variant to use:

```js
const experiments = require('./lib/experiments');
const a = experiments.assign(storeId, expId, phone); // { variant, label, template }
await sendDirect(phone, render(a.template, ctx));     // your existing sender
// later, when they reply/order (or let the batch derive it):
experiments.track(storeId, expId, phone, 'replied');
```

The Re-Engagement engine is the obvious first caller: A/B your win-back templates and keep the winner.

## Run it

```bash
npm run experiments:check   # validate install + pipeline (isolated, safe)
npm run experiments:batch   # evaluate all running experiments, write summary
```

Dashboard: **`/experiments.html`** — create experiments and watch variant rates + significance live.

## Schedule on PC #2

```cron
45 3 * * *  cd /path/to/supersenderpro && node scripts/experiments-batch.js
```

Set `EXPERIMENTS_AUTODECIDE=true` to let the batch auto-lock a winner once it's
significant; leave it false to just report and decide yourself.

## Live API (optional)

Wire into `server.js` next to the other `/api` mounts:

```js
// EXPERIMENTS HOOK
app.use('/api', require('./routes/experimentsRoutes')());
```

| Method | Path | Does |
|---|---|---|
| GET | `/api/experiments` | List experiments |
| POST | `/api/experiments` | Create `{ name, metric, variants:[{label,template,weight}] }` |
| GET | `/api/experiments/:id/results?deriveCRM=true` | Per-variant rates + significance |
| POST | `/api/experiments/:id/assign` | `{ phone }` -> variant + template (sticky) |
| POST | `/api/experiments/:id/track` | `{ phone, type }` record an outcome |
| POST | `/api/experiments/:id/decide` | `{ variant }` lock a winner |
