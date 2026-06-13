# WA Sales Bot

Separate Baileys-based WhatsApp sales automation bot for the AI tools reseller workflow.

## What it does

- Monitors dealer groups and saves parsed rates into SQLite
- Handles customer menu, pricing, availability, ordering, payment proof, and delivery flow
- Supports `Private`, `Warranty`, and `Non-Warranty` account types
- Shows policy warnings before order confirmation, with double confirmation for non-warranty purchases
- Tracks issue history and warranty resolution limits
- Uses `utils/warrantyChecker.js` for max 1 replacement and max 2 issue resolutions on warranty orders
- Uses a local task-oriented AI agent for intent classification, knowledge-base replies, and admin escalation
- Runs dealer trust voting from selling groups: 3 `TRUSTED YES` votes create a `D-001` style trusted dealer code
- Tracks lowest, average, and highest dealer prices for price intelligence
- Supports admin commands like `!approve`, `!stock`, `!addkey`, `!issue`, `!resolve`, `!broadcast`, and `!stats`
- Runs scheduled broadcasts, low-stock alerts, renewal reminders, and after-sale follow-ups
- Supports multiple WhatsApp sessions with `SESSION_NAMES=main,backup`

## Run

```powershell
cd "C:\Users\bsphy2304\Documents\New project\supersender-pro-final\wa-sales-bot"
npm install
npm start
```

Or from the project root:

```powershell
cd "C:\Users\bsphy2304\Documents\New project\supersender-pro-final"
npm run wa-sales-bot
```

## Important

- Set real group IDs in `.env`
- Scan QR for each configured session
- `better-sqlite3` must be installed in this bot folder before first run
- This bot is isolated from the existing 4 bots, so current flows stay unchanged
- For plan-based stock commands, use formats like:
  - `!stock chatgpt plus private 3`
  - `!addstock chatgpt plus private D-001 5`
  - `!addkey chatgpt plus warranty D-001`
  - `!pricing chatgpt plus private 999`
