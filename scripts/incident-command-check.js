#!/usr/bin/env node
'use strict';
const health = require('../lib/incidentCommand/healthAggregator');
const detector = require('../lib/incidentCommand/incidentDetector');
const routes = require('../routes/incidentCommandRoutes');
const run = health.run(false);
const det = detector.detect();
if (!routes || typeof routes !== 'function') throw new Error('incident routes not loadable');
console.log(JSON.stringify({ ok: true, dryRun: true, healthScore: run.score, candidateCount: det.candidateCount }, null, 2));
