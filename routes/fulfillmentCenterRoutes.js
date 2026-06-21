'use strict';
const express = require('express');
const router = express.Router();
function envelope(extra) { return Object.assign({ ok:true, dryRun:true, liveActionsEnabled:false, module:'fulfillment-center', warnings:[], blockers:[] }, extra || {}); }
router.get('/status', (_req, res) => res.json(envelope({ status:'preview_ready' })));
router.get('/summary', (_req, res) => res.json(envelope({ summaryPreview:{ module:'fulfillment-center' } })));
router.post('/preview', (req, res) => res.json(envelope({ inputPreview:req.body || {} })));
module.exports = router;
