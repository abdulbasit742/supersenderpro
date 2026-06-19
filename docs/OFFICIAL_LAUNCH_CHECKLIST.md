# SuperSender Pro Official Launch Checklist

Use this checklist before announcing or selling the platform.

## 1. Local Runtime

- Start the app: `node server.js`
- Confirm dashboard: `http://localhost:3001`
- Confirm health: `http://localhost:3001/api/health`
- Run launch gate: `node scripts/launch-readiness.js`
- Run public/domain gate: `node scripts/public-launch-check.js`
- Browser launch status: `http://localhost:3001/launch-status`

## 2. WhatsApp

- Connect the customer bot QR.
- Connect the channel publisher QR only if the linked number owns/admins the target channels.
- Confirm `/wa-qr` and `/wa-channel-qr` show connected status.
- Send a test message from a non-admin number and verify menu replies.
- Send an admin command from admin number and verify the command is accepted.

## 3. Official WhatsApp Cloud API

This stage is intentionally deferred until Meta payment/API access is ready. It is not a blocker for the Baileys/QR beta launch as long as `WHATSAPP_CLOUD_API_ENABLED=false`.

Fill these only when Meta credentials are ready:

- `WHATSAPP_CLOUD_API_ENABLED=true`
- `WHATSAPP_CLOUD_PHONE_NUMBER_ID=`
- `WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID=`
- `WHATSAPP_CLOUD_ACCESS_TOKEN=`
- `WHATSAPP_CLOUD_VERIFY_TOKEN=`
- `WHATSAPP_CLOUD_WEBHOOK_SECRET=`

Keep `WHATSAPP_CLOUD_DRY_RUN=true` until one template send is verified.

## 3A. Public Tunnel / Domain

- Cloudflare Tunnel hostname should point to `http://localhost:3001`.
- Preferred public URL: `https://app.pakentrepreneur.me`.
- Set `PUBLIC_BASE_URL=https://app.pakentrepreneur.me` in `.env` after the route is live.
- Verify local route: `http://localhost:3001/api/launch/status`.
- Verify public route: `https://app.pakentrepreneur.me/api/launch/status`.
- If public URL fails but local health works, the issue is tunnel/DNS/routing, not the app backend.

## 4. MCP / AI Connectors

Claude/Cursor MCP:

- Use `mcp/supersender-mcp.js`.
- Public Claude Web connector URL: `https://app.pakentrepreneur.me/mcp`.

ChatGPT Custom GPT:

- Enable with `GPT_CONNECTOR_ENABLED=true`.
- Set `GPT_CONNECTOR_API_KEY` to a strong secret.
- Import schema from `https://your-domain/openapi.json`.
- Keep `GPT_CONNECTOR_ALLOW_DIRECT_ACTIONS=false` for normal operations.

## 5. Public Git Safety

Before every push:

- Do not push `.env`, auth sessions, runtime JSON, uploads, logs, or encrypted private backups.
- Run a staged diff secret scan.
- Run `git status --short` and confirm only safe source/docs/config files are staged.

## 6. Launch Blockers

The system is not ready for public customer launch until:

- WhatsApp customer bot session is stable.
- Payment/order flow is tested end to end with one real or sandbox order.
- Channel automation has one successful target channel test.
- Official Cloud API credentials are either configured or explicitly deferred.
- Backup/restore process is tested locally.
