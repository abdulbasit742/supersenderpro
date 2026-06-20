# Security Gateway Admin Commands

`lib/securityGateway/adminCommands.js` exposes safe command handlers (concise Urdu/English mixed). Wire them into the existing admin command system — do **not** create a duplicate bot.

| Command | Description |
|---|---|
| `!security` | Gateway status (on/off, dry-run, policy count) |
| `!securityrisk` | Security score + blockers |
| `!ratelimits` | Current rate limit defaults |
| `!abuse` | Recent (redacted) abuse signal count |
| `!securityevent [id]` | One redacted event summary |
| `!securitydoctor` | Doctor score + next step |

Replies never contain raw IP, full PII, or secrets.

```js
const { handle } = require('./lib/securityGateway/adminCommands');
const reply = handle('!security');
```
