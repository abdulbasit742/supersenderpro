# AI Campaign Copywriter (broadcast copy + A/B variants)

Turn a one-line brief into ready-to-send **WhatsApp broadcast copy**: multiple on-brand variants for A/B testing, each with `{{name}}`-style merge fields, tone + language control (English / Urdu / Roman Urdu), and a built-in **anti-ban / spam lint** so a careless blast doesn't get the number flagged. Runs on your **self-hosted Ollama** — unlimited copy, zero cost.

## Why

Writing good broadcast copy is the slow part of running campaigns, and bad copy (spammy words, ALL CAPS, too many links) is exactly what gets WhatsApp numbers banned. This generates strong variants and lints them for risk before you ever hit send.

## What you get

- **N A/B variants** from one brief, labeled Variant A / B / C…
- **Merge-field personalization** (`{{name}}`) baked in.
- **Language match**: English, Urdu, Roman Urdu, Hindi.
- **Anti-ban lint**: 0-100 risk score + issues (spam words, CAPS ratio, link count, emoji spam, missing opt-out).
- **Graceful fallback**: model offline → deterministic templates so you can still ship.

**Zero new npm dependencies.**

## Files

- `lib/campaignCopy/campaignCopy.js` — generate + lint + health.
- `routes/campaignCopyRoutes.js` — self-mountable router.
- `tests/smoke/campaignCopySmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/campaign-copy', require('./routes/campaignCopyRoutes'));
```

## Environment

```
CAMPAIGN_COPY_MODEL=qwen2.5:32b   # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/campaign-copy/generate` | N variants from a brief. Body: `{ brief, offer?, cta?, tone?, language?, variants?, audience? }` |
| POST | `/api/campaign-copy/lint` | Spam/anti-ban score for any text. Body: `{ text }` |
| GET | `/api/campaign-copy/health` | Brain status |

### Example

```bash
curl -X POST http://localhost:3000/api/campaign-copy/generate \
  -H 'Content-Type: application/json' \
  -d '{"brief":"Eid sale, 20% off all tools","cta":"Reply YES","language":"roman-ur","variants":3}'
# -> { success:true, variants:[{label:"Variant A", text:"...", lint:{score,level,issues}}, ...] }
```

## Wiring into broadcasts (wati campaigns)

The existing `routes/wati.js` creates campaigns with a `messageTemplate`. Flow:

1. Call `/generate` to get variants → show them in the campaign composer.
2. The user picks one (or runs A/B: send Variant A to half the segment, B to the other).
3. Pass the chosen text straight into `POST /wati/campaigns` as `messageTemplate` (the `{{name}}` merge field plugs into the existing `lib/mergeFields.js`).
4. Before send, `/lint` the final text and warn if `level` is medium/high.

## Tests

```bash
node tests/smoke/campaignCopySmoke.js
```
