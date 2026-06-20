// developerPortal/eventRedactor.js — ensures event payloads are redacted before exposure/delivery.
const { redact } = require('./redactor');
function redactEvent(payload){ return redact(payload || {}); }
module.exports = { redactEvent };
