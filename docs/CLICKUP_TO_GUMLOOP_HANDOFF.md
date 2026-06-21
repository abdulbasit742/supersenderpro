  # ClickUp → Gumloop Handoff


  The boundary between the three separate environments.


  ## Three separate places
  - **ClickUp/Claude workspace** — where files are authored. Never pushes.
  - **Manus workspace** — separate; its changes are NOT assumed here.
  - **Gumloop / GitHub repo** — the only place that pushes to `main`, later.


  ## What ClickUp guarantees
  Writes/modifies files in this workspace only. No commit, push, rebase, reset,
  checkout, or GitHub call. Append-only hooks for shared files.


  ## What Gumloop must do
  Pull `main` first, merge the handoff safely (append-only hooks, no overwrite),
  run checks, then commit + push. Follow `GUMLOOP_PUSH_LATER_RUNBOOK.md`.

  ## Conflict expectations
  `server.js`, `public/index.html`, `package.json`, `package-lock.json`,

  `.env.example`, `.gitignore`, `README.md` may conflict. See
  `artifacts/gumloop_merge_risk_report.md` for the per-file safe patch action.
