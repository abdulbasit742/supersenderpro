# Notification Dispatcher

One unified `send(channel, to, message, opts)` so subsystems (admin alerts, billing dunning, password reset, deal follow-ups) don't each reinvent delivery.

## Channels
| Channel | Configured when | Notes |
|---|---|---|
| `whatsapp` | `global.sendWhatsApp` exists | uses the app's existing WA sender |
| `email` | `SMTP_HOST` + `SMTP_USER` set | SMTP send is a stub until `nodemailer` is added; reports 'prepared' |
| `webhook` | always (uses signed delivery #298) | HMAC-signed POST to a URL |

## Use
```js
const notify = require('../lib/notify');
await notify.send('whatsapp', '92300xxxxxxx', 'Your invoice is ready');
await notify.send('email', 'user@x.com', 'Reset your password', { subject: 'Password reset' });
await notify.broadcast(['whatsapp', 'webhook'], target, 'Subscription past due', { secret });
```

## Safe by default
`NOTIFY_DRY_RUN=true` (default) prepares messages without sending; providers also self-report when unconfigured. `send()` never throws - it returns `{ ok, dryRun?, prepared?, error? }`.

## Extend
`notify.register('slack', { detect(){...}, async send(to,msg,opts){...} })` to add a channel.

## Env
```
NOTIFY_DRY_RUN=true
SMTP_HOST= SMTP_USER= SMTP_PASS=    # enable email (with nodemailer)
```

## Verify
```bash
node tests/smoke/notifySmoke.js
```
