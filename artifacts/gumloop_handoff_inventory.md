  # Gumloop Handoff Inventory

  Scan of THIS ClickUp workspace only (no Manus/Gumloop assumptions).

  | Path | Status |
  | --- | --- |
  | server.js | exists, safe_to_copy, route_mount_needed, conflict_risk |
  | package.json | exists, safe_to_copy, package_script_needed, conflict_risk |
  | package-lock.json | partial, safe_to_copy (only if intentionally changed), conflict_risk |
  | .env.example | exists, safe_to_copy, env_placeholder_needed |
  | .gitignore | exists, safe_to_copy, gitignore_protection_needed, safe_fix_recommended |
  | README.md | partial, safe_to_copy, conflict_risk |
  | lib/ routes/ public/ docs/ scripts/ tests/ | exists, safe_to_copy |
  | lib/gumloopHandoff/ + routes/gumloopHandoffRoutes.js + public/gumloop-handoff.* | missing -> built |
  | public/index.html | exists, safe_to_copy, dashboard_link_needed, conflict_risk |
  | demo/ | exists, safe_to_copy (synthetic) |
  | artifacts/ | partial: *.md safe; *.json safe only if redacted |
  | .env | MUST NOT COPY (secret_risk) |
  | data/ logs/ uploads/ | MUST NOT COPY (runtime_data_risk) |
  | node_modules/ | MUST NOT COPY (reinstall) |
  | sessions/ .wa-auth/ .baileys-auth/ baileys_auth*/ | MUST NOT COPY (secret_risk, live_action_risk) |
  | private-backups/ exports/ | MUST NOT COPY |
