# SuperSender Pro - GitHub/Lovable Clean Export

This folder is safe to upload to GitHub/Lovable.

Excluded intentionally:
- node_modules
- .git history
- real .env
- tokens/secrets/credentials
- WhatsApp auth/session/cache folders
- logs/backups/uploads
- node-local.exe
- cloudflared.exe/tools

Install locally:
```bash
npm install
cp .env.example .env
npm start
```

Lovable usage:
- Import this repo for frontend/reference.
- Keep WhatsApp backend running separately on Render/Railway/VPS/local PC + tunnel.
- Set VITE_API_URL or NEXT_PUBLIC_API_URL to your backend URL.
