# Interactive Message Templates (WhatsApp buttons / list / CTA)

Real, spec-validated WhatsApp Cloud API interactive messages. Replaces the simulation-grade
stub in `lib/competitorParity.js` with a proper tenant-scoped module: build, validate, store,
and render reply-button, list-menu, and CTA-URL messages.

> **Safe by default.** `INTERACTIVE_TEMPLATES_DRY_RUN=true` (default) means `/send` builds the
> payload but does **not** send. `/preview` always forces dry-run.

## Wire it up

```bash
node scripts/wire-interactive-templates.js    # mounts /api/interactive-templates (idempotent)
node scripts/interactive-templates-check.js   # smoke test (exit 0 = pass)
```

`scripts/wire-all.js` also runs the wire step.

## Template types

| type | renders | key fields |
|------|---------|-----------|
| `buttons` | up to 3 reply buttons | `bodyText`, `buttons:[{id,title}]`, optional `headerText`/`footerText` |
| `list` | tappable list menu | `bodyText`, `listButtonText`, `sections:[{title,rows:[{id,title,description}]}]` |
| `cta_url` | call-to-action URL button | `bodyText`, `cta:{displayText,url}` |

All text fields support `{{var}}` interpolation (e.g. `{{name}}`) and are auto-clipped to
WhatsApp's spec limits (3 buttons, 20-char button titles, 10 rows, 24-char row titles, etc).

## API (`/api/interactive-templates`)

- `GET  /status` · `GET /doctor` · `GET /limits` · `GET /examples`
- `GET  /templates` · `POST /templates` · `GET/PUT/DELETE /templates/:id`
- `POST /validate` - check a template against spec limits
- `POST /preview` - build a payload from an ad-hoc template (no store, no send)
- `POST /templates/:id/send` - render + (optionally) send; respects dry-run

Writes require `x-admin-secret` matching `INTERACTIVE_TEMPLATES_ADMIN_SECRET` (or `ADMIN_TOKEN`) when set.

## Env

| var | default | meaning |
|-----|---------|---------|
| `INTERACTIVE_TEMPLATES_ENABLED` | `true` | master switch |
| `INTERACTIVE_TEMPLATES_DRY_RUN` | `true` | build payloads without sending |
| `INTERACTIVE_TEMPLATES_REQUIRE_ADMIN` | `true` | guard write endpoints |

Live sending uses the repo's `global.sendWhatsApp(phone, payload, opts)` when `DRY_RUN=false`.
