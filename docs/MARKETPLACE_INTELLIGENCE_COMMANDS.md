# Marketplace Intelligence — WhatsApp Admin Commands

These run through the **existing** admin command dispatcher
(`handleWhatsAppSocialAdminCommand` in `server.js`). Admin-number only. Replies are
Urdu/English mixed and concise. Parser: `lib/marketplaceIntelligence/adminCommands.js`.

| Command | Action |
|---|---|
| `!marketstatus` | Sellers/buyers/SKUs, today's offers & requests, risk, opportunities |
| `!topsellers` | Top 5 sellers by trust |
| `!topbuyers` | Top 5 buyers by conversion score |
| `!sku [keyword]` | Find SKUs/products |
| `!price [sku]` | Latest/min/avg/max price for a SKU |
| `!stock [sku]` | Latest stock signal |
| `!demand [product]` | Buyer demand for a product |
| `!opportunities` | Detected opportunities |
| `!seller [sellerId]` | Seller profile (masked) |
| `!buyer [buyerId]` | Buyer profile (masked) |
| `!marketdigest` | Daily market digest |
| `!riskposts` | High-risk posts/alerts |

## Integration point
The server gates commands via the `isWhatsAppSocialCommand` regex (extended with the
tokens above) and then routes recognised commands to `adminCommands.handle()`:

```js
const miCommands = require('./lib/marketplaceIntelligence/adminCommands');
if (miCommands.isCommand(text)) { await reply(miCommands.handle(command, args.slice(1))); return true; }
```

If you run a different admin bot, call `adminCommands.isCommand(text)` /
`adminCommands.handle(cmd, args)` from your own handler — the module is standalone.

All commands are **read-only**; none send messages, post, or mutate data.
