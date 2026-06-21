  # Gumloop Copy Safety Scan


  Scans safe source/docs/public/scripts/tests/demo + artifacts(.md) for secrets/PII.
  Redacted previews only; raw values never printed. Live counts come from
  `npm run gumloop-handoff:check`.


  - Secret findings (api keys, bearer, private keys, db URLs w/ password, JWT): expected 0 in safe source.
  - PII previews (emails, phones): demo data uses @example.com + +92-300-XXX-1234 placeholders, surfaced as redacted
  previews, not blockers.
  - Any real secret -> raises a blocker; the file is redacted (if a safe sample) or moved to mustNotCopy. Blockers are
  never hidden.

PATCHES (append-only hooks) + .env.example + .gitignore
+ docs/GUMLOOP_HANDOFF_DELIVERY_REPORT.md

Append-only patch snippets and the final delivery report. Append-only. If a file has staged changes, insert only
the marked block. No commit / push / rebase / reset / checkout. ClickUp never pushes; Gumloop does later.



FILE: server.js — add near other app.use('/api/...') mounts. Requires express.json() first.


  // BEGIN GUMLOOP HANDOFF HOOK
  if (String(process.env.GUMLOOP_HANDOFF_ENABLED || 'true').toLowerCase() !== 'false') {
    const gumloopHandoffRoutes = require('./routes/gumloopHandoffRoutes');
      app.use('/api/gumloop-handoff', gumloopHandoffRoutes);
      app.get('/gumloop-handoff', (req, res) => res.sendFile(require('path').join(__dirname, 'public', 'gumloop-
  handoff.html')));
  }
  // END GUMLOOP HANDOFF HOOK
