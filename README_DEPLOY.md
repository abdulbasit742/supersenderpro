# SuperSender Pro - AI Business Command Center

## Local run

1. Install Node.js 18 or newer.
2. Run `npm install`.
3. Run `npm start`.
4. Open `http://127.0.0.1:3001/`.
5. Click `Connect` and scan the QR from WhatsApp mobile: Settings -> Linked Devices -> Link a Device.

## WhatsApp linking notes

- Default engine is `WA_ENGINE=wwebjs`, which uses Chrome and works better on networks that block Baileys websocket DNS.
- Returning users auto-reconnect if `.wa-auth/session-default` exists.
- Baileys is still available with `WA_ENGINE=baileys` when direct `web.whatsapp.com` websocket access is allowed.
- `Connect` cleans stale Chromium lock files before launching the browser engine.
- `Fresh QR` resets the WhatsApp session and generates a new QR.
- `Disconnect` closes the active WhatsApp socket/browser and removes stale lock files.

## Optional environment

Copy `.env.example` to `.env` and set:

```env
PORT=3001
WA_ENGINE=wwebjs
CHROME_PATH=
WA_WEB_CACHE_PATH=.wwebjs_cache
SESSION_SECRET=change_this
```

On Docker/Linux, Chromium is installed in the container and `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` is set automatically.

## Verification

Run:

```bash
npm run smoke
```

The smoke test checks the health endpoint, WhatsApp status endpoint, QR endpoint, and core app shell.
