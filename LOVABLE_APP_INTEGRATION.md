# Lovable App Integration

This folder keeps the Lovable-built dashboard as a safe standalone app inside SuperSender Pro.

## Location

- Lovable source: `lovable-app/`
- Main local backend: `server.js`
- Existing lightweight frontend: `frontend/`

The Lovable app is intentionally kept separate so it can evolve without breaking the current WhatsApp bot, channel publisher, and Node dashboard.

## What Was Imported

The ZIP `super-sender-suite-main.zip` was extracted and copied into `lovable-app/`.

Copied:

- TanStack/Vite app source
- shadcn-style UI components
- routes for composer, social, connections, publisher, channels, analytics, inbox, settings, plans, orders, and more
- Supabase migrations
- package files and build config

Skipped:

- `.env`
- runtime logs
- build outputs
- `node_modules`

## Run Locally

From the project root:

```powershell
npm run lovable:dev
```

Or directly:

```powershell
cd lovable-app
npm install
npm run dev
```

## Build

```powershell
npm run lovable:build
```

## Environment

Copy `lovable-app/.env.example` to `lovable-app/.env` locally and fill:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PROJECT_ID=
```

Do not commit real keys.

## Merge Strategy

Use the Lovable app for:

- social composer UI
- connections page
- scheduled posts
- publisher dashboards
- Supabase-backed hosted app

Keep the existing Node app for:

- WhatsApp/Baileys runtime
- channel publisher sessions
- local automation workers
- server-side API bridge
- private auth/session data

Future integration should happen through APIs, not by overwriting `server.js`.
