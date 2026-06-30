# #107 Language Detection + Routing

Detects the language of an inbound WhatsApp message and routes it to the right language-handling lane. Built for a Pakistan-first audience: en / Urdu (Arabic script) / Roman-Urdu / Hindi / Hindi-Latin / Arabic.

## Why deterministic-first
Language routing is plumbing: it must be predictable and work even when the GPU box is down. So:
- **Script ranges** (Arabic / Devanagari / Latin) decide non-Latin languages with high confidence.
- **Urdu-only letters** (ٹ پ چ ڈ ڑ ں ھ ہ ی ے) split Urdu from Arabic.
- **Keyword cues** disambiguate Latin script into English / Roman-Urdu / Hindi-Latin.
- The **model only tie-breaks** ambiguous low-confidence Latin messages. It never overrides a confident deterministic result.
- **Per-contact sticky memory**: once we know someone writes Roman-Urdu, short replies like "ok" stay in their lane.

## API
Mount: `require('./routes/languageDetectRoutes')(app)` (default base `/api/ai-language`).

- `GET /api/ai-language/health`
- `POST /api/ai-language/detect` `{ text, tenantId?, contactId?, useAI? }` → `{ lang, langName, confidence, method, lane }`
- `POST /api/ai-language/forget` `{ tenantId, contactId }` → clears sticky memory

### Lanes
| lang | lane |
|------|------|
| ur, roman-ur | urdu |
| hi, hi-latin | hindi |
| ar | arabic |
| en (default) | english |

## Programmatic
```js
const ld = require('./lib/languageDetect/languageDetect');
const r = await ld.detect('bhai order kitna ka hai', { tenantId: 't1', contactId: 'c1' });
// { lang: 'roman-ur', lane: 'urdu', confidence: 0.7, ... }
```

## Guarantees
- Zero new npm deps.
- Works fully offline (deterministic core); AI is optional tie-break only.
- File-backed, tenant-scoped memory under `data/languageDetect/`.
- `server.js` untouched.

## Test
`node tests/smoke/languageDetectSmoke.js` (offline; points AI at an unreachable host).
