// lib/tenantIsolation/leakDetector.js — Public leak-detection API (wraps responseLeakDetector). Stores redacted events.
const { Store } = require('./store');
const responseLeakDetector = require('./responseLeakDetector');
const crypto = require('crypto');

function detect(payload, ctx = {}) {
  const result = responseLeakDetector.detect(payload, ctx);
  if (result.leakFound) {
    Store.addEvent({
      id: `leak_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`,
      kind: 'leak', riskLevel: result.riskLevel, leakCount: result.leakCount,
      types: result.findings.map((f) => f.type), route: String(ctx.route || '').slice(0, 120),
      createdAt: new Date().toISOString(),
    });
  }
  return result;
}
function listLeaks(limit = 100) { return Store.listEvents(limit).filter((e) => e.kind === 'leak'); }
module.exports = { detect, listLeaks };
