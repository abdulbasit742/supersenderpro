'use strict';
const assert = require('assert');
const handoff = require('../../lib/gumloopHandoff');
const manifest = require('../../lib/gumloopHandoff/manifestBuilder');
assert.ok(handoff.status().safety.dryRun);
assert.ok(manifest.build({ files: [] }).dryRun !== false);
console.log(JSON.stringify({ ok: true, dryRun: true, smoke: 'gumloop-handoff' }, null, 2));
