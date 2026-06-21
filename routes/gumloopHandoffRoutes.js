 'use strict';
 /**
  * routes/gumloopHandoffRoutes.js — Express router for the Gumloop push-later
     * handoff center. Read-only / preview-only, dry-run. No external calls, no
     * GitHub calls, no commit/push, no live actions, no secrets/full PII in output.
     *
     * Mount (inside marked hook):
     *        const gumloopHandoffRoutes = require('./routes/gumloopHandoffRoutes');
     *        app.use('/api/gumloop-handoff', gumloopHandoffRoutes);
  */
 const express = require('express');
 const router = express.Router();


 const handoff = require('../lib/gumloopHandoff');
 const manifestBuilder = require('../lib/gumloopHandoff/manifestBuilder');
 const mergeRiskScanner = require('../lib/gumloopHandoff/mergeRiskScanner');
 const routeMountMap = require('../lib/gumloopHandoff/routeMountMap');
 const dashboardLinkMap = require('../lib/gumloopHandoff/dashboardLinkMap');
 const packageScriptMap = require('../lib/gumloopHandoff/packageScriptMap');
 const copySafetyScanner = require('../lib/gumloopHandoff/copySafetyScanner');


 // Gate: 404 if disabled.
 router.use(function (req, res, next) {
         if (!handoff.enabled()) return res.status(404).json({ ok: false, error: 'gumloop_handoff_disabled' });
         next();
 });

 function wrap(h) {
   return function (req, res) {
           try { h(req, res); } catch (e) { res.status(500).json({ ok: false, error: 'internal_error' }); }
         };
 }

 // Build context from request body only (no filesystem reads in the route layer).
 // The check script supplies real file lists; the API works on whatever the caller posts.
 function ctxFrom(req) {
   const b = (req && req.body) || {};
         return {
           workspaceName: b.workspaceName,
           files: b.files || [],
           presentFiles: b.presentFiles || [],
           serverJsText: b.serverJsText || '',

    indexHtmlText: b.indexHtmlText || '',
    packageJson: b.packageJson || {},
    fileMap: b.fileMap || {},
    safeSourceFiles: b.safeSourceFiles || [],
  };
}


router.get('/status', wrap(function (req, res) {
res.json(Object.assign({ ok: true, dryRun: true }, handoff.status()));
}));

router.get('/manifest', wrap(function (req, res) {
res.json({ ok: true, dryRun: true, manifest: manifestBuilder.build(ctxFrom(req)) });
}));


router.get('/merge-risks', wrap(function (req, res) {
res.json(Object.assign({ ok: true }, mergeRiskScanner.scan((req.body && req.body.fileMap) || {})));
}));


router.get('/routes', wrap(function (req, res) {
const b = (req && req.body) || {};
res.json(Object.assign({ ok: true }, routeMountMap.build(b.serverJsText || '', b.presentFiles || [])));
}));


router.get('/dashboard', wrap(function (req, res) {
  const b = (req && req.body) || {};
  res.json(Object.assign({ ok: true }, dashboardLinkMap.build(b.indexHtmlText || '', b.presentFiles || [])));
}));


router.get('/scripts', wrap(function (req, res) {
const b = (req && req.body) || {};
res.json(Object.assign({ ok: true }, packageScriptMap.build(b.packageJson || {}, b.presentFiles || [])));
}));


router.get('/copy-safety', wrap(function (req, res) {
res.json(Object.assign({ ok: true }, copySafetyScanner.scan((req.body && req.body.safeSourceFiles) || [])));
}));


router.post('/report/generate', wrap(function (req, res) {
  const manifest = manifestBuilder.build(ctxFrom(req));
  res.json({
    ok: true,
    dryRun: true,
    generatedAt: new Date().toISOString(),
    safeToCopyCount: manifest.safeToCopy.length,
    neverCopyCount: manifest.neverCopy.length,
    unknownReviewCount: manifest.unknownReview.length,
    blockers: manifest.blockers,
    warnings: manifest.warnings,
    manifest,
  });
}));

module.exports = router;
