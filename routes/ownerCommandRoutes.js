 'use strict';

 /**
     * Owner Command - Express routes (Phase 1, read-only).
     * Returns a draft digest. Never sends anything.
     */


 const express = require('express');
 const router = express.Router();

 const digestBuilder = require('../lib/ownerCommand/digestBuilder');


 const ENABLED = String(process.env.OWNER_COMMAND_ENABLED || 'true').toLowerCase() !== 'false';

 function guard(req, res, next) {
      if (!ENABLED) return res.status(403).json({ ok: false, error: 'Owner Command disabled.' });
      next();
 }

 router.get('/status', function (req, res) {
   res.json({
          ok: true, module: 'owner-command', phase: 1, status: 'available',
          enabled: ENABLED, dryRun: true, liveActionsEnabled: false,
        timestamp: new Date().toISOString()
      });
 });


 // GET /digest - build a draft digest (never sent)
 router.get('/digest', guard, function (req, res) {
   res.json({ ok: true, digest: digestBuilder.build() });
 });

 module.exports = router;
