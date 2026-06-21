#!/usr/bin/env node
'use strict';
const mod = require('../lib/groupCommerce/inbox/store');
if (!mod) throw new Error('module not loadable');
console.log(JSON.stringify({ ok: true, dryRun: true, smoke: 'tests/smoke/groupCommerceInboxSmoke.js' }, null, 2));
