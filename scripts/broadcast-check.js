// scripts/broadcast-check.js — CLI self-check for the broadcast dept
'use strict';

const doctor = require('../lib/broadcast/doctor');
const r = doctor.check();
console.log(JSON.stringify(r, null, 2));
process.exit(r.ok ? 0 : 1);
