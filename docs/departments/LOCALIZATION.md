# #86 Multi-Language & Localization

Detects each contact's language, stores their locale, and translates outbound messages into it — using `franc` (already a dependency) for detection and llmHub (local Ollama by default) for translation, with a translation memory to avoid re-translating.

## Design
- **JSON-backed**: `data/localization.json` (`{ contacts, memory }`). No new deps (`franc` already present).
- **Tenant-scoped** per contact.
- **Advisory-safe**: translation never sends anything; if llmHub is in dry-run or absent, it returns the original text flagged `untranslated`.
- **Translation memory**: SHA-keyed cache; manual seeds override the LLM.

## Modules (`lib/localization/`)
| File | Role |
|---|---|
| `config.js` | Default + supported locales, LLM toggle, detection threshold |
| `store.js` | JSON load/save (contacts + memory) |
| `detector.js` | `franc` 639-3 → 639-1 mapping, confidence + fallback |
| `translator.js` | memory-first translate via llmHub, manual seed |
| `doctor.js` | Self-diagnostic + bridge availability |
| `index.js` | Barrel + `observe` / `localize` helpers |

## Config (env)
| Var | Default | Meaning |
|---|---|---|
| `LOCALIZATION_ENABLED` | `true` | Master switch |
| `LOCALE_DEFAULT` | `en` | Fallback locale |
| `LOCALE_SUPPORTED` | `en,ur,hi,ar,es,fr,de` | Allowed locales |
| `LOCALE_TRANSLATE_VIA_LLM` | `true` | Use llmHub to translate |
| `LOCALE_MIN_DETECT_CHARS` | `12` | Min chars to trust detection |

## API (`/api/localization`)
- `GET /health`
- `POST /detect` — `{ text }` → detected locale
- `GET /locale/:contactId` · `POST /locale/:contactId` — get/set locale
- `POST /observe` — `{ contactId, text }` detect + persist
- `POST /translate` — `{ contactId?, text, targetLocale?, sourceLocale? }`
- `POST /memory` — seed `{ targetLocale, text, translation }`

## Wiring (server.js, 1 line — not auto-applied)
```js
app.use('/api/localization', require('./routes/localizationRoutes'));
// On inbound: require('./lib/localization').observe({ tenantId, contactId, text });
// Before send: const { text } = await require('./lib/localization').localize({ tenantId, contactId, text });
```

## Cross-dept (optional)
- **llmHub**: routes translation through local Ollama (qwen2.5) by default.
- **Templates #36 / Drip #6 / Scheduler #17**: localize message bodies before drafting.

## Verify
```
npm run localization:check
npm run localization:smoke
```
