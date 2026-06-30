'use strict';
/** scripts/print-config.js - print the resolved, redacted config (safe to share). Usage: node scripts/print-config.js */
const { redactedReport } = require('../lib/config');
console.log(JSON.stringify(redactedReport(), null, 2));
