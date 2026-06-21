  # Gumloop Push-Later Runbook

  For Gumloop, when it is time to push to GitHub. ClickUp produced the files; it did
  NOT commit or push.

  ## Steps (in order)
  1. `git checkout main`
  2. `git pull origin main`
  3. Import safe files only (see the safe-to-copy manifest).
  4. Never copy `.env` / `data/` / `logs/` / `uploads/` / `sessions/` / `node_modules/`.
  5. Verify route mounts (`BEGIN/END GUMLOOP HANDOFF HOOK` in `server.js`).
  6. Verify the `/gumloop-handoff.html` dashboard link.
  7. `node --check` on every changed `.js` file.
  8. `npm install` then `npm run gumloop-handoff:check` and `:smoke`.
  9. Stage only safe files (`git add` explicit paths, never `git add -A` blindly).
  10. Commit with a clear message.
  11. `git pull --rebase origin main`.
  12. `git push origin main`.
  13. If the push is blocked (protected branch), open a PR.
  14. Never force-push.


  ## Hard rules
  No force push. No committing `.env`/runtime data. No disabling the dry-run /
  redaction defaults. If `gumloop-handoff:check` reports a blocker or any secret
  finding, stop and fix before pushing.
