#!/usr/bin/env node
'use strict';
const mod = require('../lib/noCodeFlows/flowModel');
if (!mod) throw new Error('module not loadable');
console.log(JSON.stringify({ ok: true, dryRun: true, smoke: 'tests/smoke/noCodeFlowsSmoke.js' }, null, 2));
