'use strict';
/**
 * lib/observability/logger.js - structured logging built on pino (already a repo dep).
 * Falls back to a console shim if pino isn't resolvable, so this never breaks boot.
 * Use child(meta) to bind requestId/tenantId to every line in a request.
 */
let pino = null;
try { pino = require('pino'); } catch { pino = null; }

const LEVEL = process.env.LOG_LEVEL || 'info';
const LEVELS = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };

function consoleShim(base = {}) {
  const emit = (level) => (obj, msg) => {
    if ((LEVELS[level] || 30) < (LEVELS[LEVEL] || 30)) return;
    const payload = typeof obj === 'string' ? { msg: obj } : Object.assign({}, obj, msg ? { msg } : {});
    const line = Object.assign({ level, time: new Date().toISOString() }, base, payload);
    const out = level === 'error' || level === 'fatal' ? console.error : (level === 'warn' ? console.warn : console.log);
    try { out(JSON.stringify(line)); } catch { out(line); }
  };
  return {
    level: LEVEL,
    trace: emit('trace'), debug: emit('debug'), info: emit('info'),
    warn: emit('warn'), error: emit('error'), fatal: emit('fatal'),
    child: (meta) => consoleShim(Object.assign({}, base, meta)),
  };
}

let root;
if (pino) {
  root = pino({ level: LEVEL, base: { service: 'supersender' }, timestamp: pino.stdTimeFunctions.isoTime });
} else {
  root = consoleShim({ service: 'supersender' });
}

module.exports = root;
