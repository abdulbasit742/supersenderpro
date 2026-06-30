# Natural-Language Audience Segment Builder

Type an audience in plain language — *"hot leads who never bought, in Lahore, quiet for 30 days"* — and get a **real contact list** you can broadcast to. No filter-UI clicking. The AI maps your words to a safe, structured filter; the filter is evaluated over the lead-intel store (#11). Runs on self-hosted Ollama; zero cloud cost.

## Why

Good targeting is the difference between a broadcast that converts and one that gets you blocked. But filter builders are fiddly. Describing the audience in words is how a founder actually thinks, this turns that sentence into the list.

## Safety-first (no code/SQL, no injection)

The model never writes code or queries. It only emits JSON constrained to a **fixed allow-listed schema**:

```
bands[]  scoreMin  scoreMax  atRisk  hasOrderIntent  neverPurchased  daysSinceMin  daysSinceMax  city
```

Everything is sanitized (unknown fields dropped, scores clamped) before it touches data, and evaluation is plain JS. A deterministic keyword parser is the fallback, so it works with no model and also backfills anything the model missed.

## How it works

```
"hot leads in Lahore who never bought" → AI parse to filter JSON (schema-locked)
   ⊕ deterministic keyword parse (gap-fill) → sanitize
   → evaluate over lead-intel store (#11) → ranked contact list
```

## Files

- `lib/segments/segmentBuilder.js` — build / resolve / save + filter schema.
- `routes/segmentRoutes.js` — self-mountable router.
- `tests/smoke/segmentBuilderSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/segments', require('./routes/segmentRoutes'));
```

## Environment

```
SEGMENT_MODEL=qwen2.5:32b      # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/segments/build` | Text → structured filter (no resolve). Body: `{ text }` |
| POST | `/api/segments/resolve` | Text or filter → contact list. Body: `{ text? , filter?, limit? }` |
| POST | `/api/segments/save` | Save a named segment. Body: `{ name, filter, text? }` |
| GET | `/api/segments` | List saved segments |
| DELETE | `/api/segments/:name` | Delete a saved segment |
| GET | `/api/segments/health` | Brain status + allowed fields |

### Example

```bash
curl -X POST http://localhost:3000/api/segments/resolve \
  -H 'Content-Type: application/json' \
  -d '{"text":"hot leads who never bought in Lahore"}'
# -> { method:"ai", filter:{bands:["hot"],neverPurchased:true,city:"lahore"}, count:23, contacts:[{phone,band,score}, ...] }
```

## Wiring into broadcasts

1. Describe the audience → `POST /resolve` → get `contacts`.
2. Feed the phone list into a campaign (`routes/wati.js`), or into the send-time optimizer (#21) `scheduleBroadcast({ phones })` for per-contact timing.
3. Pair with the campaign copywriter (#13) for the message and the anti-ban lint before send.
4. Save frequent audiences by name and re-resolve them anytime (the list refreshes from live lead data).

## Tests

```bash
node tests/smoke/segmentBuilderSmoke.js
```
