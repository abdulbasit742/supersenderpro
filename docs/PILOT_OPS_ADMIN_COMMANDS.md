  # Pilot Ops Admin Commands

  Wire into your EXISTING WhatsApp admin command router (do NOT create a new bot):

const pilot = require('./lib/pilotOps/adminCommands');
if (pilot.isPilotCommand(text)) { const out = pilot.handle(text); return reply(out.message); }
  ## Commands
  `!pilots`, `!trials`, `!pilot [id]`, `!pilotnext`, `!trialexpiring`, `!pilotfeedback`, `!pilotconvert [id]`,
  `!pilotfollowup [id]`, `!pilotdoctor`. Replies are concise Urdu/English mix. All read-only or local-state; nothing is
  sent.

HOOKS — server.js / public/index.html / .env.example /
package.json (append-only)

EXISTING-FILE HOOKS (append-only, clearly marked). Run git status --short --branch first and confirm none of
these files have staged changes you'd overwrite. Add only the marked blocks. No commit / push / reset / rebase
/ checkout.



1) server.js — route mount
  // BEGIN PILOT OPS HOOK
  try {
    const pilotOpsRoutes = require('./routes/pilotOpsRoutes');
      app.use('/api/pilot-ops', pilotOpsRoutes);
      app.get('/pilot-ops', (req, res) => res.sendFile(require('path').join(__dirname, 'public', 'pilot-ops.html')));
    console.log('[pilot-ops] mounted at /api/pilot-ops (dry-run)');
  } catch (e) {
      console.error('[pilot-ops] mount skipped:', e && e.message);
  }
  // END PILOT OPS HOOK




2) public/index.html — nav link
  <!-- BEGIN PILOT OPS HOOK -->
  <a href="/pilot-ops" class="nav-link" title="Pilot Ops (dry-run)">Pilot Ops <span style="font-
  size:11px;color:#a371f7">DRY-RUN</span></a>
  <!-- END PILOT OPS HOOK -->




3) .env.example — placeholders only (never real secrets)
Append this block. Add each line only if not already present.


  # BEGIN PILOT OPS HOOK
  PILOT_OPS_ENABLED=true
  PILOT_OPS_DRY_RUN=true
  PILOT_OPS_STORE_PATH=data/pilot-ops.json
  PILOT_OPS_FEEDBACK_PATH=data/pilot-feedback.json
  PILOT_OPS_HISTORY_PATH=data/pilot-ops-history.json
  PILOT_OPS_REQUIRE_CONSENT=true
  PILOT_OPS_ALLOW_TENANT_WRITE=false
  PILOT_OPS_ALLOW_BILLING_WRITE=false
  PILOT_OPS_ALLOW_LIVE_MESSAGES=false
  PILOT_OPS_DEFAULT_LANGUAGE=roman_urdu
  PILOT_OPS_STRICT=false
  # END PILOT OPS HOOK

4) package.json — scripts (add only, remove nothing)
 "pilot-ops:check": "node scripts/pilot-ops-check.js",
 "pilot-ops:smoke": "node tests/smoke/pilotOpsSmoke.js"




5) .gitignore — recommended (append-only)
 # Pilot Ops local runtime data + reports
 data/pilot-ops.json
 data/pilot-feedback.json
 data/pilot-ops-history.json
 data/pilot-ops.smoke.json
 data/pilot-feedback.smoke.json
 data/pilot-ops-history.smoke.json
 data/pilot-ops.check.json
 data/pilot-feedback.check.json
