'use strict';
/**
 * routes/versionRoutes.js - GET /version. Public, cheap, cacheable. Mounted at /version (bootstrap).
 * Useful for smoke checks after deploy ('is the new commit live?') and uptime probes.
 */
const express = require('express');
const version = require('../lib/version');
const router = express.Router();
router.get('/', (req, res) => { res.set('Cache-Control', 'no-cache'); res.json(Object.assign({ success: true }, version.info())); });
module.exports = router;
