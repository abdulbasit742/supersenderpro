# Automation: No-Code Chatbot, Auto-Replies &amp; Quick Replies

WATI-style automation pack. Adds a **no-code keyword chatbot / auto-reply engine**
(with office-hours rules and a default fallback) plus **quick replies** (canned
responses). Integrates with the existing templates + spintax engine. File-based,
**no new runtime dependencies**.

## Why (WATI parity)

WATI's core automation features are: no-code chatbots, keyword auto-replies,
office-hours rules, and quick replies. This pack brings those to SuperSender Pro
on top of the campaigns, contacts, and templates already shipped.

## Files added

| File | Purpose |
|------|---------|
| `lib/quickReplyStore.js` | Canned responses keyed by shortcut (e.g. `/price`) |
| `lib/chatbotStore.js` | Bot settings + keyword rules persistence |
| `lib/chatbotEngine.js` | Pure, testable evaluation: office-hours → rules → default |
| `routes/chatbot.js` | REST API for settings, rules, quick replies, simulate + incoming webhook |
| `public/automation.html` | Dashboard: rules, settings, quick replies, live simulate |
| `scripts/test-automation.js` | Offline smoke test (17 assertions) |

## How the engine decides a reply

1. If the bot is **disabled** → no reply.
2. If **office hours** are enforced and it's outside them → returns the
   `outsideMessage`.
3. Otherwise the **first matching rule** (lowest `priority` number wins) is
   rendered — as plain text, a **template** (`templateId`), or a **quick reply**
   (`quickReplyId`), with `{{vars}}` + `{a|b}` spintax applied.
4. If nothing matches → the configured **default reply** (if any).

Match types: `contains`, `equals`, `starts`, `regex` (case-insensitive by default).

## REST API

### Chatbot
| Method | Path | Description |
|--------|------|-------------|
| GET/PUT | `/api/chatbot/settings` | Get / update enabled, default reply, office hours |
| GET/POST | `/api/chatbot/rules` | List / create keyword rules |
| GET/PUT/DELETE | `/api/chatbot/rules/:id` | Manage a rule |
| POST | `/api/chatbot/simulate` | `{ text }` → computed reply (no send) |
| POST | `/api/chatbot/incoming` | Webhook: `{ from, text, name }` → reply (auto-sends if wired) |

### Quick replies
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/quick-replies` | List / create (`shortcut`, `title`, `body`) |
| GET | `/api/quick-replies/by-shortcut/:sc` | Lookup by shortcut |
| PUT/DELETE | `/api/quick-replies/:id` | Update / delete |

### Create-rule example

```json
POST /api/chatbot/rules
{
  "name": "Greeting",
  "priority": 10,
  "match": { "type": "contains", "keywords": ["hi", "hello", "salam"] },
  "response": { "type": "template", "templateId": "tpl_ab12cd34" }
}
```

## Wiring into `server.js`

```js
const { mountChatbot } = require('./routes/chatbot');
mountChatbot(app, {
  // Auto-send the bot's reply on inbound messages (optional).
  sendMessage: async (to, message) => { /* live WA send */ },
});
```

Point your existing WhatsApp inbound handler at `POST /api/chatbot/incoming`
(or call `require('./lib/chatbotEngine').evaluate(text)` directly) to get an
auto-reply. Dashboard: `/automation.html`.

## Testing

```bash
node scripts/test-automation.js   # 17 assertions, fully offline
```
