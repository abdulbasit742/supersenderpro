  # Gumloop Merge Risk Report


  | File | Risk | Recommended action | Safe patch notes |
  | --- | --- | --- | --- |
  | server.js | high | append hook only | Keep BEGIN/END GUMLOOP HANDOFF HOOK; don't overwrite existing app.use; node --
  check after merge. |
  | public/index.html | high | verify dashboard link | Add one nav link inside existing nav; preserve remote markup. |
  | package.json | medium | do not overwrite | Merge only the two gumloop-handoff:* lines; keep existing scripts. |
  | package-lock.json | medium | preserve existing remote changes | Prefer remote lockfile; re-run npm install. |
  | .env.example | low | append hook only | Add GUMLOOP_HANDOFF_* keys if missing; no real secrets. |
  | .gitignore | low | append hook only | Union of ignore entries; never remove existing. |
  | README.md | low | manual review required | Merge section additions; resolve prose by hand. |
