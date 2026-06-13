# SuperSender Pro Live Server Guide

## Current local URLs

- Dashboard/backend: `http://localhost:3001`
- WhatsApp QR: `http://localhost:3001/wa-qr`
- Health check: `http://localhost:3001/api/health`

## One-command live start

Run this from the project folder:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\go-live.ps1
```

The script starts:

1. Local SuperSender server on port `3001`
2. Cloudflare named tunnel for `https://app.pakentrepreneur.me`
3. A status report at `live-status.json`

## If `app.pakentrepreneur.me` shows Cloudflare Error 530

The app is running locally, but Cloudflare cannot connect to this PC. In the latest checks, the local app was healthy but Cloudflare failed with DNS/proxy errors while resolving `argotunnel.com`.

Fix options:

1. Switch this PC to mobile hotspot, then rerun `scripts\go-live.ps1`.
2. If you must use LAN proxy, make sure the proxy allows Cloudflare Tunnel traffic.
3. Set Windows DNS to `1.1.1.1` and `8.8.8.8`, then rerun the script.
4. Keep the PC awake. The public URL only works while the PC and tunnel are running.

## Important logs

- Local server output: `server-live.out`
- Local server errors: `server-live.err`
- Cloudflare tunnel output: `cloudflared.out.log`
- Cloudflare tunnel errors: `cloudflared.err.log`
- DNS helper errors: `cloudflared-dns.err.log`
- Latest status report: `live-status.json`

## Quick manual checks

```powershell
Invoke-WebRequest http://localhost:3001/api/health -UseBasicParsing
Invoke-WebRequest https://app.pakentrepreneur.me/api/health -UseBasicParsing
```

If the first command works and the second gives `530`, the project is not broken. The Cloudflare tunnel is blocked or not connected.
