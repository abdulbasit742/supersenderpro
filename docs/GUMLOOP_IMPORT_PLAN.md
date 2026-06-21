  # Gumloop Import Plan


  How this ClickUp workspace's safe files get into the GitHub repo, **later**, via
  Gumloop. ClickUp/Claude never commits or pushes. Only Gumloop pushes.


  ## What this layer adds
  A handoff/manifest/merge-plan layer under `lib/gumloopHandoff/`. It does NOT
  rebuild local demo, mock gateway, guided demo, local runtime, or local export.

  ## Safe-to-copy (high level)
  `server.js`, `package.json`, `package-lock.json` (only if intentionally changed),
  `.env.example`, `.gitignore`, `README.md`, and everything under `lib/`, `routes/`,
  `public/`, `docs/`, `scripts/`, `tests/`, `demo/` (safe sample data), plus
  `artifacts/*.md` and redacted `artifacts/*.json` reports.


  ## Never copy
  `.env`, `.env.*`, `node_modules/`, `logs/`, `uploads/`, `data/`, `sessions/`,
  `.wa-auth/`, `.baileys-auth/`, `baileys_auth*/`, `browser-cache/`,
  `private-backups/`, `exports/`, `*.zip`, `*.pem`, `*.key`, anything matching
  `*token*` / `*secret*`, and raw/private artifacts.

  ## Route mounts required
  `/api/gumloop-handoff` → `routes/gumloopHandoffRoutes.js` (append-only hook in
  `server.js`). Plus the existing mounts: local-export, local-demo, mock-gateway,
  guided-demo, local-runtime.

  ## Dashboard links required
  A single nav link to `/gumloop-handoff.html` in `public/index.html`.

  ## Package scripts required
  `gumloop-handoff:check`, `gumloop-handoff:smoke` (added only because their target
  files exist).

  ## Validation before push
  `node --check` on the listed files, then `npm run gumloop-handoff:check` and
  `npm run gumloop-handoff:smoke`. Optionally the sibling `*:check` scripts.

  ## Safety defaults that must remain

  `DRY_RUN=true`, live WhatsApp/email/payments/webhooks disabled, tenant/auth
  writes disabled, PII + secrets redacted, no external/GitHub calls.
