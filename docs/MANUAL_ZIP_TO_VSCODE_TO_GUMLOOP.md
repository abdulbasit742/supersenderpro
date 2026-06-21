  # Manual ZIP → VS Code → Gumloop

  The manual path when you copy files out of ClickUp yourself.


  ## For you (ABDUL)
  1. Copy the safe files from this workspace (use the safe-to-copy manifest). Use
     only relative paths; never paste absolute local paths (`D:\`, `C:\`,
     `/Users`, `/home`) into config.
  2. Do NOT copy `.env`, `data/`, `logs/`, `uploads/`, `sessions/`, auth folders,
     `node_modules/`, or anything matching `*secret*`/`*token*`/`*.key`/`*.pem`.
  3. Open the folder in VS Code.
  4. Inspect the diff before handing to Gumloop: confirm only marked hook blocks
     were added to `server.js` / `index.html` / `package.json` / `.env.example` /
     `.gitignore`.
  5. `npm install`, then `npm run gumloop-handoff:check` and `:smoke`. Confirm
     0 blockers and 0 secret findings.


  ## For Gumloop later
  `git checkout main` → `git pull origin main` → import safe files → check route
  mounts + dashboard links → `node --check` → run check/smoke scripts → stage safe
  files → commit → `git pull --rebase origin main` → push. If blocked, open a PR.
  No force push.


  ## Safe to ZIP/copy
  `lib/`, `routes/`, `public/`, `scripts/`, `tests/`, `docs/`, `demo/`,
  `.env.example`, plus `artifacts/*.md` and redacted report JSON.

  ## Never ZIP/copy
  The entire never-copy list above (especially `.env` + session/auth folders +
  `data/`).

artifacts/ + docs/GUMLOOP_HANDOFF_GAP_REPORT.md —
inventory, gap report, merge-risk, route/dashboard/script
maps, copy-safety

Static seed copies of the artifacts (the check script regenerates the live JSON). Each at its FILE marker.
