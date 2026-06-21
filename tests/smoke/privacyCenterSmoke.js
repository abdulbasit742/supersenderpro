#!/usr/bin/env node
'use strict';
const mod = require('../lib/privacyCenter/privacyRequestService');
if (!mod) throw new Error('module not loadable');
console.log(JSON.stringify({ ok: true, dryRun: true, smoke: 'tests/smoke/privacyCenterSmoke.js' }, null, 2));
