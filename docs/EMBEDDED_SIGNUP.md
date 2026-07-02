# WhatsApp Embedded Signup (Tech Provider onboarding)

Meta's official OAuth onboarding flow (v4). Lets each tenant connect **their own** WhatsApp
Business number from inside SuperSender via a "Connect WhatsApp" button - the core of being a
WhatsApp Tech Provider.

> **Simulation-safe by default.** With `EMBEDDED_SIGNUP_LIVE` unset/false (or missing Meta creds),
> the token exchange + webhook subscribe are **stubbed** - no Meta API calls. You can wire and
> test the entire flow now, then flip one flag once Tech Provider App Review is approved.

## How the flow works

1. Frontend loads the Facebook JS SDK and shows a **Connect WhatsApp** button.
2. `FB.login(..., { config_id, response_type: 'code' })` launches Embedded Signup; the user
   picks/creates their WABA + number and grants access. The launcher returns a short-lived `code`.
3. Browser POSTs that `code` to `POST /api/embedded-signup/callback`.
4. Backend exchanges the code for a business token, reads the connected WABA + phone number,
   stores the connection (token server-side only), and subscribes our app to its webhooks.

Get the ready-made client snippet from `GET /api/embedded-signup/snippet`.

## Wire it up

```bash
node scripts/wire-embedded-signup.js     # mounts /api/embedded-signup (idempotent)
node scripts/embedded-signup-check.js    # smoke test in simulation (exit 0 = pass)
```

`scripts/wire-all.js` also runs the wire step.

## API (`/api/embedded-signup`)

- `GET  /config` - PUBLIC launcher values (appId, configId, graph version). **No secrets.**
- `GET  /snippet` - copy-paste frontend launcher snippet
- `GET  /status` · `GET /doctor`
- `POST /callback` - finish onboarding from the launcher `code`
- `GET  /connections` · `GET /connections/:id` · `DELETE /connections/:id` (tokens always redacted)

Write endpoints require `x-admin-secret` matching `EMBEDDED_SIGNUP_ADMIN_SECRET` (or `ADMIN_TOKEN`) when set.

## Going live (after Tech Provider App Review)

Set these env vars and restart:

| var | meaning |
|-----|---------|
| `EMBEDDED_SIGNUP_LIVE` | `true` to make real Meta calls |
| `META_APP_ID` | your Meta app id (public) |
| `META_APP_SECRET` | your Meta app secret (**server-only, never exposed**) |
| `META_ES_CONFIG_ID` | your Embedded Signup configuration id |
| `META_GRAPH_VERSION` | optional, defaults to `v21.0` |

Until all of `META_APP_ID` + `META_APP_SECRET` + `META_ES_CONFIG_ID` are present **and**
`EMBEDDED_SIGNUP_LIVE=true`, the module stays in simulation mode (safe).

## Security notes

- Access tokens are stored under `data/embedded_signup/*` **server-side only** and are **never**
  returned by the API (`redactConnection` strips them, leaving only a short fingerprint).
- `/config` exposes only public launcher values; the app secret never leaves the server.
- Embedded Signup **v2 is deprecated Oct 15, 2026** - this scaffold targets the v4 (`code`) flow.
