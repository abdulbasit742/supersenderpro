# Incident Command Safety


## Guarantees
- Read-only aggregation. Adapters never mutate module data and never call external APIs.
- No destructive auto-fix. Fixes are dry-run suggestions; `dryRunAutoFix.executed` is always false.
- No live sends. Alerts are drafts/previews only by default.
- Secret + PII masking via safetyGuard.redact on every outbound payload and stored record.
- ack/resolve/snooze mutate the incident JSON store ONLY.

## Env flags
`INCIDENT_COMMAND_ENABLED`, `INCIDENT_COMMAND_DRY_RUN` (true), `INCIDENT_COMMAND_ALLOW_LIVE_ALERTS` (false),
`INCIDENT_COMMAND_ALLOW_AUTOFIX` (false), `INCIDENT_COMMAND_STRICT` (false).

## Do not commit
`data/incident-command*.json`, `artifacts/incident_command_*`.

HOOKS — server.js / public/index.html / .env.example /
package.json (append-only)

EXISTING-FILE HOOKS (append-only, clearly marked). Run git status --short --branch first and confirm none of
these files have staged changes you'd overwrite. Add only the marked blocks. No commit / push / reset / rebase
/ checkout.



1) server.js — route mount
Add near your other app.use('/api/...') mounts. Keep the markers.


  // BEGIN INCIDENT COMMAND HOOK
  try {
    const incidentCommandRoutes = require('./routes/incidentCommandRoutes');
    app.use('/api/incident-command', incidentCommandRoutes);
    app.get('/incident-command', (req, res) => res.sendFile(require('path').join(__dirname, 'public', 'incident-
  command.html')));
    console.log('[incident-command] mounted at /api/incident-command (dry-run)');
  } catch (e) {
    console.error('[incident-command] mount skipped:', e && e.message);
  }
  // END INCIDENT COMMAND HOOK




2) public/index.html — nav link
Add inside your existing nav/sidebar. Keep the markers.


  <!-- BEGIN INCIDENT COMMAND HOOK -->
  <a href="/incident-command" class="nav-link" title="Incident Command (dry-run)">Incident Command <span style="font-
  size:11px;color:#f0883e">MONITOR</span></a>
  <!-- END INCIDENT COMMAND HOOK -->




3) .env.example — placeholders only (never real secrets)
Append this block. Add each line only if not already present.


  # BEGIN INCIDENT COMMAND HOOK
  INCIDENT_COMMAND_ENABLED=true
  INCIDENT_COMMAND_DRY_RUN=true
  INCIDENT_COMMAND_STORE_PATH=data/incident-command.json
  INCIDENT_COMMAND_HISTORY_PATH=data/incident-command-history.json
  INCIDENT_COMMAND_ALERTS_PATH=data/incident-command-alerts.json
  INCIDENT_COMMAND_ALLOW_LIVE_ALERTS=false
  INCIDENT_COMMAND_ALLOW_AUTOFIX=false
  INCIDENT_COMMAND_MAX_HISTORY=1000

  INCIDENT_COMMAND_STRICT=false
  # END INCIDENT COMMAND HOOK




4) package.json — scripts (add only, remove nothing)
Add these two entries to the existing "scripts" object:


  "incident-command:check": "node scripts/incident-command-check.js",
  "incident-command:smoke": "node tests/smoke/incidentCommandSmoke.js"




5) .gitignore — recommended (append-only)
  # Incident Command local runtime data + reports
  data/incident-command.json
  data/incident-command-history.json
  data/incident-command-alerts.json
  data/incident-command.smoke.json
  data/incident-command-history.smoke.json
  data/incident-command-alerts.smoke.json
