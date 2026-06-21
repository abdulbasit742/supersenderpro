#!/usr/bin/env node
'use strict';
const mod = require('../lib/mockGateway');
if (!mod) throw new Error('module not loadable');
console.log(JSON.stringify({ ok: true, dryRun: true, smoke: 'tests/smoke/mockGatewaySmoke.js' }, null, 2));
