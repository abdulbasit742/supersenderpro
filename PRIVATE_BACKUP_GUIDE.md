# Private Full Backup Guide

GitHub should contain source code, public assets, examples, and setup scripts.

The following files are intentionally not committed raw because they can expose accounts, customers, sessions, or tokens:

- `.env`
- `.cloudflare-tunnel-token`
- `.wa-auth`
- `.baileys-auth`
- WhatsApp sessions
- runtime `data/*.json`, `data/*.csv`, `data/*.md`
- customer/order logs
- uploads
- `node_modules`
- `node-local.exe`
- browser cache and logs

## Create a private everything backup

Run this on your own Windows machine:

```powershell
cd D:\SuperSenderPro\supersender-pro-final
powershell -ExecutionPolicy Bypass -File .\scripts\create-private-full-backup.ps1
```

The backup will be created under:

```text
D:\SuperSenderPro\private-backups
```

This archive includes live private files such as `.env`, `.git`, WhatsApp auth/session, runtime data, uploads, `node_modules`, and local tools when they exist.

## Create split parts under 95 MB

Use this when you need to store the backup in a place with upload size limits:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\create-private-full-backup.ps1 -Split -SplitMB 95
```

The script also writes a `JOIN_PARTS.ps1` file in the parts folder.

## Restore

1. Extract the private backup zip.
2. If `node_modules` is missing or broken, run:

```powershell
npm install
```

3. Start the server:

```powershell
.\node-local.exe server.js
```

or:

```powershell
npm start
```

## Important

Do not upload the private backup zip to a public GitHub repository, Lovable import, public hosting, or any shared link.

If a real API key or WhatsApp session ever gets committed to a public repo, rotate the key and re-link WhatsApp.
