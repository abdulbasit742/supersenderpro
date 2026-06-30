'use strict';
/** scripts/conversational-support-check.js - run the Conversational Support doctor; exit non-zero on blockers. */
const CS = require('../lib/conversationalSupport');
const r = CS.doctor.run();
console.log(JSON.stringify(r, null, 2));
process.exit(r.ok ? 0 : 1);
