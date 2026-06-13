# WhatsApp AI Tools Reseller Bot

Complete Baileys multi-device WhatsApp bot for an AI subscriptions reseller business.

## Features

- Rate collector from dealer groups.
- Urdu/English mixed rate parser.
- Customer auto-replies for `price`, `stock`, `order chatgpt`, `hi`, `help`.
- Admin commands from approved admin numbers only.
- Daily 9 AM rate snapshot, 10 AM price broadcast, 6 PM sales summary.
- SQLite database using `better-sqlite3`.
- Multi-device session persistence with QR scan.
- Multi-number ready using `SESSION_NAMES=main,backup1,backup2`.

## Files

```text
whatsapp-ai-tools-bot/
├── package.json
├── .env.example
├── data/
├── sessions/
└── src/
    ├── index.js
    ├── config.js
    ├── db.js
    ├── parser.js
    ├── formatters.js
    ├── handlers.js
    ├── sessionManager.js
    └── cronJobs.js
```

## Install

```powershell
cd "C:\Users\bsphy2304\Documents\New project\supersender-pro-final\whatsapp-ai-tools-bot"
npm install
copy .env.example .env
```

Edit `.env`:

```env
ADMIN_NUMBERS=923181781454
DEALER_GROUPS=120363xxxx@g.us
CUSTOMER_GROUPS=120363yyyy@g.us
SESSION_NAMES=main,backup1
```

Then run:

```powershell
npm start
```

Scan the QR code printed in the terminal.

## How to Get Group IDs

1. Add the bot number to your groups.
2. Start the bot once.
3. The bot auto-syncs group settings into SQLite.
4. You can also put known group IDs in `.env`.

Recommended setup:

- Dealer groups: `DEALER_GROUPS`
- Customer groups: `CUSTOMER_GROUPS`

## Dealer Rate Formats Supported

```text
ChatGPT Plus 1850
claude: 1700
mid basic = 1200
Gemini Advanced 2.5k
Cursor pro - 2100
```

Test parser without WhatsApp:

```powershell
npm run test:parser
```

## Customer Commands

```text
hi / hello / salam / menu
price / rates
stock
order chatgpt
help
```

## Admin Commands

Only numbers listed in `ADMIN_NUMBERS` can use these:

```text
!rates
!profit chatgpt 1850 2500
!stock ChatGPT 10
!broadcast Daily rates updated. Reply price.
!scam 923001234567 payment issue
!top
```

## Database Tables

- `dealers`
- `rates`
- `customers`
- `orders`
- `stock`
- `scammers`
- `group_settings`

Database file:

```text
data/bot.sqlite
```

## Notes

- Use broadcasts only for your own opted-in customer groups.
- Default broadcast delay is 3 seconds between groups to avoid accidental rapid-fire sending.
- If WhatsApp logs out, delete the relevant folder inside `sessions/` and scan again.
