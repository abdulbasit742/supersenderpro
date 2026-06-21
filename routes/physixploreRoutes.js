  'use strict';

  /**
      * PhysiXplore Integration - Express routes (Phase 1, read-only).
      * Exposes the module catalog. No sends, no secrets, no PII.
      */


  const express = require('express');
  const path = require('path');
  const router = express.Router();

  const catalog = require('../lib/physixplore/catalog');
  const fetcher = require('../lib/physixplore/fetcher');
  const wa = require('../lib/physixplore/waCommands');

  const ENABLED = String(process.env.PHYSIXPLORE_ENABLED || 'true').toLowerCase() !== 'false';


  function guard(req, res, next) {
    if (!ENABLED) return res.status(403).json({ ok: false, error: 'PhysiXplore integration disabled.' });
       next();
  }

  router.get('/status', function (req, res) {
       res.json({
         ok: true, module: 'physixplore', phase: 1, status: 'available',
           enabled: ENABLED, liveFetch: fetcher.liveFetchEnabled(),
           source: catalog.SOURCE_URL, modules: catalog.count(),
         timestamp: new Date().toISOString()
       });
  });

  // GET /modules - full catalog (refreshes if live fetch on)
  router.get('/modules', guard, function (req, res) {
       fetcher.refresh().then(function (r) {
         res.json({ ok: true, refresh: r, modules: catalog.all() });
    });
  });


  // GET /modules/:id - one module
  router.get('/modules/:id', guard, function (req, res) {
    const m = catalog.get(req.params.id) || catalog.findByName(req.params.id);
       if (!m) return res.status(404).json({ ok: false, error: 'not_found' });
       res.json({ ok: true, module: m, link: catalog.linkFor(m) });
  });

  // GET /preview/wa?cmd=!sims - preview the exact WhatsApp reply text
  router.get('/preview/wa', guard, function (req, res) {


 wa.handle(req.query.cmd || '!sims').then(function (reply) {
   res.json({ ok: true, cmd: req.query.cmd || '!sims', reply: reply });
 });
});

router.get('/ui', function (req, res) { res.sendFile(path.join(process.cwd(), 'public', 'physixplore.html')); });


module.exports = router;
